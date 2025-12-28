import { z } from 'zod'

export const LoginSchema = z.object({
    email: z
        .string({message: 'Введите корректный email'})
        .email()
        .trim()
        .toLowerCase()
        .nonempty({message: 'Email обязателен'}),

    password: z
        .string()
        .nonempty({ message: 'Пароль обязателен' })
        .min(8, { message: 'Пароль должен быть минимум 8 символов' })
        .trim(),

})

export type LoginDto = z.infer<typeof LoginSchema>
