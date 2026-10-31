import { z } from "zod";
export const passwordSchema = z
  .string()
  .min(1, "Введите пароль")
  .refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Пароль должен занимать не более 72 байт UTF-8",
  );
export const LoginSchema = z.object({
  email: z.string().trim().email("Введите корректный email"),
  password: passwordSchema,
});
export const RegisterSchema = z.object({
  name: z.string().trim().min(1, "Введите имя"),
  email: z.string().trim().email("Введите корректный email"),
  password: passwordSchema,
});
export type LoginDto = z.infer<typeof LoginSchema>;
