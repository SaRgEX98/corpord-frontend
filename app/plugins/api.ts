import {useAuthStore} from "~/store/auth";

export default defineNuxtPlugin((nuxtApp) => {
    const config = useRuntimeConfig()
    const auth = useAuthStore()

    const api = $fetch.create({
        baseURL: config.public.apiBase,
        credentials: 'include',

        onRequest({ options }) {
            if (auth.token) {
                options.headers = new Headers(options.headers)
                options.headers.set('Authorization', `Bearer ${auth.token}`)
            }
        },

        onResponseError({ response }) {
            if (response.status === 401) {
                auth.$reset()
                navigateTo('/login')
            }
        },
    })

    nuxtApp.provide('api', api)
})
