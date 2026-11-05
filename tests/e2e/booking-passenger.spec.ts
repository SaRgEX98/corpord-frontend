import { expect, test } from '@playwright/test';

// Fixture and all identities live only in the disposable e2e-isolated stack.
const fixture = process.env.CORPORD_E2E_BOOKING_FIXTURE ? JSON.parse(process.env.CORPORD_E2E_BOOKING_FIXTURE) as {
  trip_id: number; boarding_stop_id: number; alighting_stop_id: number;
} : null;
test.skip(!fixture || !process.env.CORPORD_E2E_ADMIN_EMAIL, 'Run with the disposable booking fixture.');

test('passenger CRUD, login return, idempotent lost-response retry, expiry and cancellation use real API', async ({ page, request }) => {
  test.setTimeout(120_000);
  const api = process.env.CORPORD_E2E_API_URL!;
  const segment = `/trips/${fixture!.trip_id}?boarding_stop_id=${fixture!.boarding_stop_id}&alighting_stop_id=${fixture!.alighting_stop_id}`;
  const suffix = Date.now().toString(36);
  const name = `Пассажир ${suffix}`;
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  // Install before components create intervals so expiry assertions drive their real clock.
  await page.clock.install();
  await page.goto(segment);
  await page.getByRole('link', { name: 'Войти для удержания места' }).click();
  await expect(page).toHaveURL(/\/login\?redirect=/);
  await page.locator('input[type=email]').fill(process.env.CORPORD_E2E_ADMIN_EMAIL!);
  await page.locator('input[type=password]').fill(process.env.CORPORD_E2E_ADMIN_PASSWORD!);
  await page.getByRole('button', { name: 'Войти в аккаунт', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/trips/${fixture!.trip_id}\\?boarding_stop_id=`));
  const login = await request.post(`${api}/auth/login`, { data: { email: process.env.CORPORD_E2E_ADMIN_EMAIL, password: process.env.CORPORD_E2E_ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const headers = { Authorization: `Bearer ${(await login.json()).access_token}` };
  const bookings: number[] = [];
  let passengerId: number | undefined;
  try {
    await page.goto('/me/passengers');
    await page.getByLabel('Имя пассажира', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Сохранить пассажира', exact: true }).click();
    const row = page.locator('article').filter({ hasText: name });
    await expect(row).toBeVisible();
    const people = await request.get(`${api}/me/passengers?limit=30`, { headers });
    passengerId = (await people.json()).items.find((person: { full_name: string }) => person.full_name === name).id;
    await page.goto(segment);
    await page.locator('#hold-passenger').focus();
    await expect(page.locator('#hold-passenger option').filter({ hasText: name })).toHaveCount(1);
    await page.locator('#hold-passenger').selectOption(String(passengerId));
    const firstResponse = page.waitForResponse(response => response.url().endsWith('/me/bookings') && response.request().method() === 'POST', { timeout: 15_000 });
    await page.getByRole('button', { name: 'Удержать место на 10 минут', exact: true }).click();
    const firstHttp = await firstResponse;
    expect(firstHttp.status(), 'initial hold response status').toBe(201);
    const first = await firstHttp.json(); bookings.push(first.id);
    expect(first.amount_minor).toBe(15001);
    await expect(page.getByRole('article', { name: `Удержание № ${first.id}` })).toContainText(name);
    await page.goto('/me/passengers');
    await page.locator('article').filter({ hasText: name }).getByRole('button', { name: 'Редактировать' }).click();
    await page.getByLabel('Имя пассажира', { exact: true }).fill(`${name} новое`);
    await page.getByRole('button', { name: 'Сохранить пассажира', exact: true }).click();
    await expect(page.locator('article').filter({ hasText: `${name} новое` })).toBeVisible();
    await page.goto('/me/orders');
    const card = page.getByRole('article', { name: `Удержание № ${first.id}` });
    await expect(card).toContainText(name); await expect(card).not.toContainText(`${name} новое`);
    await card.getByRole('button', { name: 'Отменить удержание' }).click();
    await expect(card).toContainText('Удержание отменено');
    // Another disposable user cannot read or cancel this hold.
    const outsider = await request.post(`${api}/auth/register`, { data: { name: 'Другой тест', email: `booking-other-${suffix}@example.test`, password: 'isolated-booking-password-2030' } });
    expect(outsider.ok()).toBeTruthy();
    const outsiderHeaders = { Authorization: `Bearer ${(await outsider.json()).access_token}` };
    expect((await request.get(`${api}/me/bookings/${first.id}`, { headers: outsiderHeaders })).status()).toBe(404);
    expect((await request.post(`${api}/me/bookings/${first.id}/cancel`, { headers: outsiderHeaders })).status()).toBe(404);
    // The first response is deliberately lost AFTER the backend committed it.
    let key = ''; let body = ''; let intercepted = 0;
    await page.route('**/api/v1/me/bookings', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      intercepted++;
      if (intercepted === 1) {
        key = route.request().headers()['idempotency-key']!; body = route.request().postData()!;
        const response = await route.fetch(); const value = await response.json(); bookings.push(value.id);
        expect(response.status()).toBe(201);
        await route.abort('connectionreset');
      } else {
        expect(route.request().headers()['idempotency-key']).toBe(key);
        expect(route.request().postData()).toBe(body);
        await route.continue();
      }
    });
    await page.goto(segment);
    await page.getByLabel('Имя пассажира', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Удержать место на 10 минут', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Повторить ту же операцию' })).toBeVisible();
    await expect(page.getByLabel('Имя пассажира', { exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Повторить ту же операцию' }).click();
    const active = page.getByRole('article', { name: `Удержание № ${bookings[1]}` });
    await expect(active).toContainText('Место удерживается');
    expect(intercepted).toBe(2);
    const stored = await request.get(`${api}/me/bookings/${bookings[1]}`, { headers });
    const held = await stored.json();
    await page.clock.setSystemTime(new Date(Date.parse(held.expires_at) + 1000));
    await page.clock.runFor(1100);
    await expect(active).toContainText('Время удержания истекло');
    await expect(active.getByRole('button', { name: 'Отменить удержание' })).toHaveCount(0);
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.screenshot({ path: 'test-results/booking-mobile-dark.png', fullPage: true });
    await page.goto('/me/passengers');
    const renamed = page.locator('article').filter({ hasText: `${name} новое` });
    await renamed.getByRole('button', { name: 'Удалить', exact: true }).click();
    await renamed.getByRole('button', { name: 'Подтвердить удаление' }).click();
    await expect(renamed).toHaveCount(0);
    expect(errors).toEqual([]);
  } finally {
    // The runner always destroys this disposable database. Best-effort cleanup
    // must preserve the original failure if Playwright has already closed it.
    await Promise.allSettled([
      ...bookings.map(id => request.post(`${api}/me/bookings/${id}/cancel`, { headers, timeout: 5000 })),
      ...(passengerId ? [request.delete(`${api}/me/passengers/${passengerId}`, { headers, timeout: 5000 })] : []),
    ]);
  }
});
