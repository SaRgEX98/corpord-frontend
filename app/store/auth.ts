// app/stores/auth.ts
import type {LoginRequestDto} from "~/types/dto/auth.dto";
import {authApi} from "~/api/auth.api";
import type {User} from "~/types/domain/user";

export const useAuthStore = defineStore('auth', {
    state: () => ({
        token: null as string | null,
        user: null as User | null,
        initialized: false,
    }),
    getters: {
        isAuthenticated: (state) => !!state.token,
    },
    actions: {
        async login(dto: LoginRequestDto) {
            const res = await authApi.login(dto);
            this.token = res.access_token
            await this.fetchMe();
        },

        async fetchMe() {
            if (!this.token) {
                this.initialized = true;
                return
            }
            this.user = await authApi.me();
            this.initialized = true
        },

        async loginWithGoogle() {
            const config = useRuntimeConfig()
            window.location.href = `${config.public.apiBase}/auth/google`
        },

        async loginWithYandex() {
            const config = useRuntimeConfig()
            window.location.href = `${config.public.apiBase}/auth/google`
        },

        async refresh() {
            const res = await authApi.refresh()
            this.token = res.access_token
            await this.fetchMe()
        },

        async logout() {
            await authApi.logout()
            this.$reset()
        },
    },
})
