import { test, expect } from '@playwright/test';

test('real local OSM archive renders Cyrillic labels in both themes without public requests', async ({page}) => {
  test.skip(!process.env.CORPORD_E2E_REAL_MAP_TEST, 'Use prepared regional map data and the documented local runtime style URLs.');
  const errors: string[] = [];
  const unexpected: string[] = [];
  const successful: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const mapOrigin = new URL(process.env.CORPORD_E2E_MAP_STYLE_URL!).origin;
  page.on('response', response => {
    if (new URL(response.url()).origin === mapOrigin && !response.ok()) errors.push(`Map HTTP ${response.status()}: ${response.url()}`);
  });
  page.on('requestfailed', request => {
    if (new URL(request.url()).origin === mapOrigin) errors.push(`Map request failed: ${request.url()}`);
  });
  page.on('request', request => {
    const url = new URL(request.url());
    if (['http:', 'https:'].includes(url.protocol) && !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) unexpected.push(request.url());
  });
  page.on('response', response => { if (response.ok()) successful.push(response.url()); });
  await page.route('**/api/v1/**', route => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith('/auth/refresh')) return route.fulfill({status:401,json:{error:'unauthorized'}});
    if (url.pathname.includes('/locations/')) {
      const first = decodeURIComponent(url.pathname).endsWith('stop:901');
      return route.fulfill({json:{id:first?'stop:901':'stop:902',type:'stop',name:first?'Тестовая точка А':'Тестовая точка Б',region:'Свердловская область',timezone:'Asia/Yekaterinburg',served:false,rank_reason:'match',address:'Тестовая точка для визуальной проверки',latitude:first?56.835:56.842,longitude:first?60.600:60.614}});
    }
    if (url.pathname.endsWith('/trips/calendar')) return route.fulfill({json:{timezone:'Asia/Yekaterinburg',month:url.searchParams.get('month'),calculated_at:'2030-05-01T00:00:00Z',rule_version:'segment-v1',days:[]}});
    if (url.pathname.endsWith('/trips/search')) return route.fulfill({json:{items:[],next_cursor:null}});
    return route.fulfill({json:[]});
  });
  await page.goto('/trips?from_id=stop:901&to_id=stop:902&date=2030-06-01');
  const button = page.getByRole('button',{name:'Показать карту',exact:true});
  await expect(button).toBeVisible();
  expect(successful.some(url=>url.includes('/styles/corpord-'))).toBeFalsy();
  await button.click();
  const canvas=page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(()=>successful.some(url=>url.includes('.pmtiles'))).toBeTruthy();
  await expect.poll(()=>successful.some(url=>url.includes('1024-1279.pbf'))).toBeTruthy();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Карта временно недоступна.',{exact:false})).toHaveCount(0);
  await canvas.screenshot({path:'test-results/real-map-light.png'});
  await expect(page.getByText('участники OpenStreetMap',{exact:true})).toBeVisible();
  await page.evaluate(()=>document.documentElement.classList.add('dark'));
  await expect.poll(()=>successful.some(url=>url.includes('/styles/corpord-dark.json'))).toBeTruthy();
  await page.waitForLoadState('networkidle');
  await expect(canvas).toBeVisible();
  await expect(page.getByText('Карта временно недоступна.',{exact:false})).toHaveCount(0);
  await canvas.screenshot({path:'test-results/real-map-dark.png'});
  await page.setViewportSize({width:390,height:844});
  await expect(canvas).toBeVisible();
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Карта временно недоступна.',{exact:false})).toHaveCount(0);
  await canvas.screenshot({path:'test-results/real-map-mobile.png'});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
  expect(unexpected).toEqual([]);
});
