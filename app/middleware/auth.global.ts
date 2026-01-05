import { useAuthStore } from '~/store/auth'

export default defineNuxtRouteMiddleware(async (to) => {
    const auth = useAuthStore()

    // Пути public — не проверяем
    if (to.meta.public) return

    // Пример: все маршруты начинаются с /me/ — требуют авторизации
    if (to.path.startsWith('/me')) {
        // Если store ещё не инициализирован, пробуем сделать refresh/fetchMe
        if (!auth.initialized) {
            try {
                await auth.refresh() // или fetchMe, если refresh недоступен
            } catch {
                auth.$reset()
                return navigateTo('/login')
            }
        }

        // Если пользователь не авторизован
        if (!auth.isAuthenticated) {
            return navigateTo('/login')
        }
    }
})
