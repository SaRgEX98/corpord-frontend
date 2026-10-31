import type { LoginRequestDto, LoginResponseDto, RegisterRequestDto } from '../types/dto/auth.dto'
import type { User } from '../types/domain/user'
import type { ApiClient } from './transport.api'

export function createAuthApi(api: ApiClient, refresh?: () => Promise<void>) {
    return {
        login: (body: LoginRequestDto) => api<LoginResponseDto>('/auth/login', { method: 'POST', body }),
        register: (body: RegisterRequestDto) => api<LoginResponseDto>('/auth/register', { method: 'POST', body }),
        me: () => api<User>('/users/me'),
        refresh: async () => {
            if (refresh) return refresh()
            return api<LoginResponseDto>('/auth/refresh', { method: 'POST' })
        },
        logout: () => api<{ message: string }>('/auth/logout', { method: 'POST' }),
        logoutAll: () => api<{ message: string }>('/auth/logout/all', { method: 'POST' }),
    }
}

// Resolve Nuxt dependencies at call time: stores can import this module safely.
export const authApi = {
    login: (dto: LoginRequestDto) => createAuthApi(useNuxtApp().$api).login(dto),
    register: (dto: RegisterRequestDto) => createAuthApi(useNuxtApp().$api).register(dto),
    me: () => createAuthApi(useNuxtApp().$api).me(),
    refresh: () => useNuxtApp().$refreshSession(),
    logout: () => createAuthApi(useNuxtApp().$api).logout(),
    logoutAll: () => createAuthApi(useNuxtApp().$api).logoutAll(),
}
