export default defineNuxtRouteMiddleware(async () => {
    const { error } = await useFetch('/api/v1/me', {
        credentials: 'include',
    })

    if (error.value) {
        return navigateTo('/login')
    }

    return navigateTo('/me/profile')
})
