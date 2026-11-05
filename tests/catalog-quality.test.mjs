import assert from 'node:assert/strict';
import test from 'node:test';
import { createCatalogQualityApi } from '../app/api/catalog-quality.api.ts';

test('quality API binds cursor, cancellation and bounded history; never retries mapping writes', async () => {
  const calls = [];
  const api = createCatalogQualityApi(async (path, options) => { calls.push({path, ...options}); return {items:[], next_cursor:null}; });
  const controller = new AbortController();
  await api.queue('Парк & город', 'page+2', controller.signal);
  const url = new URL(calls[0].path, 'http://test');
  assert.equal(url.searchParams.get('q'), 'Парк & город');
  assert.equal(url.searchParams.get('cursor'), 'page+2');
  assert.equal(url.searchParams.get('limit'), '30');
  assert.equal(calls[0].signal, controller.signal);
  await api.mapping(9, {city_id:12, version:'3', reason:'Муниципальный реестр'});
  assert.deepEqual(calls[1], {path:'/admin/catalog-quality/stops/9/mapping', method:'POST', retry:0, body:{city_id:12, version:'3', reason:'Муниципальный реестр'}});
  await api.history(9, controller.signal);
  assert.equal(calls[2].path, '/admin/catalog-quality/stops/9/history?limit=20');
  assert.throws(() => api.mapping(0, {}), /идентификатор/);
  assert.throws(() => api.history(1.5), /идентификатор/);
});
