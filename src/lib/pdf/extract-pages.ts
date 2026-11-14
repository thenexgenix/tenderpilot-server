import { Buffer } from "node:buffer";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

const MAX_PDF_PAGES = 150;
const MIN_TEXT_CHARACTERS = 40;

export type ExtractedPage = {
    pageNumber: number;
    text: string;
    characterCount: number;
    hasText: boolean;
    extractionStatus: "EXTRACTED" | "NO_TEXT";
    errorCode: string | null;
};

export class PdfExtractionError extends Error {
    constructor(
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = "PdfExtractionError";
    }
}

function getErrorMessage(error: unknown) {
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
}

function isPasswordError(error: unknown) {
    const candidate = error as {
        name?: string;
        code?: number;
        message?: string;
    };

    return (
        candidate?.name === "PasswordException" ||
        candidate?.code === 1 ||
        candidate?.message?.toLowerCase().includes("password")
    );
}

type PdfTextItem = {
    str?: string;
    transform?: number[];
};

function normalizePageText(items: PdfTextItem[]) {
    const rows: Array<{
        y: number;
        items: Array<{ x: number; text: string }>;
    }> = [];

    for (const item of items) {
        const text = item.str?.trim() ?? "";
        const x = item.transform?.[4] ?? 0;
        const y = item.transform?.[5] ?? 0;

        if (!text) {
            continue;
        }

        let row = rows.find((candidate) => Math.abs(candidate.y - y) < 0.5);

        if (!row) {
            row = { y, items: [] };
            rows.push(row);
        }

        row.items.push({ x, text });
    }

    return rows
        .sort((left, right) => right.y - left.y)
        .map((row) =>
            row.items
                .sort((left, right) => left.x - right.x)
                .map((item) => item.text)
                .join(" ")
                .replace(/\s+([,.;:])/g, "$1")
                .trim(),
        )
        .join("\n")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .trim();
}

export async function extractPdfPages(
    buffer: Buffer,
): Promise<ExtractedPage[]> {
    let pdf: Awaited<
        ReturnType<typeof pdfjsLib.getDocument>
    >["promise"] extends Promise<infer Document>
        ? Document
        : never;

    try {
        const loadingTask = pdfjsLib.getDocument({
            data: new Uint8Array(buffer),
            useSystemFonts: true,
        });

        pdf = await loadingTask.promise;
    } catch (error) {
        if (isPasswordError(error)) {
            throw new PdfExtractionError(
                "PASSWORD_PROTECTED_PDF",
                "This PDF is password-protected and cannot be processed.",
            );
        }

        throw new PdfExtractionError(
            "CORRUPT_PDF",
            `The PDF could not be opened: ${getErrorMessage(error)}`,
        );
    }

    if (pdf.numPages > MAX_PDF_PAGES) {
        await pdf.cleanup();

        throw new PdfExtractionError(
            "TOO_MANY_PAGES",
            "PDF files must contain 150 pages or fewer.",
        );
    }

    const pages: ExtractedPage[] = [];

    try {
        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
            let pageText = "";

            try {
                const page = await pdf.getPage(pageNumber);
                const textContent = await page.getTextContent();

                pageText = normalizePageText(
                    textContent.items.flatMap((item) =>
                        "str" in item && typeof item.str === "string"
                            ? [
                                {
                                    str: item.str,
                                    transform:
                                        "transform" in item
                                            ? item.transform
                                            : undefined,
                                },
                            ]
                            : [],
                    ),
                );
            } catch (error) {
                throw new PdfExtractionError(
                    "PAGE_EXTRACTION_FAILED",
                    `Unable to extract text from page ${pageNumber}: ${getErrorMessage(error)}`,
                );
            }

            const characterCount = pageText.length;
            const hasText = characterCount >= MIN_TEXT_CHARACTERS;

            pages.push({
                pageNumber,
                text: pageText,
                characterCount,
                hasText,
                extractionStatus: hasText ? "EXTRACTED" : "NO_TEXT",
                errorCode: hasText ? null : "NO_READABLE_TEXT",
            });
        }
    } finally {
        await pdf.cleanup();
    }

    return pages;
}
