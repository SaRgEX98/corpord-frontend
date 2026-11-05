import assert from 'node:assert/strict';
import test from 'node:test';
import { safeLoginRedirect } from '../app/utils/login-redirect.ts';

test('login preserves exact local checkout return and trip section, Unicode query, and default profile', () => {
  for (const path of ['/me/orders/3/payment-return?status=paid', '/trips/7?boarding_stop_id=11&alighting_stop_id=13', '/me/orders?view=orders', '/trips?from_name=%D0%95%D0%BA%D0%B0%D1%82%D0%B5%D1%80%D0%B8%D0%BD%D0%B1%D1%83%D1%80%D0%B3', '/trips#search', '/']) assert.equal(safeLoginRedirect(path), path);
  for (const value of [undefined, null, '', ['/me/orders'], { redirect: '/me/orders' }]) assert.equal(safeLoginRedirect(value), '/me/profile');
});

test('login rejects external/protocol-relative, backslash/control, encoded separator and auth-loop returns', () => {
  const attacks = [
    'https://attacker.example/x', 'javascript:alert(1)', '//attacker.example/x', '///attacker.example/x',
    '/\\attacker.example', '/trips\\x', '/trips\n', '/trips\u0000x', '/trips\u0085x', ' /trips',
    '/%2fattacker.example', '/%5cattacker.example', '/%252fattacker.example', '/%25252fattacker.example', '/trips?x=%2f%2fattacker.example',
    '/%0d%0aevil', '/trips?x=%00', '/%ZZ', '/trips?x=%C2%85', '/login', '/login?redirect=/me/orders', '/LOGIN', '/register', '/logout', '/auth/callback',
    '/trips/../login', '/%6cogin', '/%256cogin', '/x/%2e%2e/auth/callback', '/' + 'x'.repeat(2048),
  ];
  for (const value of attacks) assert.equal(safeLoginRedirect(value), '/me/profile', JSON.stringify(value));
});

test('real login submit captures a validated destination before async session transition', async () => {
  const { readFile } = await import('node:fs/promises'); const { stripTypeScriptTypes } = await import('node:module');
  const component = await readFile(new URL('../app/components/Auth/LoginForm.vue', import.meta.url), 'utf8');
  let source = stripTypeScriptTypes(component.match(/<script setup lang="ts">([\s\S]*?)<\/script>/)[1]);
  source = source.replace(/import \{ ArrowRight, Eye, EyeOff \} from "lucide-vue-next";/, '')
    .replace(/import \{ useAuthStore \} from "~\/store\/auth";/, 'const useAuthStore=()=>globalThis.__loginAuth;');
  for (const [alias, file] of [['~/features/auth/ui/login.schema', '../app/features/auth/ui/login.schema.ts'], ['~/utils/api-errors', '../app/utils/api-errors.ts'], ['~/utils/login-redirect', '../app/utils/login-redirect.ts']]) source = source.replace(JSON.stringify(alias), JSON.stringify(new URL(file, import.meta.url).href));
  source = `import {ref,reactive} from '${import.meta.resolve('vue')}'; const useRoute=()=>globalThis.__loginRoute; const navigateTo=value=>globalThis.__loginNavigate(value);\n` + source + '\nexport {onSubmit,form};';
  let release; const destinations = [];
  globalThis.__loginAuth = { login: async () => new Promise(resolve => { release = resolve; }) };
  globalThis.__loginRoute = { query: { redirect: '/me/orders/3/payment-return?status=paid' } };
  globalThis.__loginNavigate = value => { destinations.push(value); };
  const { onSubmit, form } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  form.email = 'disposable-login@example.test'; form.password = 'isolated-password';
  const pending = onSubmit();
  globalThis.__loginRoute.query.redirect = '//attacker.example';
  release(); await pending;
  assert.deepEqual(destinations, ['/me/orders/3/payment-return?status=paid']);
  globalThis.__loginAuth.login = async () => {};
  await onSubmit(); assert.deepEqual(destinations, ['/me/orders/3/payment-return?status=paid', '/me/profile']);
  delete globalThis.__loginAuth; delete globalThis.__loginRoute; delete globalThis.__loginNavigate;
});
