import { test, expect } from '@playwright/test';

test('configured map loads only on request, survives parent updates and switches own styles', async ({page}) => {
  test.skip(!process.env.CORPORD_E2E_MAP_STYLE_TEST, 'Start a dedicated frontend with MAP_STYLE_URL=/test-map/light.json and MAP_DARK_STYLE_URL=/test-map/dark.json');
  const styles:string[]=[];
  const unexpected:string[]=[];
  page.on('request',request=>{if (/nominatim|tile\.openstreetmap|photon\.komoot/.test(request.url())) unexpected.push(request.url());});
  await page.route('**/test-map/*.json',route=>{
    styles.push(route.request().url());
    return route.fulfill({json:{version:8,sources:{},layers:[{id:'background',type:'background',paint:{'background-color':route.request().url().includes('dark')?'#172436':'#edf1f6'}}]}});
  });
  await page.route('**/api/v1/**',route=>{
    const url=new URL(route.request().url());
    if(url.pathname.endsWith('/auth/refresh')) return route.fulfill({status:401,json:{error:'unauthorized'}});
    if(url.pathname.includes('/locations/city')) return route.fulfill({json:{id:decodeURIComponent(url.pathname).split('/').pop(),type:'city',name:'Тестовый город',region:'Тестовый регион',timezone:'Europe/Moscow',served:false,rank_reason:'match',address:'',latitude:55.75,longitude:37.61}});
    if(url.pathname.endsWith('/trips/calendar')) return route.fulfill({json:{timezone:'Europe/Moscow',month:url.searchParams.get('month'),calculated_at:'2030-05-01T00:00:00Z',rule_version:'segment-v1',days:[]}});
    if(url.pathname.endsWith('/trips/search')) return route.fulfill({json:{items:[],next_cursor:null}});
    return route.fulfill({json:[]});
  });
  await page.goto('/trips?from_id=city:1&to_id=city:2&date=2030-06-01');
  const button=page.getByRole('button',{name:'Показать карту',exact:true});
  await expect(button).toBeVisible(); expect(styles).toEqual([]);
  await button.click();
  const canvas=page.locator('.maplibregl-canvas');
  await expect(canvas).toBeVisible();
  await expect.poll(()=>styles.some(url=>url.includes('light.json'))).toBeTruthy();
  await page.getByRole('combobox',{name:'Сортировка рейсов'}).click();
  await page.getByRole('option',{name:'По стоимости',exact:true}).click();
  await expect(canvas).toBeVisible();
  await page.evaluate(()=>document.documentElement.classList.add('dark'));
  await expect.poll(()=>styles.some(url=>url.includes('dark.json'))).toBeTruthy();
  await expect(canvas).toBeVisible();
  expect(unexpected).toEqual([]);
});
