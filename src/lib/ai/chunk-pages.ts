export type AnalysisPage = {
    pageNumber: number;
    text: string;
};

export type AnalysisChunk = {
    chunkNumber: number;
    pageNumbers: number[];
    text: string;
};

export const MAX_CHARS_PER_CHUNK = 6_000;
export const MAX_AI_CHUNKS_PER_TENDER = 24;

export class AiChunkLimitError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "AiChunkLimitError";
    }
}

function splitLargePage(page: AnalysisPage, maxChars: number) {
    const text = page.text.trim();
    const opening = `<document_page number="${page.pageNumber}">`;
    const closing = "</document_page>";
    const payloadLimit =
        maxChars - opening.length - closing.length - 2;

    if (payloadLimit < 1) {
        throw new Error("maxChars is too small for page markers.");
    }

    if (text.length <= payloadLimit) {
        return [`${opening}\n${text}\n${closing}`];
    }

    const parts: string[] = [];
    let start = 0;

    while (start < text.length) {
        let end = Math.min(start + payloadLimit, text.length);

        if (end < text.length) {
            const lastSpace = text.lastIndexOf(" ", end);

            if (lastSpace > start) {
                end = lastSpace;
            }
        }

        const part = text.slice(start, end).trim();

        if (part) {
            parts.push(`${opening}\n${part}\n${closing}`);
        }

        start = end;
    }

    return parts;
}

export function createPageChunks(
    pages: AnalysisPage[],
    options?: {
        maxCharsPerChunk?: number;
        maxChunks?: number;
    },
): AnalysisChunk[] {
    const maxCharsPerChunk =
        options?.maxCharsPerChunk ?? MAX_CHARS_PER_CHUNK;
    const maxChunks =
        options?.maxChunks ?? MAX_AI_CHUNKS_PER_TENDER;

    const pageBlocks = pages
        .filter((page) => page.text.trim().length > 0)
        .flatMap((page) => splitLargePage(page, maxCharsPerChunk));

    const chunks: AnalysisChunk[] = [];
    let currentBlocks: string[] = [];
    let currentLength = 0;

    for (const block of pageBlocks) {
        const separatorLength = currentBlocks.length > 0 ? 2 : 0;

        if (
            currentBlocks.length > 0 &&
            currentLength + separatorLength + block.length >
            maxCharsPerChunk
        ) {
            chunks.push(createChunk(chunks.length + 1, currentBlocks));

            currentBlocks = [];
            currentLength = 0;
        }

        currentBlocks.push(block);
        currentLength +=
            (currentBlocks.length > 1 ? 2 : 0) + block.length;
    }

    if (currentBlocks.length > 0) {
        chunks.push(createChunk(chunks.length + 1, currentBlocks));
    }

    if (chunks.length > maxChunks) {
        throw new AiChunkLimitError(
            `This tender requires ${chunks.length} AI chunks, but the limit is ${maxChunks}.`,
        );
    }

    return chunks;
}

function createChunk(
    chunkNumber: number,
    blocks: string[],
): AnalysisChunk {
    const text = blocks.join("\n\n");
    const pageNumbers = Array.from(
        text.matchAll(/<document_page number="(\d+)">/g),
        (match) => Number(match[1]),
    );

    return {
        chunkNumber,
        pageNumbers: Array.from(new Set(pageNumbers)),
        text,
    };
}