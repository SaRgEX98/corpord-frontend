import { grafanaState } from '#server/utils/grafanaState'

export const getState = () => grafanaState

export const updateState = (instance: string, data: any) => {
    grafanaState[instance] = data
}

export default defineEventHandler(() => {
    return Object.values(grafanaState)
})