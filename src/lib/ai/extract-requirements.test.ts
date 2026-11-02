import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
    AiProviderError,
    type AiProvider,
    type GenerateJsonRequest,
} from "./provider";
import {
    extractRequirementsFromChunk,
} from "./extract-requirements";
import type { AnalysisChunk } from "./chunk-pages";

const chunk: AnalysisChunk = {
    chunkNumber: 1,
    pageNumbers: [1],
    text: `
<document_page number="1">
The bidder shall submit a signed offer before 30 November 2026.
</document_page>
`.trim(),
};

const validResponse = {
    requirements: [
        {
            category: "DEADLINE",
            text: "The bidder shall submit a signed offer before 30 November 2026.",
            obligation: "MANDATORY" as const,
            page_number: 1,
            quote:
                "The bidder shall submit a signed offer before 30 November 2026.",
        },
    ],
};

describe("extractRequirementsFromChunk", () => {
    it("returns schema-validated requirements", async () => {
        let calls = 0;

        const provider: AiProvider = {
            async generateJson<T>(
                request: GenerateJsonRequest<T>,
            ): Promise<T> {
                calls += 1;
                return request.schema.parse(validResponse);
            },
        };

        const result = await extractRequirementsFromChunk(
            provider,
            chunk,
        );

        expect(result).toEqual(validResponse);
        expect(calls).toBe(1);
    });

    it("retries malformed output once", async () => {
        let calls = 0;

        const provider: AiProvider = {
            async generateJson<T>(
                request: GenerateJsonRequest<T>,
            ): Promise<T> {
                calls += 1;

                if (calls === 1) {
                    throw new AiProviderError(
                        "MALFORMED_RESPONSE",
                        "Invalid structured output.",
                    );
                }

                return request.schema.parse(validResponse);
            },
        };

        const result = await extractRequirementsFromChunk(
            provider,
            chunk,
        );

        expect(result).toEqual(validResponse);
        expect(calls).toBe(2);
    });

    it("does not retry provider failures", async () => {
        let calls = 0;

        const provider: AiProvider = {
            async generateJson<T>(): Promise<T> {
                calls += 1;

                throw new AiProviderError(
                    "TIMEOUT",
                    "The provider timed out.",
                );
            },
        };

        await expect(
            extractRequirementsFromChunk(provider, chunk),
        ).rejects.toMatchObject({
            code: "TIMEOUT",
        });

        expect(calls).toBe(1);
    });
});