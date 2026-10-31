import type { LoginRequestDto, RegisterRequestDto } from '~/types/dto/auth.dto'
import { authApi } from '~/api/auth.api'
import type { User } from '~/types/domain/user'

// Promises stay outside serializable Pinia state and are scoped to each store.
const initialization = new WeakMap<object, Promise<void>>()
const profiles = new WeakMap<object, Promise<void>>()

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: null as string | null,
        user: null as User | null,
        initialized: false,
    }),
    getters: {
        isAuthenticated: state => !!state.token && !!state.user,
        isAdmin: state => !!state.token && state.user?.role === 'admin',
    },
    actions: {
        clearSession() {
            this.token = null
            this.user = null
            this.initialized = true
        },
        async login(dto: LoginRequestDto) {
            const res = await authApi.login(dto)
            this.token = res.access_token
            try { await this.fetchMe() } catch (error) { this.clearSession(); throw error }
        },
        async register(dto: RegisterRequestDto) {
            const res = await authApi.register(dto)
            this.token = res.access_token
            try { await this.fetchMe() } catch (error) { this.clearSession(); throw error }
        },
        async fetchMe() {
            if (!this.token) return
            let pending = profiles.get(this)
            if (!pending) {
                pending = authApi.me().then(user => {
                    this.user = user
                    this.initialized = true
                }).finally(() => { profiles.delete(this) })
                profiles.set(this, pending)
            }
            return pending
        },
        loginWithGoogle() {
            window.location.href = `${useRuntimeConfig().public.apiBase}/auth/google`
        },
        loginWithYandex() {
            window.location.href = `${useRuntimeConfig().public.apiBase}/auth/yandex`
        },
        async refresh() {
            try {
                await authApi.refresh()
                await this.fetchMe()
            } catch (error) {
                this.clearSession()
                throw error
            }
        },
        async ensureSession() {
            if (this.initialized) return
            let pending = initialization.get(this)
            if (!pending) {
                pending = (this.token ? this.fetchMe() : this.refresh())
                    .catch(() => { this.clearSession() })
                    .finally(() => { initialization.delete(this) })
                initialization.set(this, pending)
            }
            return pending
        },
        async initSession() { return this.ensureSession() },
        async logout() {
            try { await authApi.logout() } finally { this.clearSession() }
        },
        async logoutAll() {
            // Keep the current session if the server could not revoke others.
            await authApi.logoutAll()
            this.clearSession()
        },
    },
})
