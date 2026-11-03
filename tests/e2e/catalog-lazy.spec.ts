import {test,expect} from '@playwright/test';

test('stop catalog requests bounded pages, debounces search and discards stale results',async({page})=>{
 const calls:string[]=[];
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());calls.push(url.pathname+url.search);
  if(url.pathname.endsWith('/auth/refresh'))return route.fulfill({status:401,json:{error:'unauthorized'}});
  if(url.pathname.endsWith('/catalog/stops')){
   const q=url.searchParams.get('q')??'';
   if(q==='старый')await new Promise(resolve=>setTimeout(resolve,450));
   const start=url.searchParams.get('cursor')?31:1;
   return route.fulfill({json:{items:Array.from({length:q?1:30},(_,i)=>({id:start+i,name:q||`Остановка ${start+i}`,address:'Тестовый адрес',latitude:56.8,longitude:60.6})),next_cursor:q||start>1?null:'page2'}});
  }
  return route.fulfill({json:{items:[]}});
 });
 await page.goto('/stops');
 await expect(page.locator('.resource-card')).toHaveCount(30);
 expect(calls.filter(url=>/^\/api\/v1\/(stops|trips|driver|bus)\//.test(url))).toHaveLength(0);
 expect(calls.filter(url=>url.includes('/catalog/stops'))).toHaveLength(1);
 await page.getByRole('button',{name:'Показать ещё',exact:true}).click();
 await expect(page.locator('.resource-card')).toHaveCount(60);
 const search=page.getByRole('textbox',{name:'Поиск: остановки'});
 await search.fill('старый');
 await expect.poll(()=>calls.some(url=>decodeURIComponent(url).includes('старый'))).toBeTruthy();
 await search.fill('новый');
 await expect(page.locator('.resource-card')).toHaveCount(1);
 await expect(page.locator('.resource-card')).toContainText('новый');
 await expect(page.locator('.resource-card')).not.toContainText('старый');
 const last=new URL(calls.filter(url=>url.includes('/catalog/stops')).at(-1)!,'http://local');
 expect(last.searchParams.has('cursor')).toBeFalsy();
 expect(last.searchParams.get('limit')).toBe('30');
});

test('region selection narrows city suggestions without using a region as a route endpoint',async({page})=>{
 const requests:URL[]=[];
 const city={id:'city:101',type:'city',name:'Екатеринбург',region:'Свердловская область',timezone:'Asia/Yekaterinburg',served:false,rank_reason:'match',address:'',latitude:56.8,longitude:60.6};
 await page.route('**/api/v1/**',async route=>{
  const url=new URL(route.request().url());requests.push(url);
  if(url.pathname.endsWith('/auth/refresh'))return route.fulfill({status:401,json:{error:'unauthorized'}});
  if(url.pathname.endsWith('/catalog/regions'))return route.fulfill({json:{items:[{id:7,name:'Свердловская область'}],next_cursor:null}});
  if(url.pathname.endsWith('/locations/suggest'))return route.fulfill({json:{items:url.searchParams.get('region')?[city]:[]}});
  return route.fulfill({json:{items:[]}});
 });
 await page.goto('/trips');
 const origin=page.getByRole('combobox',{name:'Место отправления'});
 await origin.fill('Свердловская');
 await page.getByRole('option',{name:/Свердловская область.*Регион/}).click();
 await origin.click();
 await expect(page.getByRole('option',{name:/Екатеринбург/})).toBeVisible();
 expect(requests.some(url=>url.pathname.endsWith('/locations/suggest')&&url.searchParams.get('region')==='Свердловская область')).toBeTruthy();
 await page.getByRole('option',{name:/Екатеринбург/}).click();
 await expect(origin).toHaveValue('Екатеринбург');
 expect(requests.filter(url=>url.pathname.endsWith('/trips/search'))).toHaveLength(0);
});
