import {test,expect} from '@playwright/test';

// Read-only acceptance check on the explicitly selected national demo database.
// No API mocks, registration, workspace .env or existing accounts.
test.skip(process.env.CORPORD_E2E_NATIONAL !== '1','Requires the populated, disposable national catalog.');
test.use({timezoneId:'America/Los_Angeles'});

test('national catalog loads pages and real demo search/calendar/quote in both themes',async({page,request})=>{
  const api=process.env.CORPORD_E2E_API_URL!;
  const firstPage=await request.get(`${api}/catalog/trips?limit=1`);
  expect(firstPage.ok()).toBeTruthy();
  const summary=(await firstPage.json()).items[0];
  expect(summary.is_demo).toBe(true);
  const detail=await request.get(`${api}/trips/${summary.id}`);
  expect(detail.ok()).toBeTruthy();
  const trip=await detail.json();
  const a=trip.stops[0],b=trip.stops.at(-1);
  const date=new Intl.DateTimeFormat('en-CA',{
    timeZone:a.stop.effective_timezone,year:'numeric',month:'2-digit',day:'2-digit',
  }).format(new Date(a.departure_time));
  const errors:string[]=[],calls:URL[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',req=>{if(req.url().startsWith(api))calls.push(new URL(req.url()));});
  await page.goto('/stops');
  await expect(page.locator('.resource-card')).toHaveCount(30);
  expect(calls.filter(url=>url.pathname.endsWith('/catalog/stops'))).toHaveLength(1);
  expect(calls.filter(url=>/\/stops\/\d+$/.test(url.pathname))).toHaveLength(0);
  await page.getByRole('button',{name:'Показать ещё',exact:true}).click();
  await expect(page.locator('.resource-card')).toHaveCount(60);
  expect(calls.filter(url=>url.pathname.endsWith('/catalog/stops'))).toHaveLength(2);
  const params=new URLSearchParams({from_id:`stop:${a.stop_id}`,to_id:`stop:${b.stop_id}`,date});
  const search=await request.get(`${api}/trips/search?${params}`);
  expect(search.ok()).toBeTruthy();
  const items=(await search.json()).items;
  expect(items.length).toBeGreaterThan(0);
  expect(items[0].is_demo).toBe(true);
  await page.goto(`/trips?${params}`);
  await expect(page.getByRole('article').first()).toContainText('Демонстрационный рейс');
  await expect(page.locator('[aria-label="Календарь цен"]')).toBeVisible();
  await expect(page.getByText('В календаре есть демонстрационные рейсы и тестовые цены.')).toBeVisible();
  await page.screenshot({path:'test-results/national-catalog-desktop.png',fullPage:true});
  await page.evaluate(()=>document.documentElement.classList.add('dark'));
  await page.screenshot({path:'test-results/national-catalog-dark.png',fullPage:true});
  await page.setViewportSize({width:390,height:844});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  await page.screenshot({path:'test-results/national-catalog-mobile.png',fullPage:true});
  await page.getByRole('link',{name:/Подробнее/}).first().click();
  await expect(page.locator('main')).toContainText('Демонстрационное расписание');
  await expect(page.getByText('Цена перепроверена для одного пассажира.',{exact:false})).toBeVisible();
  await expect(page.locator('main')).toContainText('Демонстрационный рейс');
  expect(errors).toEqual([]);
});
