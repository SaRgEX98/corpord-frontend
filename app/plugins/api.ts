import { useAuthStore } from '~/store/auth'
import { createSessionRefresh } from '~/utils/session-refresh'
import type { LoginResponseDto } from '~/types/dto/auth.dto'

export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig()
    const auth = useAuthStore()
    const refreshSession = createSessionRefresh(
        () => $fetch<LoginResponseDto>('/auth/refresh', {
            baseURL: config.public.apiBase,
            method: 'POST',
            credentials: 'include',
            retry: 0,
        }),
        token => { auth.token = token },
    )

    const api = $fetch.create({
        baseURL: config.public.apiBase,
        credentials: 'include',
        retry: 1,
        retryStatusCodes: [401],

        onRequest({ options }) {
            options.headers = new Headers(options.headers)
            if (auth.token) options.headers.set('Authorization', `Bearer ${auth.token}`)
            else options.headers.delete('Authorization')
        },

        async onResponseError({ request, response, options }) {
            if (response.status !== 401) return
            const path = typeof request === 'string'
                ? new URL(request, 'http://api.local').pathname
                : new URL(request.url).pathname
            // Login/refresh failures must reach their caller without recursive refresh.
            if (/\/auth\/(login|register|refresh|logout)(\/|$)/.test(path)) {
                options.retry = 0
                return
            }
            if (options.retry) {
                try {
                    await refreshSession()
                    return // ofetch retries once; onRequest attaches the fresh token.
                } catch {
                    options.retry = 0
                }
            }
            auth.$reset()
            await nuxtApp.runWithContext(() => navigateTo('/login'))
        },
    })

    return { provide: { api } }
})
