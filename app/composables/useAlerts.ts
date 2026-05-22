// composables/useAlerts.ts

export const useAlerts = () => {
    const alerts = ref<any[]>([])

    const fetchAlerts = async () => {
        const { data } = await useFetch('/api/grafana/status')
        if (data.value) {
            alerts.value = data.value as any[]
        }
    }

    return {
        alerts,
        fetchAlerts,
    }
}