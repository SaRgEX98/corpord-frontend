import assert from 'node:assert/strict'
import test from 'node:test'
import { createFetch } from 'ofetch'
import { createSessionClient } from '../app/api/session-client.ts'

function setup(handler) {
    let token = 'expired'
    let clears = 0
    const calls = []
    const fetch = createFetch({ fetch: async (request, options) => {
        const call = { path: new URL(request).pathname, method: options.method ?? 'GET', authorization: options.headers.get('Authorization'), credentials: options.credentials, body: options.body }
        calls.push(call)
        return handler(call)
    } })
    const client = createSessionClient(fetch, 'https://api.test/api/v1', {
        getToken: () => token,
        setToken: value => { token = value },
        clearSession: () => { token = null; clears++ },
    })
    return { ...client, calls, token: () => token, clears: () => clears }
}
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })

test('concurrent 401 and explicit initialization share rotation and retry with fresh bearer', async () => {
    let release
    const client = setup(async call => {
        if (call.path.endsWith('/auth/refresh')) return new Promise(resolve => { release = () => resolve(json({ access_token: 'fresh' })) })
        if (call.authorization !== 'Bearer fresh') return json({ error: 'expired' }, 401)
        return json({ id: 1 })
    })
    const first = client.api('/users/me')
    const second = client.api('/admin/users')
    await new Promise(resolve => setImmediate(resolve))
    const explicit = client.refreshSession()
    assert.equal(client.calls.filter(call => call.path.endsWith('/auth/refresh')).length, 1)
    release()
    await Promise.all([first, second, explicit])
    assert.equal(client.token(), 'fresh')
    assert.equal(client.clears(), 0)
    assert.ok(client.calls.every(call => call.credentials === 'include'))
    assert.equal(client.calls.filter(call => call.authorization === 'Bearer fresh').length, 2)
})

test('late old-token 401 uses already refreshed token without a second rotation', async () => {
    let releaseLate
    const client = setup(async call => {
        if (call.path.endsWith('/auth/refresh')) return json({ access_token: 'fresh' })
        if (call.authorization === 'Bearer fresh') return json({ ok: true })
        if (call.path.endsWith('/late')) return new Promise(resolve => { releaseLate = () => resolve(json({}, 401)) })
        return json({}, 401)
    })
    const late = client.api('/late')
    await client.api('/first')
    releaseLate()
    await late
    assert.equal(client.calls.filter(call => call.path.endsWith('/auth/refresh')).length, 1)
})

for (const method of ['POST', 'PUT', 'DELETE']) {
    test(`${method} is never retried after 5xx or network failure`, async () => {
        for (const mode of ['server', 'network']) {
            const client = setup(() => {
                if (mode === 'network') throw new TypeError('connection lost')
                return json({ error: 'failure' }, 503)
            })
            await assert.rejects(client.api('/admin/bus/', { method, body: { capacity: 30 } }))
            assert.equal(client.calls.length, 1)
        }
    })
}

test('an admin mutation rejected by auth is retried once after refresh, never after 403', async () => {
    const client = setup(call => {
        if (call.path.endsWith('/auth/refresh')) return json({ access_token: 'fresh' })
        return call.authorization === 'Bearer fresh' ? json({ message: 'created' }, 201) : json({}, 401)
    })
    await client.api('/admin/bus/', { method: 'POST', body: { capacity: 30 } })
    assert.equal(client.calls.length, 3)
    assert.equal(client.calls[0].body, client.calls[2].body)
    const forbidden = setup(() => json({}, 403))
    await assert.rejects(forbidden.api('/admin/bus/', { method: 'POST', body: {} }))
    assert.equal(forbidden.calls.length, 1)
    assert.equal(forbidden.clears(), 0)
})

test('bad login/logout and failed refresh do not recursively rotate', async () => {
    for (const path of ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']) {
        const client = setup(() => json({}, 401))
        await assert.rejects(client.api(path, { method: 'POST' }))
        assert.equal(client.calls.length, 1)
    }
    const client = setup(() => json({}, 401))
    await assert.rejects(client.api('/users/me'))
    assert.equal(client.calls.length, 2)
    assert.equal(client.clears(), 1)
})

test('second 401 after a successful rotation ends session without retry loop', async () => {
    const client = setup(call => call.path.endsWith('/auth/refresh') ? json({ access_token: 'fresh' }) : json({}, 401))
    await assert.rejects(client.api('/users/me'))
    assert.equal(client.calls.length, 3)
    assert.equal(client.clears(), 1)
})
