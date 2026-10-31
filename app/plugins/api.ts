import { ofetch } from 'ofetch'
import { useAuthStore } from '~/store/auth'
import { createSessionClient } from '~/api/session-client'

export default defineNuxtPlugin(() => {
    const config = useRuntimeConfig()
    const auth = useAuthStore()
    const { api, refreshSession } = createSessionClient(ofetch, config.public.apiBase, {
        getToken: () => auth.token,
        setToken: token => { auth.token = token },
        clearSession: () => auth.clearSession(),
    })
    return { provide: { api, refreshSession } }
})
