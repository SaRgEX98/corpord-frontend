import { test, expect } from '@playwright/test';

test('real self-hosted Photon result maps explicitly to an internal test stop', async ({page,request}) => {
  test.skip(!process.env.CORPORD_E2E_GEO_PILOT, 'Requires the labelled local Photon pilot and disposable backend stack.');
  const api = process.env.CORPORD_E2E_API_URL!;
  let place: {label:string;city:string;latitude:number;longitude:number} | undefined;
  let query = '';
  for (const candidate of ['Екатеринбург','8 Марта','Белинского','Южный']) {
    const response = await request.get(`${api}/geo/suggest?${new URLSearchParams({q:candidate,limit:'5'})}`);
    expect(response.ok(), `real Photon adapter status ${response.status()}`).toBeTruthy();
    const items = (await response.json()).items;
    place = items.find((item: {city:string}) => item.city?.includes('Екатеринбург'));
    if (place) { query = candidate; break; }
  }
  expect(place, 'The real source must provide at least one verified city hierarchy for stop mapping').toBeTruthy();
  const login = await request.post(`${api}/auth/login`, {data:{email:process.env.CORPORD_E2E_ADMIN_EMAIL,password:process.env.CORPORD_E2E_ADMIN_PASSWORD}});
  expect(login.ok()).toBeTruthy();
  const headers = {Authorization:`Bearer ${(await login.json()).access_token}`};
  const cities = await request.get(`${api}/admin/cities`,{headers});
  const city = (await cities.json()).items.find((item:{name:string})=>item.name==='Екатеринбург');
  expect(city).toBeTruthy();
  const name = `Тест геопилота ${Date.now().toString(36)}`;
  const created = await request.post(`${api}/admin/stops/`,{headers,data:{name,address:'Тестовая запись, не реальное место посадки',latitude:place!.latitude,longitude:place!.longitude,city_id:city.id}});
  expect(created.ok()).toBeTruthy();
  const id = (await created.json()).id;
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto('/trips');
    await page.getByText('Найти адрес или место на карте',{exact:true}).click();
    await page.getByRole('combobox',{name:'Поиск адреса или места'}).fill(query);
    await page.getByRole('option',{name:place!.label,exact:true}).click();
    await page.getByRole('button',{name:/^Екатеринбург · Свердловская область$/}).click();
    await expect(page.getByText(name,{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Отсюда',exact:true}).click();
    await expect(page.getByRole('combobox',{name:'Место отправления'})).toHaveValue(name);
    expect(errors).toEqual([]);
  } finally {
    await request.delete(`${api}/admin/stops/${id}`,{headers});
  }
});
