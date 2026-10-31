import type { $Fetch } from 'ofetch'

declare module '#app' {
    interface NuxtApp {
        $api: $Fetch
        $refreshSession: () => Promise<void>
        $runSessionTransition: <T>(operation: () => Promise<T>) => Promise<T>
    }
}

declare module 'vue' {
    interface ComponentCustomProperties {
        $api: $Fetch
        $refreshSession: () => Promise<void>
        $runSessionTransition: <T>(operation: () => Promise<T>) => Promise<T>
    }
}
