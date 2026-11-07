import { z } from "zod";

export const draftSectionKeySchema = z.enum([
    "executive_summary",
    "understanding",
    "technical_approach",
    "compliance_response",
    "company_information",
]);

export const draftSectionOutputSchema = z.object({
    key: draftSectionKeySchema,
    content: z.string().trim().min(1).max(12000),
});

const draftContentSchema = z
    .string()
    .trim()
    .min(1)
    .max(12000);

export const draftSectionsArrayResponseSchema = z.object({
    sections: z.array(draftSectionOutputSchema).length(5),
});

export const draftFlatResponseSchema = z.object({
    executive_summary: draftContentSchema,
    understanding: draftContentSchema,
    technical_approach: draftContentSchema,
    compliance_response: draftContentSchema,
    company_information: draftContentSchema,
});

export const draftGenerationResponseSchema = z.union([
    draftSectionsArrayResponseSchema,
    draftFlatResponseSchema,
]);

export type DraftSectionKey = z.infer<
    typeof draftSectionKeySchema
>;

export type DraftSectionOutput = z.infer<
    typeof draftSectionOutputSchema
>;

export type DraftGenerationResponse = z.infer<
    typeof draftGenerationResponseSchema
>;