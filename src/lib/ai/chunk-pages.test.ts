import { describe, expect, it } from "vitest";
import {
    AiChunkLimitError,
    createPageChunks,
} from "./chunk-pages";

describe("createPageChunks", () => {
    it("keeps page numbers and document markers", () => {
        const chunks = createPageChunks([
            {
                pageNumber: 1,
                text: "The bidder shall submit a signed offer.",
            },
            {
                pageNumber: 2,
                text: "The offer must remain valid for 90 days.",
            },
        ]);

        expect(chunks).toHaveLength(1);
        expect(chunks[0].pageNumbers).toEqual([1, 2]);
        expect(chunks[0].text).toContain(
            '<document_page number="1">',
        );
        expect(chunks[0].text).toContain(
            '<document_page number="2">',
        );
    });

    it("splits large input into bounded chunks", () => {
        const chunks = createPageChunks(
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
            {
                maxCharsPerChunk: 100,
                maxChunks: 5,
            },
        );

        expect(chunks.length).toBeGreaterThan(1);

        for (const chunk of chunks) {
            expect(chunk.text.length).toBeLessThanOrEqual(100);
        }
    });

    it("ignores pages without text", () => {
        const chunks = createPageChunks([
            {
                pageNumber: 1,
                text: "   ",
            },
            {
                pageNumber: 2,
                text: "A readable requirement appears here.",
            },
        ]);

        expect(chunks).toHaveLength(1);
        expect(chunks[0].pageNumbers).toEqual([2]);
    });

    it("stops oversized tenders at the configured chunk limit", () => {
        expect(() =>
            createPageChunks(
                [
                    { pageNumber: 1, text: "A".repeat(80) },
                    { pageNumber: 2, text: "B".repeat(80) },
                    { pageNumber: 3, text: "C".repeat(80) },
                ],
                {
                    maxCharsPerChunk: 100,
                    maxChunks: 2,
                },
            ),
        ).toThrow(AiChunkLimitError);
    });
});