import { createTransportApi } from '~/api/transport.api'

export function useTransportApi() {
    return createTransportApi(useNuxtApp().$api)
}
