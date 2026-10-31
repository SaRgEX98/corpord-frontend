// Protected requests share a single rotation because each refresh token is single-use.
export function createSessionRefresh(
    refresh: () => Promise<{ access_token: string }>,
    setToken: (token: string) => void,
) {
    let pending: Promise<void> | null = null
    return () => {
        if (!pending) {
            pending = refresh()
                .then(result => { setToken(result.access_token) })
                .finally(() => { pending = null })
        }
        return pending
    }
}
