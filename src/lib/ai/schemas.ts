import { z } from "zod";

export const obligationSchema = z.enum([
    "MANDATORY",
    "OPTIONAL",
    "UNCLEAR",
]);

export const extractedRequirementSchema = z.object({
    category: z.string().min(1).max(80),
    text: z.string().min(1).max(500),
    obligation: obligationSchema,
    page_number: z.number().int().min(1),
    quote: z.string().min(10).max(400),
});

export const extractionResponseSchema = z.object({
    requirements: z.array(extractedRequirementSchema).max(100),
});

export type ExtractedRequirement = z.infer<
    typeof extractedRequirementSchema
>;

export type ExtractionResponse = z.infer<
    typeof extractionResponseSchema
>;