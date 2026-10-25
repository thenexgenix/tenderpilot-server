import { z } from "zod";

export const registerSchema = z.object({
    name: z.string().trim().min(1, "Name is required."),
    email: z
        .string()
        .trim()
        .email("Enter a valid email address.")
        .transform((value) => value.toLowerCase()),
    password: z
        .string()
        .min(10, "Password must be at least 10 characters long."),
});

export type RegisterInput = z.infer<typeof registerSchema>;