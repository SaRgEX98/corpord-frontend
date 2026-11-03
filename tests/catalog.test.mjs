import test from 'node:test';
import assert from 'node:assert/strict';
import {createTransportApi} from '../app/api/transport.api.ts';
import {createRoutesApi} from '../app/api/routes.api.ts';
import {createReadCache} from '../app/utils/read-cache.ts';

test('catalog pages preserve cursor, query and abort signal; user lists use admin ACL',async()=>{
 const calls=[];const api=createTransportApi(async(path,options)=>{calls.push({path,options});return {items:[],next_cursor:null}});
 const controller=new AbortController();
 await api.stops.page('Ёлки & вокзал','a+b=',controller.signal);
 const url=new URL(calls[0].path,'http://local');
 assert.equal(url.pathname,'/catalog/stops');assert.equal(url.searchParams.get('q'),'Ёлки & вокзал');assert.equal(url.searchParams.get('cursor'),'a+b=');assert.equal(calls[0].options.signal,controller.signal);
 await api.users.page();assert.match(calls[1].path,/^\/admin\/catalog\/users\?/);
 await api.cities.get(150001);assert.equal(calls[2].path,'/admin/cities/150001');assert.equal(calls.length,3);
});

test('route location suggestion carries a region without making it a route endpoint',async()=>{
 const calls=[];const api=createRoutesApi(async(path,options)=>{calls.push({path,options});return {items:[]}});
 const controller=new AbortController();await api.suggest('Бер','city:2',controller.signal,'Свердловская область');
 const q=new URL(calls[0].path,'http://local').searchParams;
 assert.equal(q.get('region'),'Свердловская область');assert.equal(q.get('origin_id'),'city:2');assert.equal(calls[0].options.signal,controller.signal);
 await api.stopPage(1500,'Вокзал','next');assert.match(calls[1].path,/^\/catalog\/stops\?/);assert.equal(new URL(calls[1].path,'http://local').searchParams.get('city_id'),'1500');
});

test('public read cache expires entries and bounds memory with LRU eviction',()=>{
 const original=Date.now;let now=100;Date.now=()=>now;
 try{const cache=createReadCache(2,50);cache.set('a',1);cache.set('b',2);assert.equal(cache.get('a'),1);cache.set('c',3);assert.equal(cache.get('b'),undefined);now=151;assert.equal(cache.get('a'),undefined);assert.equal(cache.get('c'),undefined);}finally{Date.now=original;}
});
