import { grafanaState } from '#server/utils/grafanaState'

function parseGoroutines(alert: any) {
    return {
        value: Number(alert.values?.A ?? 0),
        threshold: Number(alert.values?.C ?? 0),
    }
}

export default defineEventHandler(async (event) => {
    const body = await readBody(event)

    for (const alert of body.alerts || []) {
        const instance = alert.labels?.instance || 'unknown'

        const { value, threshold } = parseGoroutines(alert)

        grafanaState[instance] = {
            instance,
            alertname: alert.labels?.alertname,
            status: alert.status === 'firing' ? 'alerting' : 'ok',
            value,
            threshold,
            updatedAt: Date.now(),
        }
    }

    return { ok: true }
})