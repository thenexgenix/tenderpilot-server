import { prisma } from "@/lib/prisma";
import { readStoredFile } from "@/lib/storage";
import {
    extractPdfPages,
    PdfExtractionError,
} from "@/lib/pdf/extract-pages";

export async function processTenderPdf(
    tenderId: string,
    ownerId: string,
) {
    const tender = await prisma.tender.findFirst({
        where: {
            id: tenderId,
            ownerId,
            deletedAt: null,
        },
        select: {
            id: true,
            fileStorageKey: true,
        },
    });

    if (!tender) {
        throw new PdfExtractionError(
            "TENDER_NOT_FOUND",
            "Tender not found.",
        );
    }

    if (!tender.fileStorageKey) {
        throw new PdfExtractionError(
            "PDF_NOT_FOUND",
            "No PDF is attached to this tender.",
        );
    }

    await prisma.tender.update({
        where: { id: tender.id },
        data: {
            status: "PROCESSING",
            stage: "EXTRACTING_TEXT",
            errorCode: null,
        },
    });

    try {
        const pdfBuffer = await readStoredFile(tender.fileStorageKey);
        const pages = await extractPdfPages(pdfBuffer);

        const pagesWithoutText = pages.filter((page) => !page.hasText);
        const finalStatus =
            pagesWithoutText.length > 0 ? "ATTENTION_REQUIRED" : "DRAFT";

        await prisma.$transaction(async (transaction) => {
            await transaction.documentPage.deleteMany({
                where: {
                    tenderId: tender.id,
                },
            });

            await transaction.documentPage.createMany({
                data: pages.map((page) => ({
                    tenderId: tender.id,
                    pageNumber: page.pageNumber,
                    text: page.text,
                    characterCount: page.characterCount,
                    hasText: page.hasText,
                    extractionStatus: page.extractionStatus,
                    errorCode: page.errorCode,
                })),
            });

            await transaction.tender.update({
                where: {
                    id: tender.id,
                },
                data: {
                    status: finalStatus,
                    stage: "TEXT_EXTRACTED",
                    errorCode:
                        pagesWithoutText.length > 0
                            ? "NO_READABLE_TEXT"
                            : null,
                },
            });
        });

        return {
            tenderId: tender.id,
            pageCount: pages.length,
            pagesWithoutText: pagesWithoutText.length,
            status: finalStatus,
        };
    } catch (error) {
        const errorCode =
            error instanceof PdfExtractionError
                ? error.code
                : "TEXT_EXTRACTION_FAILED";

        await prisma.tender.update({
            where: {
                id: tender.id,
            },
            data: {
                status: "PROCESSING_FAILED",
                stage: "TEXT_EXTRACTION_FAILED",
                errorCode,
            },
        });

        throw error;
    }
}