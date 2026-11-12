import { z } from "zod";

export const obligationSchema = z.preprocess(
    (value) => {
        if (typeof value === "boolean") {
            return value ? "MANDATORY" : "OPTIONAL";
        }

        if (typeof value !== "string") {
            return "UNCLEAR";
        }

        const normalized = value
            .trim()
            .toUpperCase()
            .replace(/[\s-]+/g, "_");

        if (
            [
                "MANDATORY",
                "REQUIRED",
                "COMPULSORY",
                "MUST",
                "YES",
            ].includes(normalized)
        ) {
            return "MANDATORY";
        }

        if (
            [
                "OPTIONAL",
                "OPTION",
                "MAY",
                "NOT_REQUIRED",
                "NOT_MANDATORY",
                "NO",
            ].includes(normalized)
        ) {
            return "OPTIONAL";
        }

        if (
            [
                "UNCLEAR",
                "UNKNOWN",
                "NOT_SPECIFIED",
                "INFORMATIONAL",
                "N_A",
                "NA",
            ].includes(normalized)
        ) {
            return "UNCLEAR";
        }

        return "UNCLEAR";
    },
    z.enum(["MANDATORY", "OPTIONAL", "UNCLEAR"]),
);

export const extractedRequirementSchema = z.object({
    category: z.string().min(1).max(80),
    text: z.string().min(1).max(500),
    obligation: obligationSchema,
    page_number: z.preprocess(
        (value) =>
            typeof value === "string"
                ? Number(value)
                : value,
        z.number().int().min(1),
    ),
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