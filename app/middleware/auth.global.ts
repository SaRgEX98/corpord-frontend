import {useAuthStore} from "~/store/auth";

export default defineNuxtRouteMiddleware(async () => {
    const auth = useAuthStore();
    if (auth.initialized) return

    try {
        await auth.refresh()
    } catch {
        auth.$reset()
    }
})