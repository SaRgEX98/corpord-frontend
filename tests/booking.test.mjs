import assert from 'node:assert/strict';
import test from 'node:test';
import { createBookingApi } from '../app/api/booking.api.ts';
import { createHoldIntent, effectiveBookingStatus, holdRemaining, bookingError } from '../app/utils/booking.ts';
import { createSessionClient } from '../app/api/session-client.ts';
import { createFetch } from 'ofetch';

test('booking transport preserves encoded owner cursor, signal and fixed page bounds', async () => {
  const calls = []; const signal = new AbortController().signal;
  const api = createBookingApi(async (path, options) => { calls.push({ path, options }); return {}; });
  await api.bookings('owner+a=/&', signal); await api.passengers('passenger+/=', signal);
  for (const call of calls) {
    const url = new URL(call.path, 'http://test'); assert.equal(url.searchParams.get('limit'), '30');
    assert.equal(call.options.signal, signal);
  }
  assert.equal(new URL(calls[0].path, 'http://test').searchParams.get('cursor'), 'owner+a=/&');
  await api.availability(7, 11, 13, signal);
  assert.equal(calls[2].path, '/trips/7/availability?boarding_stop_id=11&alighting_stop_id=13');
  assert.throws(() => api.booking(-1), /идентификатор/);
});

test('an uncertain hold retries exactly the frozen intent with the same idempotency key', async () => {
  const payload = { trip_id: 7, boarding_stop_id: 11, alighting_stop_id: 13, passenger_name: 'Тест' };
  const intent = createHoldIntent(payload, 4, 'hold-test-key-123'); payload.passenger_name = 'Changed';
  const calls = []; const api = createBookingApi(async (path, options) => { calls.push(options); if (calls.length === 1) throw new TypeError('lost'); return { id: 1 }; });
  await assert.rejects(api.hold(intent.body, intent.key, undefined, intent.ownerVersion));
  await api.hold(intent.body, intent.key, undefined, intent.ownerVersion);
  assert.equal(calls[0].headers['Idempotency-Key'], calls[1].headers['Idempotency-Key']);
  assert.deepEqual(calls[0].body, calls[1].body); assert.equal(calls[1].body.passenger_name, 'Тест');
  assert.equal(calls[1].sessionVersion, 4); assert.equal(intent.validFor(4), true); assert.equal(intent.validFor(5), false);
  assert.notEqual(createHoldIntent(payload, 5).key, createHoldIntent(payload, 5).key);
  assert.throws(() => api.hold(payload, 'bad'), /ключ/);
});

test('expiry changes display at the exact boundary and cannot resurrect cancelled status', () => {
  const expires_at = '2030-01-01T00:10:00Z'; const expiry = Date.parse(expires_at);
  assert.equal(effectiveBookingStatus({ status: 'held', expires_at }, expiry - 1), 'held');
  assert.equal(effectiveBookingStatus({ status: 'held', expires_at }, expiry), 'expired');
  assert.equal(effectiveBookingStatus({ status: 'cancelled', expires_at }, expiry - 1), 'cancelled');
  assert.equal(holdRemaining(expires_at, expiry - 600000), '10:00');
  assert.equal(holdRemaining(expires_at, expiry + 1000), '0:00');
  assert.match(bookingError({ statusCode: 409, data: { code: 'hold_limit' } }), /пять/);
  assert.doesNotMatch(bookingError({ statusCode: 503, data: { error: 'secret SQL' } }), /secret/);
});

test('hold auth retry preserves Idempotency-Key and old-owner request cannot change identity', async () => {
  let version = 1; let token = 'expired'; const calls = [];
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const fetch = createFetch({ fetch: async (url, options) => {
    const path = new URL(url).pathname; calls.push({ path, key: options.headers.get('Idempotency-Key'), auth: options.headers.get('Authorization') });
    if (path.endsWith('/auth/refresh')) return json({ access_token: 'fresh' });
    if (options.headers.get('Authorization') !== 'Bearer fresh') return json({}, 401);
    return json({ id: 1 }, 201);
  } });
  const client = createSessionClient(fetch, 'http://test/api/v1', { getToken: () => token, getVersion: () => version, setToken: value => { token = value; }, clearSession: () => { version++; token = null; } });
  const api = createBookingApi(client.api); const intent = createHoldIntent({ trip_id: 1, boarding_stop_id: 2, alighting_stop_id: 3, passenger_name: 'Имя' }, 1, 'auth-retry-key');
  await api.hold(intent.body, intent.key, undefined, intent.ownerVersion);
  assert.deepEqual(calls.filter(call => call.path.endsWith('/me/bookings')).map(call => call.key), ['auth-retry-key', 'auth-retry-key']);
  version++; const before = calls.length;
  await assert.rejects(api.hold(intent.body, intent.key, undefined, intent.ownerVersion));
  assert.equal(calls.length, before);
  await assert.rejects(api.savePassenger('Старая персона', undefined, undefined, 1));
  await assert.rejects(api.removePassenger(1, undefined, 1));
  await assert.rejects(api.cancel(1, undefined, 1));
  assert.equal(calls.length, before);
});

test('private cursor pages discard late results on owner change and bound the visible window', async () => {
  const { readFile } = await import('node:fs/promises');
  const { stripTypeScriptTypes } = await import('node:module');
  const { reactive, effectScope } = await import('vue');
  const source = await readFile(new URL('../app/composables/usePrivatePages.ts', import.meta.url), 'utf8');
  let code = stripTypeScriptTypes(source).replace(/import \{ useAuthStore \} from '[^']+';/, 'const useAuthStore = () => globalThis.__bookingAuth;').replace("'~/utils/api-errors'", JSON.stringify(new URL('../app/utils/api-errors.ts', import.meta.url).href));
  code = `import {ref,watch} from '${import.meta.resolve('vue')}'; const onMounted = fn => globalThis.__bookingMount = fn; const onBeforeUnmount = fn => globalThis.__bookingUnmount = fn;\n` + code;
  const { usePrivatePages } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const auth = reactive({ isAuthenticated: true, sessionVersion: 1 }); globalThis.__bookingAuth = auth;
  let late; let firstSignal; let calls = 0;
  const scope = effectScope(); let state;
  scope.run(() => { state = usePrivatePages(async (cursor, signal) => {
    calls++; if (calls === 1) { firstSignal = signal; return new Promise(resolve => { late = resolve; }); }
    return { items: Array.from({ length: 30 }, (_, n) => ({ id: (calls - 1) * 30 + n })), next_cursor: `cursor-${calls}` };
  }); });
  const pending = globalThis.__bookingMount();
  auth.sessionVersion++; auth.isAuthenticated = false;
  assert.equal(firstSignal.aborted, true); assert.deepEqual(state.items.value, []);
  late({ items: [{ id: 'old-owner-secret' }], next_cursor: 'old-owner' }); await pending;
  assert.deepEqual(state.items.value, []); assert.equal(state.nextCursor.value, null);
  auth.isAuthenticated = true; await new Promise(resolve => setImmediate(resolve));
  for (let n = 0; n < 8; n++) await state.loadMore();
  assert.equal(state.items.value.length, 200); assert.ok(state.items.value.every(x => typeof x.id === 'number'));
  globalThis.__bookingUnmount(); assert.deepEqual(state.items.value, []); scope.stop();
  delete globalThis.__bookingAuth; delete globalThis.__bookingMount; delete globalThis.__bookingUnmount;
});
