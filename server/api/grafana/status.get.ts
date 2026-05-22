let state: Record<string, any> = {}

export const getState = () => state

export const updateState = (instance: string, data: any) => {
    state[instance] = data
}

export default defineEventHandler(() => {
    return Object.values(state)
})