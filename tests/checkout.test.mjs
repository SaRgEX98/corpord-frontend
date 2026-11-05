import assert from 'node:assert/strict';
import test from 'node:test';
import { createCheckoutApi } from '../app/api/checkout.api.ts';
import { checkoutPollDelay, confirmationUrl, createCheckoutIntent, checkoutError, uncertainCheckoutError } from '../app/utils/checkout.ts';
import { effectiveBookingStatus } from '../app/utils/booking.ts';
import { createSessionClient } from '../app/api/session-client.ts';
import { createFetch } from 'ofetch';

function detail(overrides = {}) {
  return { id: 3, hold_id: 2, trip_id: 1, status: 'awaiting_payment', payment_status: 'pending', amount_minor: 15001, currency: 'RUB',
    is_demo: true, test: true, passenger_name: 'Тестовый пассажир', boarding_name: 'А', alighting_name: 'Б',
    departure_time: '2030-01-01T10:00:00Z', arrival_time: '2030-01-01T11:00:00Z', timezone: 'Asia/Yekaterinburg', arrival_timezone: 'Asia/Yekaterinburg',
    seat_number: 1, created_at: '2030-01-01T09:00:00Z', updated_at: '2030-01-01T09:00:00Z', hold_expires_at: '2030-01-01T09:10:00Z',
    actions: { can_pay: true, can_cancel: true, can_reconcile: true, can_view_confirmation: true },
    payment: { confirmation_url: 'https://checkout.example.test/only-server-url' }, next_poll_after_ms: 1000, ...overrides };
}
test('checkout transport encodes cursor/status, fixes page30 and binds all mutations to their session', async () => {
  const calls = []; const signal = new AbortController().signal;
  const api = createCheckoutApi(async (path, options) => { calls.push({ path, options }); return detail(); });
  await api.list('paid', 'owner+/=&', signal);
  const q = new URL(calls[0].path, 'http://test').searchParams;
  assert.equal(q.get('limit'), '30'); assert.equal(q.get('status'), 'paid'); assert.equal(q.get('cursor'), 'owner+/=&');
  assert.equal(calls[0].options.signal, signal);
  await api.create(2, 'test-checkout-key', signal, 7); await api.cancel(3, signal, 7); await api.reconcile(3, signal, 7); await api.detail(3, signal, 7);
  assert.deepEqual(calls[1].options.body, { hold_id: 2 }); assert.equal(calls[1].options.headers['Idempotency-Key'], 'test-checkout-key');
  for (const call of calls.slice(1)) { assert.equal(call.options.sessionVersion, 7); assert.equal(call.options.signal, signal); }
  assert.throws(() => api.create(2, 'short'), /ключ/); assert.throws(() => api.detail(-1), /идентификатор/);
});

test('confirmation only trusts server HTTPS detail and server action, never a payment result query', () => {
  assert.equal(confirmationUrl(detail()), 'https://checkout.example.test/only-server-url');
  for (const value of ['http://checkout.example.test/x', 'javascript:alert(1)', '/relative', '//checkout.example.test/x', 'https://user:pass@example.test/x', 'https://example.test/\nmalformed']) {
    assert.equal(confirmationUrl(detail({ payment: { confirmation_url: value } })), null);
  }
  assert.equal(confirmationUrl(detail({ actions: { can_view_confirmation: false } })), null);
  assert.equal(confirmationUrl(detail({ test: false })), null);
  assert.equal(confirmationUrl(detail({ is_demo: false })), null);
  assert.equal(confirmationUrl(detail({ payment: { confirmation_url: null } })), null);
});

test('poll hints are bounded/backed off and stop for terminals, review, null, time or count budget', () => {
  assert.equal(checkoutPollDelay(detail(), 0, 0), 1000);
  assert.equal(checkoutPollDelay(detail(), 3, 0), 8000);
  assert.equal(checkoutPollDelay(detail({ next_poll_after_ms: 999999999 }), 3, 0), 30000);
  assert.equal(checkoutPollDelay(detail(), 12, 0), null); assert.equal(checkoutPollDelay(detail(), 1, 120000), null);
  for (const status of ['paid', 'cancelled', 'expired', 'refunded', 'review_required']) assert.equal(checkoutPollDelay(detail({ status }), 0, 0), null);
  for (const hint of [null, 0, -1, Infinity, NaN]) assert.equal(checkoutPollDelay(detail({ next_poll_after_ms: hint }), 0, 0), null);
});

test('committing/confirmed allocations remain protected after initial hold TTL', () => {
  for (const status of ['payment_committing', 'confirmed']) assert.equal(effectiveBookingStatus({ status, expires_at: '2000-01-01T00:00:00Z' }), status);
  assert.equal(effectiveBookingStatus({ status: 'held', expires_at: '2000-01-01T00:00:00Z' }), 'expired');
});

test('checkout intent is immutable, fresh per new intent, and transport failures preserve retry', () => {
  const intent = createCheckoutIntent(2, 7, 'immutable-test-key'); assert.ok(Object.isFrozen(intent));
  assert.equal(intent.validFor(7), true); assert.equal(intent.validFor(8), false);
  assert.notEqual(createCheckoutIntent(2, 7).key, createCheckoutIntent(2, 7).key);
  assert.equal(uncertainCheckoutError(new TypeError('network')), true); assert.equal(uncertainCheckoutError({ statusCode: 503 }), true);
  assert.equal(uncertainCheckoutError({ statusCode: 409 }), false);
  assert.match(checkoutError({ statusCode: 409, data: { code: 'checkout_exists' } }), /уже есть заказ/);
  assert.doesNotMatch(checkoutError({ statusCode: 503, data: { error: 'sql secret' } }), /sql secret/);
});

