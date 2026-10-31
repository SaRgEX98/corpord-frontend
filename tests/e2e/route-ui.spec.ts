import { test, expect } from '@playwright/test';

test('Russian price calendar, exact server search, URL restore and geo fallback in both themes', async ({page}) => {
  const errors:string[]=[]; page.on('pageerror',error=>errors.push(error.message));
  const location=(id:string,name:string)=>({id,type:'city',name,region:'Тестовый регион',timezone:'Europe/Moscow',served:true,rank_reason:'match',address:'',latitude:null,longitude:null});
  const origin=location('city:1','Москва'); const destination=location('city:2','Тюмень');
  const month='2030-06';
  await page.route('**/api/v1/**',async request=>{
    const url=new URL(request.request().url());
    if(url.pathname.endsWith('/auth/refresh')) return request.fulfill({status:401,json:{error:'unauthorized'}});
    if(url.pathname.endsWith('/locations/suggest')) return request.fulfill({json:{items:url.searchParams.get('q')?.startsWith('Тю')?[destination]:[origin]}});
    if(url.pathname.includes('/locations/city')) return request.fulfill({json:decodeURIComponent(url.pathname).endsWith('city:1')?origin:destination});
    if(url.pathname.endsWith('/trips/calendar')) {
      const m=url.searchParams.get('month')||month;
      return request.fulfill({json:{timezone:'Europe/Moscow',month:m,calculated_at:'2030-05-01T00:00:00Z',rule_version:'segment-v1',days:Array.from({length:30},(_,i)=>({date:`${m}-${String(i+1).padStart(2,'0')}`,status:i===0?'unknown':'no_trips',min_price_minor:i===0?125050:null,trip_count:i===0?1:0}))}});
    }
    if(url.pathname.endsWith('/trips/search')) return request.fulfill({json:{items:[{trip_id:7,boarding_stop_id:10,alighting_stop_id:20,boarding_name:'Москва',alighting_name:'Тюмень',departure_time:'2030-05-31T21:15:00Z',arrival_time:'2030-06-01T04:15:00Z',timezone:'Europe/Moscow',arrival_timezone:'Asia/Yekaterinburg',status:'scheduled',price:{amount_minor:125050,currency:'RUB',rule_version:'segment-v1',calculated_at:'2030-05-01T00:00:00Z'},availability:{status:'unknown',seats:null}}],next_cursor:null}});
    if(url.pathname.endsWith('/geo/suggest')) return request.fulfill({status:503,json:{error:'Поиск адресов временно недоступен'}});
    return request.fulfill({json:[]});
  });
  await page.goto(`/trips?from_id=city:1&to_id=city:2&from_name=Москва&to_name=Тюмень&date=${month}-01&sort=departure`);
  const calendar=page.getByRole('region',{name:'Календарь цен'});
  await expect(calendar).toBeVisible();
  await expect(calendar.locator('[data-slot=calendar-head-cell]').first()).toHaveText(/пн/i);
  await expect(calendar).toContainText(/июнь/i);
  await expect(calendar.getByRole('gridcell').first()).toHaveAccessibleName(/^2030-05-27:/);
  await expect(calendar.getByRole('button',{name:'2030-06-02: Нет рейсов',exact:true})).toBeDisabled();
  await expect(calendar.getByRole('button',{name:/2030-06-01: от/})).toContainText(/1\s250,5/);
  await expect(page.getByText('Свободные места уточняются',{exact:true})).toBeVisible();
  await expect(page.getByText('01.06.2030 · 00:15 → 09:15',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Подробнее',exact:true})).toHaveAttribute('href',/boarding_stop_id=10.*alighting_stop_id=20/);
  await page.getByText('Найти адрес или место на карте',{exact:true}).click();
  await page.getByRole('combobox',{name:'Поиск адреса или места'}).fill('Тестовый адрес');
  await expect(page.getByText('Поиск адресов временно недоступен. Выберите город или остановку выше.',{exact:true})).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('combobox',{name:'Место прибытия'}).fill('Тю');
  await expect(page.getByRole('option',{name:/Тюмень/})).toBeVisible();
  await page.getByRole('option',{name:/Тюмень/}).click();
  await page.getByRole('button',{name:'Найти рейс',exact:true}).click();
  await expect(page).toHaveURL(url => url.searchParams.get('to_id') === 'city:2');
  await page.evaluate(()=>localStorage.setItem('corpord-theme','dark'));
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.setViewportSize({width:390,height:844});
  await expect(calendar).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
  expect(errors).toEqual([]);
});
