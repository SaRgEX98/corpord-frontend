import { useAuthStore } from '~/store/auth'

export function useAuth() {
    const store = useAuthStore()
    return {
        user: computed(() => store.user),
        isAuthenticated: computed(() => store.isAuthenticated),
        isAdmin: computed(() => store.isAdmin),
        initialized: computed(() => store.initialized),
        login: store.login,
        register: store.register,
        fetchMe: store.fetchMe,
        loginWithGoogle: store.loginWithGoogle,
        loginWithYandex: store.loginWithYandex,
        refresh: store.refresh,
        ensureSession: store.ensureSession,
        initSession: store.initSession,
        logout: store.logout,
        logoutAll: store.logoutAll,
    }
}
