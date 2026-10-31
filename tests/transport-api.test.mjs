import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { createTransportApi } from '../app/api/transport.api.ts'
import { createAuthApi } from '../app/api/auth.api.ts'
import { apiErrorMessage } from '../app/utils/api-errors.ts'

const contract = JSON.parse(await readFile(new URL('./fixtures/backend-contract.json', import.meta.url)))

test('typed API covers every JSON operation in backend contract; SSO uses browser navigation', async () => {
    const calls = []
    const api = async (path, options = {}) => {
        calls.push({ path, ...options })
        if (options.method === 'DELETE') return undefined
        if (path === '/trips/all') return []
        if (path === '/trips/1') return { id: 1, stops: [] }
        return []
    }
    const transport = createTransportApi(api)
    for (const key of ['buses', 'busCategories', 'busStatuses', 'drivers', 'driverStatuses', 'stops', 'trips', 'tripStops', 'users', 'legacyUsers']) {
        const resource = transport[key]
        await resource.list()
        await resource.get(1)
        await resource.create({ name: 'Тест' })
        if (resource.update) await resource.update(1, { name: 'Изменено' })
        await resource.remove(1)
    }
    await transport.trips.all()
    const auth = createAuthApi(api)
    await auth.login({ email: 'test@example.invalid', password: 'test-only' })
    await auth.register({ email: 'test@example.invalid', password: 'test-only', name: 'Тест' })
    await auth.refresh()
    await auth.logout()
    await auth.logoutAll()
    await auth.me()
    const actual = calls.map(call => `${call.method ?? 'GET'} ${call.path.replace(/\/1$/, '/{id}')}`).sort()
    const expected = contract.operations.filter(operation => !operation.includes('{provider}')).sort()
    assert.deepEqual(actual, expected)
    assert.equal(new Set(actual).size, actual.length)
    assert.equal(contract.operations.length, 58)
})

test('all collections normalize Go null slices; compact and detailed trip shapes stay distinct', async () => {
    const transport = createTransportApi(async () => null)
    for (const resource of Object.values(transport)) assert.deepEqual(await resource.list(), [])
    assert.deepEqual(await transport.trips.all(), [])
    const summary = { trip_id: 9, brand: 'ПАЗ', start_stop: 'Центр', end_stop: 'Парк' }
    const detail = { id: 9, bus: { id: 2 }, driver: { id: 3 }, stops: null, end_time: null }
    const trips = createTransportApi(async path => path === '/trips/' ? [summary] : path === '/trips/all' ? [detail] : detail).trips
    assert.deepEqual(await trips.list(), [summary])
    assert.deepEqual(await trips.get(9), { ...detail, stops: [] })
    assert.deepEqual(await trips.all(), [{ ...detail, stops: [] }])
})

test('writes send relation IDs and partial zero values without rewriting response names', async () => {
    const calls = []
    const api = createTransportApi(async (path, options) => { calls.push({ path, ...options }); return { message: 'updated' } })
    await api.buses.create({ license_plate: 'TEST', brand: 'ПАЗ', capacity: 24, category_id: 3, status_id: 4 })
    await api.stops.update(8, { latitude: 0, longitude: 0 })
    await api.trips.update(2, { base_price: 0 })
    await api.tripStops.update(3, { price_to_next: 0 })
    assert.equal(calls[0].path, '/admin/bus/')
    assert.equal(calls[0].body.category_id, 3)
    assert.deepEqual(calls[1], { path: '/admin/stops/8', method: 'PUT', body: { latitude: 0, longitude: 0 } })
    assert.deepEqual(calls[2].body, { base_price: 0 })
    assert.deepEqual(calls[3].body, { price_to_next: 0 })
    assert.throws(() => api.buses.get(-1), /идентификатор/)
    assert.throws(() => api.users.remove(1.5), /идентификатор/)
    assert.equal('update' in api.legacyUsers, false)
})

test('API errors expose domain messages and hide server internals', () => {
    assert.equal(apiErrorMessage({ statusCode: 409, data: { error: 'Запись уже существует' } }), 'Запись уже существует')
    assert.match(apiErrorMessage({ status: 403 }), /администратора/)
    assert.match(apiErrorMessage({ status: 500, data: { error: 'SQL/password internals' } }), /временно недоступен/)
    assert.doesNotMatch(apiErrorMessage(new Error('GET https://secret-host')), /secret-host/)
})
