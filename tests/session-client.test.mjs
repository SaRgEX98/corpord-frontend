import assert from 'node:assert/strict'
import test from 'node:test'
import { createFetch } from 'ofetch'
import { createSessionClient } from '../app/api/session-client.ts'

function setup(handler) {
    let token = 'expired'
    let version = 0
    let clears = 0
    const calls = []
    const fetch = createFetch({ fetch: async (request, options) => {
        const call = { path: new URL(request).pathname, method: options.method ?? 'GET', authorization: options.headers.get('Authorization'), credentials: options.credentials, body: options.body }
        calls.push(call)
        return handler(call)
    } })
    const client = createSessionClient(fetch, 'https://api.test/api/v1', {
        getToken: () => token,
        getVersion: () => version,
        setToken: value => { token = value },
        clearSession: () => { token = null; version++; clears++ },
    })
    return { ...client, calls, token: () => token, replace: value => { token = value; version++ }, clears: () => clears }
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

test('late refresh cannot restore a logged out identity or overwrite a new login', async () => {
    for (const nextToken of [null, 'user-b']) {
        let release
        const client = setup(() => new Promise(resolve => { release = () => resolve(json({ access_token: 'user-a-late' })) }))
        const pending = client.refreshSession()
        await new Promise(resolve => setImmediate(resolve))
        client.replace(nextToken)
        release()
        await assert.rejects(pending, /Сессия изменилась/)
        assert.equal(client.token(), nextToken)
    }
})

test('an old identity request never retries its mutation as the newly logged in user', async () => {
    let release
    const client = setup(() => new Promise(resolve => { release = () => resolve(json({}, 401)) }))
    const pending = client.api('/admin/bus/', { method: 'POST', body: { capacity: 30 } })
    await new Promise(resolve => setImmediate(resolve))
    client.replace('user-b')
    release()
    await assert.rejects(pending)
    assert.equal(client.token(), 'user-b')
    assert.equal(client.calls.length, 1)
    assert.equal(client.clears(), 0)
})

test('a new identity refresh does not join a pending rotation for the previous user', async () => {
    let releaseOld
    let refreshCount = 0
    const client = setup(() => {
        if (++refreshCount === 1) return new Promise(resolve => { releaseOld = () => resolve(json({ access_token: 'user-a-late' })) })
        return json({ access_token: 'user-b-fresh' })
    })
    const previous = client.refreshSession()
    await new Promise(resolve => setImmediate(resolve))
    client.replace('user-b')
    const next = client.refreshSession()
    const previousResult = assert.rejects(previous)
    releaseOld()
    await previousResult
    await next
    assert.equal(client.token(), 'user-b-fresh')
    assert.equal(refreshCount, 2)
})

test('cookie-writing login/logout wait for pending refresh and later rotations wait for auth transitions', async () => {
    let releaseRefresh
    const order = []
    const client = setup(() => new Promise(resolve => {
        order.push('refresh dispatched')
        releaseRefresh = () => { order.push('refresh cookie applied'); resolve(json({ access_token: 'fresh' })) }
    }))
    const pending = client.refreshSession()
    await new Promise(resolve => setImmediate(resolve))
    let releaseLogin
    const login = client.runSessionTransition(() => new Promise(resolve => {
        order.push('login dispatched')
        releaseLogin = () => { order.push('login cookie applied'); resolve() }
    }))
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(order, ['refresh dispatched'])
    releaseRefresh()
    await pending
    await new Promise(resolve => setImmediate(resolve))
    assert.deepEqual(order, ['refresh dispatched', 'refresh cookie applied', 'login dispatched'])
    const subsequent = client.refreshSession()
    await new Promise(resolve => setImmediate(resolve))
    assert.equal(order.filter(item => item === 'refresh dispatched').length, 1)
    releaseLogin()
    await login
    await new Promise(resolve => setImmediate(resolve))
    releaseRefresh()
    await subsequent
    assert.deepEqual(order.slice(2), ['login dispatched', 'login cookie applied', 'refresh dispatched', 'refresh cookie applied'])
})

test('late second 401 cannot clear the session of a newly logged in user', async () => {
    let releaseRetry
    let protectedCalls = 0
    const client = setup(call => {
        if (call.path.endsWith('/auth/refresh')) return json({ access_token: 'fresh' })
        if (++protectedCalls === 1) return json({}, 401)
        return new Promise(resolve => { releaseRetry = () => resolve(json({}, 401)) })
    })
    const pending = client.api('/users/me')
    await new Promise(resolve => setImmediate(resolve))
    client.replace('user-b')
    releaseRetry()
    await assert.rejects(pending)
    assert.equal(client.token(), 'user-b')
    assert.equal(client.clears(), 0)
    assert.equal(client.calls.length, 3)
})

test('identity changed by another refresh waiter cannot inherit an in-flight mutation retry', async () => {
    let release
    const client = setup(call => {
        if (call.path.endsWith('/auth/refresh')) return new Promise(resolve => { release = () => resolve(json({ access_token: 'user-a-fresh' })) })
        if (call.authorization === 'Bearer user-b') return json({ message: 'must never execute' }, 201)
        return json({}, 401)
    })
    const rotation = client.refreshSession()
    rotation.then(() => client.replace('user-b'))
    const mutation = client.api('/admin/bus/', { method: 'POST', body: { capacity: 30 } })
    await new Promise(resolve => setImmediate(resolve))
    release()
    await rotation
    await assert.rejects(mutation)
    assert.equal(client.calls.length, 2)
    assert.equal(client.token(), 'user-b')
    assert.equal(client.clears(), 0)
})
