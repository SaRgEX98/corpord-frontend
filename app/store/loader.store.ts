interface ILoaderStore {
    state: boolean
}

const defaultValue: ILoaderStore = {
    state: true
}

export const useLoaderStore = defineStore('loader', {
    state: () => defaultValue,
    actions: {
        set(data: boolean) {
            this.$patch({state: data})
        }
    }
})
