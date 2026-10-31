import { useAuthStore } from '~/store/auth'

export default defineNuxtRouteMiddleware(async () => {
    const auth = useAuthStore()
    try {
        // The backend callback stores only the HttpOnly refresh cookie.
        await auth.refresh()
    } catch {
        auth.$reset()
        return navigateTo('/login')
    }
    return navigateTo('/me/profile')
})
