import { expect, test } from '@playwright/test';

test.skip(!process.env.CORPORD_E2E_ADMIN_EMAIL, 'Run only against the disposable E2E stack.');

test('admin explicitly maps an unknown stop, sees audit and cannot overwrite a stale version', async ({ page, request }) => {
  const base = process.env.CORPORD_E2E_API_URL!;
  const login = await request.post(`${base}/auth/login`, { data: { email: process.env.CORPORD_E2E_ADMIN_EMAIL, password: process.env.CORPORD_E2E_ADMIN_PASSWORD } });
  expect(login.ok()).toBeTruthy();
  const headers = { Authorization: `Bearer ${(await login.json()).access_token}` };
  const suffix = Date.now().toString(36);
  const name = `Проверка качества ${suffix}`;
  const created = await request.post(`${base}/admin/stops/`, { headers, data: { name, address: 'Тестовый адрес', latitude: 56.8, longitude: 60.6 } });
  expect(created.ok()).toBeTruthy();
  const stop = await created.json();
  expect(stop.id).toBeGreaterThan(0);
  const errors: string[] = [];
  const calls: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', req => { if (req.url().includes('/api/v1/')) calls.push(req.url()); });
  try {
    const anonymous = await request.get(`${base}/admin/catalog-quality/summary`);
    expect(anonymous.status()).toBe(401);
    await page.goto('/login');
    await page.locator('input[type=email]').fill(process.env.CORPORD_E2E_ADMIN_EMAIL!);
    await page.locator('input[type=password]').fill(process.env.CORPORD_E2E_ADMIN_PASSWORD!);
    await page.getByRole('button', { name: 'Войти в аккаунт', exact: true }).click();
    await expect(page).not.toHaveURL(/\/login/);
    await page.goto('/admin/catalog-quality');
    await expect(page.getByRole('heading', { name: 'Качество справочника', exact: true })).toBeVisible();
    await page.getByRole('searchbox', { name: 'Поиск остановок без города' }).fill(suffix);
    await expect(page.locator('[aria-label="Остановки без города"] > li')).toHaveCount(1);
    expect(calls.filter(url => new URL(url).pathname.endsWith('/catalog/cities'))).toHaveLength(0);
    await page.getByRole('button', { name: new RegExp(`Проверить ${name}`) }).click();
    const picker = page.getByRole('combobox', { name: 'Подтверждённый город' });
    await picker.fill('Екатеринбург');
    await page.getByRole('option', { name: /Екатеринбург/ }).first().click();
    await page.getByLabel('Основание привязки').fill('Проверено по муниципальному перечню остановок');
    const before = await request.get(`${base}/admin/catalog-quality/stops?q=${suffix}`, { headers });
    const version = (await before.json()).items[0].version;
    await page.getByRole('button', { name: 'Сохранить привязку', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Привязка сохранена.' })).toBeVisible();
    await expect(page.getByText('Подтверждённый город: Екатеринбург', { exact: false })).toBeVisible();
    await expect(page.getByRole('list', { name: 'Остановки без города' }).locator('li')).toHaveCount(0);
    await expect(page.locator('ol')).toContainText('Проверено по муниципальному перечню остановок');
    const history = await request.get(`${base}/admin/catalog-quality/stops/${stop.id}/history`, { headers });
    const audit = (await history.json()).items;
    expect(audit).toHaveLength(1);
    expect(audit[0].before.city_id).toBeNull();
    expect(audit[0].after.city_id).toBeGreaterThan(0);
    expect(Object.keys(audit[0]).sort()).toEqual(['actor_id', 'after', 'before', 'created_at', 'id', 'reason']);
    const stale = await request.post(`${base}/admin/catalog-quality/stops/${stop.id}/mapping`, { headers, data: { city_id: audit[0].after.city_id, version, reason: 'Устаревшая повторная правка' } });
    expect(stale.status()).toBe(409);
    expect((await stale.json()).code).toBe('stale_version');
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    expect(errors).toEqual([]);
    expect(calls.some(url => /\/stops\/\d+$/.test(new URL(url).pathname))).toBeFalsy();
  } finally {
    await request.delete(`${base}/admin/stops/${stop.id}`, { headers });
  }
});
