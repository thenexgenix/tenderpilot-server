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

function normalizePageText(value: string) {
    return value.replace(/\s+/g, " ").trim();
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
                    textContent.items
                        .map((item) => {
                            if ("str" in item && typeof item.str === "string") {
                                return item.str;
                            }

                            return "";
                        })
                        .join(" "),
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