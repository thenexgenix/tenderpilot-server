import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import {
    AiProviderError,
    type AiProvider,
    type GenerateJsonRequest,
} from "./provider";
import { analyzeTenderPages } from "./analyze-tender";

const requirement = {
    category: "DEADLINE",
    text: "The bidder shall submit the offer before the deadline.",
    obligation: "MANDATORY" as const,
    page_number: 1,
    quote: "The bidder shall submit the offer before the deadline.",
};

describe("analyzeTenderPages", () => {
    it("collects requirements from multiple chunks", async () => {
        let calls = 0;

        const provider: AiProvider = {
            async generateJson<T>(
                request: GenerateJsonRequest<T>,
            ): Promise<T> {
                calls += 1;

                return request.schema.parse({
                    requirements: [requirement],
                });
            },
        };

        const result = await analyzeTenderPages(
            [
                {
                    pageNumber: 1,
                    text: "A".repeat(80),
                },
                {
                    pageNumber: 2,
                    text: "B".repeat(80),
                },
            ],
            provider,
            {
                maxCharsPerChunk: 100,
                maxChunks: 5,
            },
        );

        expect(result.chunkCount).toBeGreaterThan(1);
        expect(result.requirements).toHaveLength(calls);
        expect(result.failedChunks).toEqual([]);
    });

    it("marks a malformed chunk as failed after retry", async () => {
        const provider: AiProvider = {
            async generateJson<T>(
                request: GenerateJsonRequest<T>,
            ): Promise<T> {
                void request;

                throw new AiProviderError(
                    "MALFORMED_RESPONSE",
                    "The response was invalid.",
                );
            },
        };

        const result = await analyzeTenderPages(
            [
                {
                    pageNumber: 1,
                    text: "The bidder shall submit the required documents.",
                },
            ],
            provider,
        );

        expect(result.requirements).toEqual([]);
        expect(result.failedChunks).toEqual([1]);
    });

    it("propagates provider failures", async () => {
        const provider: AiProvider = {
            async generateJson<T>(
                request: GenerateJsonRequest<T>,
            ): Promise<T> {
                void request;

                throw new AiProviderError(
                    "TIMEOUT",
                    "The provider timed out.",
                );
            },
        };

        await expect(
            analyzeTenderPages(
                [
                    {
                        pageNumber: 1,
                        text: "The bidder shall submit the required documents.",
                    },
                ],
                provider,
            ),
        ).rejects.toMatchObject({
            code: "TIMEOUT",
        });
    });
});