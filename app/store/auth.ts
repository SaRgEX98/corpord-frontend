import type { LoginRequestDto, RegisterRequestDto } from '~/types/dto/auth.dto'
import { authApi } from '~/api/auth.api'
import type { User } from '~/types/domain/user'

// Promises stay outside serializable Pinia state and are scoped to each identity.
interface PendingSession { version: number; promise: Promise<void> }
const authentication = new WeakMap<object, PendingSession>()
const initialization = new WeakMap<object, PendingSession>()
const profiles = new WeakMap<object, PendingSession>()

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: null as string | null,
        user: null as User | null,
        initialized: false,
        sessionVersion: 0,
    }),
    getters: {
        isAuthenticated: state => !!state.token && !!state.user,
        isAdmin: state => !!state.token && state.user?.role === 'admin',
    },
    actions: {
        clearSession() {
            this.sessionVersion++
            this.token = null
            this.user = null
            this.initialized = true
        },
        async authenticate(dto: LoginRequestDto | RegisterRequestDto, register = false) {
            this.clearSession()
            this.initialized = false
            const version = this.sessionVersion
            const promise = (async () => {
                try {
                    const res = register ? await authApi.register(dto as RegisterRequestDto) : await authApi.login(dto)
                    if (version !== this.sessionVersion) throw new Error('Сессия изменилась. Повторите вход.')
                    this.token = res.access_token
                    await this.fetchMe()
                } catch (error) {
                    if (version === this.sessionVersion) this.clearSession()
                    throw error
                }
            })()
            authentication.set(this, { version, promise })
            try { await promise } finally {
                if (authentication.get(this)?.version === version) authentication.delete(this)
            }
        },
        async login(dto: LoginRequestDto) { return this.authenticate(dto) },
        async register(dto: RegisterRequestDto) { return this.authenticate(dto, true) },
        async fetchMe() {
            if (!this.token) return
            const version = this.sessionVersion
            let pending = profiles.get(this)
            if (pending?.version !== version) {
                const promise = authApi.me().then(user => {
                    if (version !== this.sessionVersion) return
                    this.user = user
                    this.initialized = true
                }).finally(() => {
                    if (profiles.get(this)?.version === version) profiles.delete(this)
                })
                pending = { version, promise }
                profiles.set(this, pending)
            }
            return pending.promise
        },
        loginWithGoogle() {
            window.location.href = `${useRuntimeConfig().public.apiBase}/auth/google`
        },
        loginWithYandex() {
            window.location.href = `${useRuntimeConfig().public.apiBase}/auth/yandex`
        },
        async refresh() {
            const version = this.sessionVersion
            try {
                await authApi.refresh()
                if (version !== this.sessionVersion) return
                await this.fetchMe()
            } catch (error) {
                if (version === this.sessionVersion) this.clearSession()
                throw error
            }
        },
        async ensureSession() {
            const login = authentication.get(this)
            if (login?.version === this.sessionVersion) {
                await login.promise.catch(() => {})
                return
            }
            if (this.initialized) return
            const version = this.sessionVersion
            let pending = initialization.get(this)
            if (pending?.version !== version) {
                const promise = (this.token ? this.fetchMe() : this.refresh())
                    .catch(() => { if (version === this.sessionVersion) this.clearSession() })
                    .finally(() => {
                        if (initialization.get(this)?.version === version) initialization.delete(this)
                    })
                pending = { version, promise }
                initialization.set(this, pending)
            }
            return pending.promise
        },
        async initSession() { return this.ensureSession() },
        async logout() {
            this.clearSession()
            const version = this.sessionVersion
            try { await authApi.logout() } finally {
                if (version === this.sessionVersion) this.clearSession()
            }
        },
        async logoutAll() {
            const version = this.sessionVersion
            // Keep the current session if the server could not revoke others.
            await authApi.logoutAll()
            if (version === this.sessionVersion) this.clearSession()
        },
    },
})
