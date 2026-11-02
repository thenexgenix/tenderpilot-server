import {
    AiProviderError,
    type AiProvider,
} from "./provider";
import {
    createPageChunks,
    type AnalysisPage,
} from "./chunk-pages";
import {
    extractRequirementsFromChunk,
} from "./extract-requirements";
import type {
    ExtractedRequirement,
} from "./schemas";

export type TenderAnalysisResult = {
    requirements: ExtractedRequirement[];
    chunkCount: number;
    failedChunks: number[];
};

export async function analyzeTenderPages(
    pages: AnalysisPage[],
    provider: AiProvider,
    options?: {
        maxCharsPerChunk?: number;
        maxChunks?: number;
    },
): Promise<TenderAnalysisResult> {
    const chunks = createPageChunks(pages, options);
    const requirements: ExtractedRequirement[] = [];
    const failedChunks: number[] = [];

    for (const chunk of chunks) {
        try {
            const result = await extractRequirementsFromChunk(
                provider,
                chunk,
            );

            requirements.push(...result.requirements);
        } catch (error) {
            if (
                error instanceof AiProviderError &&
                error.code === "MALFORMED_RESPONSE"
            ) {
                console.warn(
                    "AI extraction chunk skipped after schema retry.",
                    {
                        chunkNumber: chunk.chunkNumber,
                        reason: error.message,
                    },
                );

                failedChunks.push(chunk.chunkNumber);
                continue;
            }

            throw error;
        }
    }

    return {
        requirements,
        chunkCount: chunks.length,
        failedChunks,
    };
}