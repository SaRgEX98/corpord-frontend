import type { $Fetch } from 'ofetch'
import { createSessionRefresh } from '../utils/session-refresh.ts'
import type { LoginResponseDto } from '../types/dto/auth.dto'

interface SessionAccess {
    getToken(): string | null
    getVersion(): number
    setToken(token: string): void
    clearSession(): void
}

/** One refresh rotation is shared by initialization, explicit refresh and 401 retries. */
export function createSessionClient(fetch: $Fetch, baseURL: string, session: SessionAccess) {
    let cookieQueue: Promise<unknown> = Promise.resolve()
    function runSessionTransition<T>(operation: () => Promise<T>): Promise<T> {
        const result = cookieQueue.then(operation, operation)
        cookieQueue = result.then(() => undefined, () => undefined)
        return result
    }
    let refreshVersion: number | undefined
    let rotate: ReturnType<typeof createSessionRefresh>
    function refreshSession() {
        const version = session.getVersion()
        if (refreshVersion !== version) {
            refreshVersion = version
            rotate = createSessionRefresh(async () => {
                const result = await runSessionTransition(() => fetch<LoginResponseDto>('/auth/refresh', {
                    baseURL, method: 'POST', credentials: 'include', retry: 0,
                }))
                if (version !== session.getVersion()) throw new Error('Сессия изменилась. Повторите действие.')
                return result
            }, token => session.setToken(token))
        }
        return rotate()
    }
    const requestVersions = new WeakMap<object, number>()
    const api = fetch.create({
        baseURL,
        credentials: 'include',
        // A rejected auth check has not executed the mutation. Other failures are
        // never retried: a 5xx/network error can follow a committed write.
        retry: 1,
        retryStatusCodes: [401],
        onRequest({ options }) {
            requestVersions.set(options, session.getVersion())
            options.headers = new Headers(options.headers)
            const token = session.getToken()
            if (token) options.headers.set('Authorization', `Bearer ${token}`)
            else options.headers.delete('Authorization')
        },
        async onResponseError({ request, response, options }) {
            if (response.status !== 401) return
            const path = typeof request === 'string'
                ? new URL(request, 'http://api.local').pathname
                : new URL(request.url).pathname
            if (/\/auth\/(login|register|refresh|logout)\/?$/.test(path)) {
                options.retry = 0
                return
            }
            const version = requestVersions.get(options)
            // Never retry an old user's operation under a new identity, or clear
            // that new session because an old request finished late.
            if (version !== session.getVersion()) { options.retry = 0; return }
            const sentToken = new Headers(options.headers).get('Authorization')
            const current = session.getToken()
            if (current && sentToken !== `Bearer ${current}`) return
            if (options.retry) {
                try {
                    await refreshSession()
                    return
                } catch {
                    options.retry = 0
                }
            }
            if (version === session.getVersion()) session.clearSession()
        },
    })
    return { api, refreshSession, runSessionTransition }
}
