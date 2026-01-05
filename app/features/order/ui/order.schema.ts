import { z } from 'zod'

export const OrderSchema = z.object({

    password: z
        .string()
        .nonempty({ message: 'Пароль обязателен' })
        .min(8, { message: 'Пароль должен быть минимум 8 символов' })
        .trim(),

})