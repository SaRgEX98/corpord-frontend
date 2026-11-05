import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const fixture = process.env.CORPORD_E2E_CHECKOUT_FIXTURE ? JSON.parse(process.env.CORPORD_E2E_CHECKOUT_FIXTURE) as {
  trip_id: number; boarding_stop_id: number; alighting_stop_id: number;
} : null;
test.skip(!fixture || !process.env.CORPORD_E2E_ADMIN_EMAIL, 'Requires the disposable checkout_e2e fake-provider harness.');

const api = process.env.CORPORD_E2E_API_URL || '';
const control = api.replace(/\/api\/v1\/?$/, '');
async function credentials(request: any) {
  const response = await request.post(`${api}/auth/login`, { data: { email: process.env.CORPORD_E2E_ADMIN_EMAIL, password: process.env.CORPORD_E2E_ADMIN_PASSWORD } });
  expect(response.ok()).toBeTruthy();
  return { Authorization: `Bearer ${(await response.json()).access_token}` };
}
async function hold(request: any, headers: Record<string, string>) {
  const response = await request.post(`${api}/me/bookings`, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: { trip_id: fixture!.trip_id, boarding_stop_id: fixture!.boarding_stop_id, alighting_stop_id: fixture!.alighting_stop_id, passenger_name: 'Пассажир checkout E2E' } });
  expect(response.status()).toBe(201);
  return response.json();
}
async function checkout(request: any, headers: Record<string, string>) {
  const booking = await hold(request, headers);
  const response = await request.post(`${api}/me/checkouts`, { headers: { ...headers, 'Idempotency-Key': randomUUID() }, data: { hold_id: booking.id } });
  expect(response.status()).toBe(201);
  return response.json();
}
async function ready(request: any, headers: Record<string, string>, id: number) {
  await expect.poll(async () => {
    const response = await request.get(`${api}/me/checkouts/${id}`, { headers });
    return (await response.json()).payment?.confirmation_url;
  }, { timeout: 20_000, intervals: [250, 500, 1000] }).toMatch(/^https:\/\//);
}
async function authorize(request: any, id: number, scenario: string) {
  const response = await request.post(`${control}/__test/checkout/authorize`, { data: { checkout_id: id, scenario } });
  expect(response.ok()).toBeTruthy();
  const value = await response.json();
  const notification = await request.post(`${api}/payments/yookassa/webhook`, { data: { type: 'notification', event: scenario === 'refund' ? 'payment.succeeded' : 'payment.waiting_for_capture', object: { id: value.payment_id } } });
  expect(notification.ok()).toBeTruthy();
}
async function login(page: any, destination: string) {
  await page.goto(destination);
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await page.locator('input[type=email]').fill(process.env.CORPORD_E2E_ADMIN_EMAIL!);
  await page.locator('input[type=password]').fill(process.env.CORPORD_E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Войти в аккаунт', exact: true }).click();
  await expect(page).toHaveURL(new URL(destination, page.url()).href);
}

test('lost checkout response retries one intent; return never proves payment; paid detail and bounded list use server state', async ({ page, request }) => {
  test.setTimeout(90_000);
  const headers = await credentials(request);
  const booking = await hold(request, headers);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await login(page, '/me/orders');
  const card = page.getByRole('article', { name: `Удержание № ${booking.id}` });
  let key = ''; let payload = ''; let id = 0; let intercepted = 0;
  await page.route('**/api/v1/me/checkouts', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    intercepted++;
    if (intercepted === 1) {
      key = route.request().headers()['idempotency-key']!; payload = route.request().postData()!;
      const response = await route.fetch(); expect(response.status()).toBe(201); id = (await response.json()).id;
      await route.abort('connectionreset');
    } else {
      expect(route.request().headers()['idempotency-key']).toBe(key); expect(route.request().postData()).toBe(payload); await route.continue();
    }
  });
  await card.getByRole('button', { name: 'Перейти к тестовой оплате' }).focus();
  await page.keyboard.press('Enter');
  await card.getByRole('button', { name: 'Повторить создание того же заказа' }).click();
  await expect(page).toHaveURL(new RegExp(`/me/orders/${id}$`));
  expect(intercepted).toBe(2);
  await ready(request, headers, id);
  // No real provider page is opened. Query input is deliberately forged.
  await page.goto(`/me/orders/${id}/payment-return?status=paid&confirmation_url=https://attacker.example.test`);
  await expect(page.locator('main')).toContainText('возврат на сайт сам по себе не подтверждает оплату');
  await expect(page.getByRole('article', { name: `Тестовый заказ № ${id}` })).toContainText('Ожидает тестовой оплаты');
  await expect(page.getByRole('link', { name: 'Открыть тестовую оплату ЮKassa' })).toHaveAttribute('href', /^https:\/\/yoomoney\.ru\/test\//);
  await authorize(request, id, 'paid');
  await expect(page.getByRole('article', { name: `Тестовый заказ № ${id}` })).toContainText('Тестовая оплата подтверждена', { timeout: 25_000 });
  await expect(page.getByRole('button', { name: 'Отменить тестовый заказ', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Открыть тестовую оплату ЮKassa' })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('article', { name: `Тестовый заказ № ${id}` })).toContainText('Тестовая оплата подтверждена');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await page.screenshot({ path: 'test-results/checkout-paid-mobile-dark.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.goto('/me/orders?view=orders');
  await expect(page.getByRole('region', { name: 'Тестовые заказы' })).toBeVisible();
  const detailReads: string[] = [];
  page.on('request', req => { if (req.method() === 'GET' && /\/api\/v1\/me\/checkouts\/\d+$/.test(req.url())) detailReads.push(req.url()); });
  const filtered = page.waitForResponse(response => response.url().includes('/me/checkouts?') && new URL(response.url()).searchParams.get('status') === 'paid', { timeout: 10_000 });
  await page.getByLabel('Статус тестового заказа').selectOption('paid');
  expect((await filtered).ok()).toBeTruthy();
  await expect(page.getByRole('article', { name: `Тестовый заказ № ${id}` })).toBeVisible();
  expect(detailReads).toEqual([]);
  // A different disposable identity cannot read/cancel/reconcile the order.
  const other = await request.post(`${api}/auth/register`, { data: { name: 'Другой checkout E2E', email: `checkout-other-${randomUUID()}@example.test`, password: 'isolated-checkout-password' } });
  const outsider = { Authorization: `Bearer ${(await other.json()).access_token}` };
  expect((await request.get(`${api}/me/checkouts/${id}`, { headers: outsider })).status()).toBe(404);
  expect((await request.post(`${api}/me/checkouts/${id}/cancel`, { headers: outsider })).status()).toBe(404);
  expect((await request.post(`${api}/me/checkouts/${id}/reconcile`, { headers: outsider })).status()).toBe(404);
  expect(errors).toEqual([]);
});

test('cancel, capture failure, unknown outcome and compensation remain explicit server states', async ({ page, request }) => {
  test.setTimeout(120_000);
  const headers = await credentials(request);
  const cancelled = await checkout(request, headers); await ready(request, headers, cancelled.id);
  await login(page, `/me/orders/${cancelled.id}`);
  await page.getByRole('button', { name: 'Отменить тестовый заказ', exact: true }).click();
  await page.getByRole('button', { name: 'Подтвердить отмену заказа' }).click();
  await expect(page.getByRole('article', { name: `Тестовый заказ № ${cancelled.id}` })).toContainText(/Отмена обрабатывается|Заказ отменён/);
  const failed = await checkout(request, headers); await ready(request, headers, failed.id); await authorize(request, failed.id, 'capture_fail');
  await page.goto(`/me/orders/${failed.id}/payment-return`);
  await expect(page.getByRole('article', { name: `Тестовый заказ № ${failed.id}` })).toContainText(/Заказ отменён|Требуется проверка оплаты/, { timeout: 25_000 });
  const unknown = await checkout(request, headers); await ready(request, headers, unknown.id);
  const beforeUnknown = await (await request.get(`${control}/__test/checkout/status`)).json();
  await authorize(request, unknown.id, 'capture_unknown');
  await page.goto(`/me/orders/${unknown.id}/payment-return?status=paid`);
  await expect(page.locator('[aria-label="Детали тестового заказа"]')).toContainText(/Результат оплаты пока не определён|Требуется проверка оплаты/, { timeout: 25_000 });
  await expect(page.getByRole('button', { name: 'Отменить тестовый заказ', exact: true })).toHaveCount(0);
  const unknownCard = page.getByRole('article', { name: `Тестовый заказ № ${unknown.id}` });
  await expect(unknownCard).not.toContainText('Тестовая оплата подтверждена');
  // The provider committed capture but withheld a verifiable answer. Only a
  // later verified server fact may turn this protected unknown state into paid.
  const resolved = await request.post(`${control}/__test/checkout/resolve`, { data: { checkout_id: unknown.id } });
  expect(resolved.ok()).toBeTruthy();
  const verified = await resolved.json();
  const succeededNotice = await request.post(`${api}/payments/yookassa/webhook`, { data: { type: 'notification', event: 'payment.succeeded', object: { id: verified.payment_id } } });
  expect(succeededNotice.ok()).toBeTruthy();
  await expect(unknownCard).toContainText('Тестовая оплата подтверждена', { timeout: 25_000 });
  const afterUnknown = await (await request.get(`${control}/__test/checkout/status`)).json();
  expect(afterUnknown.effects.capture - beforeUnknown.effects.capture).toBe(1);
  const refund = await checkout(request, headers); await ready(request, headers, refund.id); await authorize(request, refund.id, 'refund');
  await page.goto(`/me/orders/${refund.id}/payment-return`);
  await expect(page.getByRole('article', { name: `Тестовый заказ № ${refund.id}` })).toContainText(/Тестовый возврат обрабатывается|Тестовый возврат выполнен/, { timeout: 25_000 });
});
