import type { LoginRequestDto, LoginResponseDto, RegisterRequestDto } from '../types/dto/auth.dto'
import type { User } from '../types/domain/user'
import type { ApiClient } from './transport.api'

type SessionTransition = <T>(operation: () => Promise<T>) => Promise<T>
export function createAuthApi(api: ApiClient, refresh?: () => Promise<void>, transition?: SessionTransition) {
    const run: SessionTransition = transition ?? (operation => operation())
    return {
        login: (body: LoginRequestDto) => run(() => api<LoginResponseDto>('/auth/login', { method: 'POST', body })),
        register: (body: RegisterRequestDto) => run(() => api<LoginResponseDto>('/auth/register', { method: 'POST', body })),
        me: () => api<User>('/users/me'),
        refresh: async () => {
            if (refresh) return refresh()
            return api<LoginResponseDto>('/auth/refresh', { method: 'POST' })
        },
        logout: () => run(() => api<{ message: string }>('/auth/logout', { method: 'POST' })),
        logoutAll: async () => {
            // Recover an expired access token before taking the cookie-write queue.
            // The queued mutation cannot recursively refresh behind its own lock.
            if (transition) await api<User>('/users/me')
            return run(() => api<{ message: string }>('/auth/logout/all', { method: 'POST', ...(transition ? { retry: 0 } : {}) }))
        },
    }
}

// Resolve Nuxt dependencies at call time: stores can import this module safely.
function currentAuthApi() {
    const app = useNuxtApp()
    return createAuthApi(app.$api, app.$refreshSession, app.$runSessionTransition)
}
export const authApi = {
    login: (dto: LoginRequestDto) => currentAuthApi().login(dto),
    register: (dto: RegisterRequestDto) => currentAuthApi().register(dto),
    me: () => currentAuthApi().me(),
    refresh: () => useNuxtApp().$refreshSession(),
    logout: () => currentAuthApi().logout(),
    logoutAll: () => currentAuthApi().logoutAll(),
}
