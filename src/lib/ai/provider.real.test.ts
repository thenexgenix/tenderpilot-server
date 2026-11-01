import "dotenv/config";
import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { createAiProvider } from "./provider";
import { extractionResponseSchema, type ExtractionResponse, } from "./schemas";

const system = [
    "You extract tender requirements from the supplied document text.",
    "Return only one JSON object.",
    "The JSON must have exactly this shape:",
    '{"requirements":[{"category":"string","text":"string","obligation":"MANDATORY","page_number":1,"quote":"exact page text"}]}',
    "category must be a short string.",
    "text must be a short English description.",
    "obligation must be exactly MANDATORY, OPTIONAL, or UNCLEAR.",
    "page_number must be an integer.",
    "quote must be copied exactly from the supplied page text.",
    "The quote must contain at least 10 characters.",
    "Do not invent requirements.",
].join(" ");

const user = `
<document_text page="1">
The bidder shall submit a signed technical proposal and a valid trade license.
</document_text>
`;

const realCallEnabled = process.env.RUN_REAL_AI_TEST === "1";

(realCallEnabled ? describe : describe.skip)(
    "real Gemini provider",
    () => {
        it("returns schema-validated structured JSON", async () => {
            const provider = createAiProvider();

            const result =
                await provider.generateJson<ExtractionResponse>({
                    system,
                    user,
                    schema: extractionResponseSchema,
                });

            expect(Array.isArray(result.requirements)).toBe(true);
            expect(result.requirements.length).toBeGreaterThan(0);

            for (const requirement of result.requirements) {
                expect(requirement.category.length).toBeGreaterThan(0);
                expect(requirement.text.length).toBeGreaterThan(0);
                expect(requirement.page_number).toBe(1);
                expect(requirement.quote.length).toBeGreaterThanOrEqual(10);
            }

            console.log(
                `Real Gemini call succeeded with ${result.requirements.length} requirement(s).`,
            );
        });
    },
);