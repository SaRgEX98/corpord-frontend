import type { $Fetch } from 'ofetch'
import { createSessionRefresh } from '../utils/session-refresh.ts'
import type { LoginResponseDto } from '../types/dto/auth.dto'

interface SessionAccess {
    getToken(): string | null
    setToken(token: string): void
    clearSession(): void
}

/** One refresh rotation is shared by initialization, explicit refresh and 401 retries. */
export function createSessionClient(fetch: $Fetch, baseURL: string, session: SessionAccess) {
    const refreshSession = createSessionRefresh(
        () => fetch<LoginResponseDto>('/auth/refresh', {
            baseURL, method: 'POST', credentials: 'include', retry: 0,
        }),
        token => session.setToken(token),
    )
    const api = fetch.create({
        baseURL,
        credentials: 'include',
        // A rejected auth check has not executed the mutation. Other failures are
        // never retried: a 5xx/network error can follow a committed write.
        retry: 1,
        retryStatusCodes: [401],
        onRequest({ options }) {
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
            if (options.retry) {
                // A late 401 from the old token can arrive after another request
                // completed rotation. Retry with the current token directly.
                const sentToken = new Headers(options.headers).get('Authorization')
                const current = session.getToken()
                if (current && sentToken !== `Bearer ${current}`) return
                try {
                    await refreshSession()
                    return
                } catch {
                    options.retry = 0
                }
            }
            session.clearSession()
        },
    })
    return { api, refreshSession }
}
