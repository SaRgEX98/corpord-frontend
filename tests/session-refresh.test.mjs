import assert from 'node:assert/strict'
import test from 'node:test'
import { createSessionRefresh } from '../app/utils/session-refresh.ts'

test('concurrent protected requests share one refresh rotation', async () => {
    let calls = 0
    let release
    let token
    const refresh = createSessionRefresh(() => {
        calls++
        return new Promise(resolve => { release = resolve })
    }, value => { token = value })
    const first = refresh()
    const second = refresh()
    assert.equal(calls, 1)
    release({ access_token: 'new-token' })
    await Promise.all([first, second])
    assert.equal(token, 'new-token')
})

test('failed refresh reaches all waiters and permits a later attempt', async () => {
    let calls = 0
    const refresh = createSessionRefresh(async () => {
        if (++calls === 1) throw new Error('expired refresh')
        return { access_token: 'next-session' }
    }, () => {})
    const results = await Promise.allSettled([refresh(), refresh()])
    assert.ok(results.every(result => result.status === 'rejected'))
    assert.equal(calls, 1)
    await refresh()
    assert.equal(calls, 2)
})