test('checkout401 replay keeps key and payload; old account mutations never reach a new identity', async () => {
  let token = 'expired'; let version = 1; const calls = [];
  const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
  const fetch = createFetch({ fetch: async (url, options) => {
    const path = new URL(url).pathname; calls.push({ path, key: options.headers.get('Idempotency-Key'), body: options.body });
    if (path.endsWith('/auth/refresh')) return json({ access_token: 'fresh' });
    return options.headers.get('Authorization') === 'Bearer fresh' ? json(detail()) : json({}, 401);
  } });
  const client = createSessionClient(fetch, 'http://test/api/v1', { getToken: () => token, getVersion: () => version, setToken: value => { token = value; }, clearSession: () => { version++; token = null; } });
  const api = createCheckoutApi(client.api); const intent = createCheckoutIntent(2, 1, 'checkout-session-key');
  await api.create(intent.holdId, intent.key, undefined, intent.ownerVersion);
  const writes = calls.filter(x => x.path.endsWith('/me/checkouts')); assert.equal(writes.length, 2); assert.equal(writes[0].key, writes[1].key); assert.equal(writes[0].body, writes[1].body);
  version++; const before = calls.length;
  await assert.rejects(api.create(2, intent.key, undefined, 1)); await assert.rejects(api.cancel(3, undefined, 1)); await assert.rejects(api.reconcile(3, undefined, 1));
  assert.equal(calls.length, before);
});

test('detail controller polls only the visible pending order and clears late data on session/route change', async () => {
  const { readFile } = await import('node:fs/promises'); const { stripTypeScriptTypes } = await import('node:module');
  const { reactive, effectScope, nextTick } = await import('vue');
  let source = stripTypeScriptTypes(await readFile(new URL('../app/composables/useCheckoutDetail.ts', import.meta.url), 'utf8'));
  source = source.replace(/import \{ createCheckoutApi \} from '[^']+';/, 'const createCheckoutApi = () => globalThis.__checkoutApi;')
    .replace(/import \{ useAuthStore \} from '[^']+';/, 'const useAuthStore = () => globalThis.__checkoutAuth;')
    .replace("'~/utils/checkout'", JSON.stringify(new URL('../app/utils/checkout.ts', import.meta.url).href));
  source = `import {ref,watch} from '${import.meta.resolve('vue')}'; const useNuxtApp=()=>({$api:null}); const onMounted=fn=>globalThis.__checkoutMount=fn; const onBeforeUnmount=fn=>globalThis.__checkoutUnmount=fn; const setTimeout=(...args)=>globalThis.__checkoutSchedule(...args); const clearTimeout=id=>globalThis.__checkoutClear(id); const document=globalThis.__checkoutDocument;\n` + source;
  const auth = reactive({ isAuthenticated: true, sessionVersion: 1 }); const route = reactive({ id: 3 });
  const scheduled = new Map(); let sequence = 0; let listener; let reads = 0; let writes = 0; let late; let lateSignal;
  globalThis.__checkoutAuth = auth;
  globalThis.__checkoutDocument = { visibilityState: 'visible', addEventListener: (_, fn) => { listener = fn; }, removeEventListener: () => { listener = undefined; } };
  globalThis.__checkoutSchedule = fn => { scheduled.set(++sequence, fn); return sequence; }; globalThis.__checkoutClear = id => scheduled.delete(id);
  globalThis.__checkoutApi = { detail: async (id, signal, version) => { reads++; assert.equal(version, auth.sessionVersion); return detail({ id }); }, reconcile: async () => { writes++; }, cancel: async () => { writes++; return detail({ status: 'cancel_pending' }); } };
  const { useCheckoutDetail } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const scope = effectScope(); let state; scope.run(() => { state = useCheckoutDetail(() => route.id); });
  globalThis.__checkoutMount(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(reads, 1); assert.equal(writes, 0); assert.equal(scheduled.size, 1);
  globalThis.__checkoutDocument.visibilityState = 'hidden'; listener(); assert.equal(scheduled.size, 0);
  globalThis.__checkoutDocument.visibilityState = 'visible'; listener(); await new Promise(resolve => setImmediate(resolve)); assert.equal(reads, 2);
  globalThis.__checkoutApi.detail = async (id, signal) => { lateSignal = signal; return new Promise(resolve => { late = resolve; }); };
  const old = state.refresh(); auth.sessionVersion++; auth.isAuthenticated = false;
  assert.equal(lateSignal.aborted, true); assert.equal(state.data.value, null); assert.equal(scheduled.size, 0);
  late(detail()); await old; assert.equal(state.data.value, null);
  globalThis.__checkoutApi.detail = async id => detail({ id, status: 'paid', payment_status: 'succeeded' }); auth.isAuthenticated = true; await nextTick(); await new Promise(resolve => setImmediate(resolve));
  assert.equal(state.data.value.status, 'paid'); assert.equal(scheduled.size, 0);
  route.id = 4; await nextTick(); await new Promise(resolve => setImmediate(resolve)); assert.equal(state.data.value.id, 4);
  globalThis.__checkoutUnmount(); assert.equal(state.data.value, null); assert.equal(scheduled.size, 0); assert.equal(listener, undefined); scope.stop();
  for (const key of Object.keys(globalThis).filter(key => key.startsWith('__checkout'))) delete globalThis[key];
});
