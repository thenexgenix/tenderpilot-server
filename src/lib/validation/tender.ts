import { z } from "zod";

const optionalText = (maxLength: number) =>
    z.string().trim().max(maxLength).optional().or(z.literal(""));

export const createTenderSchema = z.object({
    title: z.string().trim().min(3).max(200),
    issuerName: z.string().trim().min(1).max(200),
    reference: optionalText(100),
    deadlineAt: z
        .string()
        .optional()
        .or(z.literal(""))
        .refine(
            (value) => !value || !Number.isNaN(Date.parse(value)),
            "Deadline must be a valid date.",
        ),
    notes: optionalText(5000),
});

export type CreateTenderInput = z.infer<typeof createTenderSchema>;