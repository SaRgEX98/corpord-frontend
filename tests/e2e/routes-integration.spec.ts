import { expect, test } from '@playwright/test';

test.use({ timezoneId: 'America/Los_Angeles' });

test.skip(!process.env.CORPORD_E2E_ADMIN_EMAIL, 'Run with the disposable E2E stack.');

// All fixtures belong to the disposable stack created by e2e-isolated.mjs.
// No workspace environment, existing user, or external geoserver is required.
test('segment price agrees across search, Russian calendar and detail in another device timezone', async ({ page, request }) => {
  test.setTimeout(120_000);
  const api = process.env.CORPORD_E2E_API_URL!;
  const login = await request.post(`${api}/auth/login`, { data: {
    email: process.env.CORPORD_E2E_ADMIN_EMAIL,
    password: process.env.CORPORD_E2E_ADMIN_PASSWORD,
  } });
  expect(login.ok()).toBeTruthy();
  const headers = { Authorization: `Bearer ${(await login.json()).access_token}` };
  const suffix = Date.now().toString(36);
  const created: { path: string; id: number }[] = [];
  async function create(path: string, data: object): Promise<number> {
    const before = await request.get(`${api}${path}`);
    const ids = new Set((await before.json() ?? []).map((x: { id: number }) => x.id));
    const response = await request.post(`${api}/admin${path}`, { headers, data });
    expect(response.ok(), `create fixture ${path}: ${response.status()}`).toBeTruthy();
    const list = await request.get(`${api}${path}`);
    const inserted = (await list.json()).filter((x: { id: number }) => !ids.has(x.id));
    expect(inserted).toHaveLength(1);
    const id = inserted[0].id as number;
    created.push({ path, id });
    return id;
  }
  const cityList = await request.get(`${api}/admin/cities`, { headers });
  expect(cityList.ok()).toBeTruthy();
  const cities = (await cityList.json()).items;
  const originCity = cities.find((c: { name: string }) => c.name === 'Екатеринбург');
  const destinationCity = cities.find((c: { name: string }) => c.name === 'Москва');
  expect(originCity).toBeTruthy(); expect(destinationCity).toBeTruthy();
  const departure = new Date(Date.now() + 3 * 86400000);
  departure.setUTCHours(23, 10, 0, 0);
  const arrival = new Date(departure.getTime() + 4 * 3600000);
  const middle = new Date(departure.getTime() + 2 * 3600000);
  const localDate = (value: Date, timezone: string) => new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(value);
  const date = localDate(departure, 'Asia/Yekaterinburg');
  const errors: string[] = [];
  const prohibited: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', req => { if (/nominatim\.openstreetmap\.org|tile\.openstreetmap\.org|photon\.komoot\.io/.test(req.url())) prohibited.push(req.url()); });
  await page.context().setDefaultTimeout(15_000);
  try {
    const category = await create('/bus/categories/', { name: `Route category ${suffix}` });
    const status = await create('/bus/statuses/', { name: `Route ready ${suffix}` });
    const driverStatus = await create('/driver/status/', { name: `Route driver ${suffix}` });
    const bus = await create('/bus/', { license_plate: `R-${suffix}`, brand: 'Route integration', capacity: 40, category_id: category, status_id: status });
    const driver = await create('/driver/', { first_name: 'Тест', last_name: 'Маршрута', phone_number: '+79990000000', status: driverStatus });
    const a = await create('/stops/', { name: `Старт ${suffix}`, address: 'Тестовый адрес А', latitude: 56.8, longitude: 60.6, city_id: originCity.id });
    const b = await create('/stops/', { name: `Промежуточная ${suffix}`, address: 'Тестовый адрес Б', latitude: 56.7, longitude: 60.5, city_id: originCity.id });
    const c = await create('/stops/', { name: `Финиш ${suffix}`, address: 'Тестовый адрес В', latitude: 55.7, longitude: 37.6, city_id: destinationCity.id });
    const tripResponse = await request.post(`${api}/admin/trips/`, { headers, data: { bus_id: bus, driver_id: driver, start_time: departure.toISOString(), end_time: arrival.toISOString(), status: 'scheduled', base_price: 999.99 } });
    expect(tripResponse.ok()).toBeTruthy();
    const trip = (await tripResponse.json()).id;
    expect(trip).toBeGreaterThan(0);
    created.push({ path: '/trips/', id: trip });
    for (const [stop, index, instant, fare] of [[a, 1, departure, 100.01], [b, 2, middle, 200.02], [c, 3, arrival, 0]] as const) {
      const response = await request.post(`${api}/admin/trip_stops/`, { headers, data: { trip_id: trip, stop_id: stop, stop_order: index, arrival_time: instant.toISOString(), departure_time: instant.toISOString(), price_to_next: fare } });
      expect(response.ok()).toBeTruthy();
    }
    const params = new URLSearchParams({ from_id: `stop:${a}`, to_id: `stop:${c}`, date });
    const search = await request.get(`${api}/trips/search?${params}`);
    expect(search.ok(), `search status ${search.status()}`).toBeTruthy();
    const items = (await search.json()).items;
    expect(items).toHaveLength(1);
    expect(items[0].price.amount_minor).toBe(30003);
    expect(items[0].availability).toEqual({ status: 'unknown', seats: null });
    expect(items[0].timezone).toBe('Asia/Yekaterinburg');
    const quote = await request.post(`${api}/trips/${trip}/quote`, { data: { boarding_stop_id: a, alighting_stop_id: c, passengers: 1 } });
    expect(quote.ok()).toBeTruthy();
    expect((await quote.json()).price.amount_minor).toBe(30003);
    const calendar = await request.get(`${api}/trips/calendar?${new URLSearchParams({ from_id: `stop:${a}`, to_id: `stop:${c}`, month: date.slice(0, 7) })}`);
    expect(calendar.ok()).toBeTruthy();
    const days = (await calendar.json()).days;
    expect(days.find((day: { date: string }) => day.date === date)).toMatchObject({ status: 'unknown', min_price_minor: 30003, trip_count: 1 });
    const partial = await request.get(`${api}/trips/search?${new URLSearchParams({ from_id: `stop:${b}`, to_id: `stop:${c}`, date: localDate(middle, 'Asia/Yekaterinburg') })}`);
    expect((await partial.json()).items[0].price.amount_minor).toBe(20002);
    await page.goto(`/trips?${params}&from_name=${encodeURIComponent(`Старт ${suffix}`)}&to_name=${encodeURIComponent(`Финиш ${suffix}`)}`);
    await expect(page.getByRole('article')).toHaveCount(1);
    await expect(page.getByRole('article')).toContainText(/300,03/);
    // The named section is also accessible by its stable aria-label across browser engines.
    await expect(page.locator('[aria-label="Календарь цен"]')).toContainText(/пн/i);
    await expect(page.locator(`[aria-label^="${date}:"]`)).toContainText(/300,03/);
    await page.getByRole('link', { name: /Подробнее/ }).click();
    await expect(page).toHaveURL(new RegExp(`/trips/${trip}\\?`));
    await expect(page.locator('main')).toContainText(/300,03/);
    await expect(page.locator('main')).toContainText('Свободные места уточняются');
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    expect(errors).toEqual([]); expect(prohibited).toEqual([]);
  } finally {
    for (const item of created.reverse()) {
      await request.delete(`${api}/admin${item.path.replace(/\/$/, '')}/${item.id}`, { headers });
    }
  }
});
