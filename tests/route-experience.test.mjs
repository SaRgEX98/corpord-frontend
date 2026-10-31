import assert from 'node:assert/strict';
import test from 'node:test';
import { createRoutesApi } from '../app/api/routes.api.ts';
import { routeDate, routeTime, minorPrice, validRouteDate, routeErrorMessage } from '../app/utils/route-display.ts';
import { buildAdminPayload, findAdminResource } from '../app/features/admin/resources.ts';

test('route dates use departure timezone across midnight independently of device timezone', () => {
  assert.equal(routeDate('2030-05-31T21:15:00Z', 'Europe/Moscow'), '2030-06-01');
  assert.equal(routeDate('2030-06-01T00:15:00Z', 'America/New_York'), '2030-05-31');
  assert.equal(routeTime('2030-06-01T00:15:00Z', 'Asia/Yekaterinburg'), '05:15');
  assert.equal(routeTime('2030-06-01T00:15:00Z', ''), '00:15');
});
test('calendar date validation rejects impossible and malformed dates without throwing', () => {
  for (const date of ['2030-02-29','2030-99-99','2030-6-1','', 'yesterday']) assert.equal(validRouteDate(date),false);
  assert.equal(validRouteDate('2032-02-29'),true);
  assert.match(minorPrice(125055),/1\s250,55/);
  assert.match(minorPrice(0),/0/);
});
test('route services encode IDs, Cyrillic, cursor and request server quote for exact section', async () => {
  const calls=[]; const api=createRoutesApi(async (path,options)=>{calls.push({path,options});return {items:[]}});
  await api.suggest('Москва & вокзал','city:1');
  assert.equal(new URLSearchParams(calls[0].path.split('?')[1]).get('q'),'Москва & вокзал');
  await api.stops('city:2'); assert.equal(calls[1].path,'/locations/city%3A2/stops');
  await api.search({from_id:'city:1',to_id:'stop:2',date:'2030-06-01',passengers:1,sort:'price'},'a+b=');
  assert.equal(new URLSearchParams(calls[2].path.split('?')[1]).get('cursor'),'a+b=');
  await api.calendar({from_id:'city:1',to_id:'stop:2',passengers:1},'2030-06');
  assert.equal(new URLSearchParams(calls[3].path.split('?')[1]).get('month'),'2030-06');
  await api.quote(7,10,20);
  assert.deepEqual(calls[4],{path:'/trips/7/quote',options:{method:'POST',body:{boarding_stop_id:10,alighting_stop_id:20,passengers:1}}});
});
test('stop mapping supports explicit clear and retains valid timezone/city', () => {
  const resource=findAdminResource('stops');
  const base={name:'Вокзал',address:'Тестовая улица',latitude:'0',longitude:'0'};
  let result=buildAdminPayload(resource,{...base,city_id:'',timezone:''},true);
  assert.deepEqual(result.errors,{}); assert.equal(result.payload.city_id,0); assert.equal(result.payload.timezone,'');
  result=buildAdminPayload(resource,{...base,city_id:'2',timezone:'Asia/Yekaterinburg'},true);
  assert.deepEqual(result.errors,{}); assert.equal(result.payload.city_id,2);
});

test('passenger error for missing timezone is actionable without admin instructions', () => {
  assert.equal(routeErrorMessage({data:{code:'timezone_required'}}, () => 'fallback'), 'Расписание выбранной остановки уточняется. Выберите другой город или остановку.');
});
