import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Введите корректный email").max(255),
  password: z.string().min(8, "Пароль должен быть не короче 8 символов").max(128)
});

export type LoginInput = z.infer<typeof loginSchema>;
