import {useAuthStore} from "~/store/auth";

export function useAuth() {
    const store = useAuthStore()

    return {
        user: computed(() => store.user),
        isAuthenticated: computed(() => store.isAuthenticated),
        login: store.login,
        fetchMe: store.fetchMe,
        loginWithGoogle: store.loginWithGoogle,
        loginWithYandex: store.loginWithYandex,
        refresh: store.refresh,
        logout: store.logout,
    }
}
