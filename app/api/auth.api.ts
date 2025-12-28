import type {
    LoginRequestDto,
    LoginResponseDto,
} from '~/types/dto/auth.dto'
import type {User} from "~/types/domain/user";

export const authApi = {
    async login(dto: LoginRequestDto) {
        const { $api } = useNuxtApp()

        return $api<LoginResponseDto>('/auth/login', {
            method: 'POST',
            body: dto,
        })
    },

    async me(): Promise<User> {
        const { $api } = useNuxtApp()
        return $api<User>('users/me')
    },
    async refresh() {
        const { $api } = useNuxtApp()
        return $api<LoginResponseDto>('/auth/refresh', { method: 'POST' })
    },
    async logout() {
        const { $api } = useNuxtApp()
        return $api('/auth/logout', { method: 'POST' })
    },
}
