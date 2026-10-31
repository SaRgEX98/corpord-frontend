import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { stripTypeScriptTypes } from 'node:module'
import { createPinia, setActivePinia } from 'pinia'

// Nuxt auto-imports and aliases are supplied explicitly to execute the real store
// without booting the UI. Auth calls still pass through the actual auth API module.
const source = await readFile(new URL('../app/store/auth.ts', import.meta.url), 'utf8')
const code = `import { defineStore } from '${import.meta.resolve('pinia')}';\n` + stripTypeScriptTypes(source).replace("'~/api/auth.api'", JSON.stringify(new URL('../app/api/auth.api.ts', import.meta.url).href))
const { useAuthStore } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
const profile = { id: 1, email: 'test@example.invalid', name: 'Тест', role: 'user', user_agent: '', ip: '', created_at: '', updated_at: '' }

function setup(api, refresh) {
    setActivePinia(createPinia())
    const auth = useAuthStore()
    globalThis.useNuxtApp = () => ({ $api: api, $refreshSession: async () => {
        await refresh?.()
        auth.token = 'access-token'
    } })
    return auth
}

test('concurrent session initialization restores profile once and exposes backend roles', async () => {
    let refreshes = 0
    let reads = 0
    const auth = setup(async path => {
        assert.equal(path, '/users/me')
        reads++
        return profile
    }, async () => { refreshes++ })
    await Promise.all([auth.ensureSession(), auth.initSession(), auth.ensureSession()])
    assert.equal(refreshes, 1)
    assert.equal(reads, 1)
    assert.equal(auth.isAuthenticated, true)
    assert.equal(auth.isAdmin, false)
    auth.user = { ...profile, role: 'admin' }
    assert.equal(auth.isAdmin, true)
    await auth.ensureSession()
    assert.equal(refreshes, 1)
})

test('absent cookie initializes public guest once without repeated refresh', async () => {
    let refreshes = 0
    const auth = setup(async () => { throw new Error('unexpected profile') }, async () => { refreshes++; throw new Error('missing cookie') })
    await Promise.all([auth.ensureSession(), auth.ensureSession()])
    await auth.ensureSession()
    assert.equal(refreshes, 1)
    assert.equal(auth.initialized, true)
    assert.equal(auth.isAuthenticated, false)
})

test('registration sends backend fields and loads profile before authentication becomes true', async () => {
    const calls = []
    const auth = setup(async (path, options) => {
        calls.push({ path, ...options })
        return path === '/users/me' ? profile : { access_token: 'registered' }
    })
    const body = { email: profile.email, name: profile.name, password: 'test-only' }
    await auth.register(body)
    assert.deepEqual(calls, [{ path: '/auth/register', method: 'POST', body }, { path: '/users/me' }])
    assert.equal(auth.token, 'registered')
    assert.equal(auth.isAuthenticated, true)
})

test('logout clears local session; failed global logout preserves usable session and reports error', async () => {
    const auth = setup(async () => { throw new Error('server unavailable') })
    auth.token = 'access'
    auth.user = profile
    auth.initialized = true
    await assert.rejects(auth.logoutAll())
    assert.equal(auth.isAuthenticated, true)
    await assert.rejects(auth.logout())
    assert.equal(auth.isAuthenticated, false)
    assert.equal(auth.initialized, true)
})
