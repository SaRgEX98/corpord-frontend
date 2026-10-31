import type { $Fetch } from 'ofetch'

declare module '#app' {
    interface NuxtApp {
        $api: $Fetch
        $refreshSession: () => Promise<void>
    }
}

declare module 'vue' {
    interface ComponentCustomProperties {
        $api: $Fetch
        $refreshSession: () => Promise<void>
    }
}
