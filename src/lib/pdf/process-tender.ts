import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

import {
    AiProviderError,
    createAiProvider,
} from "@/lib/ai/provider";

import {
    analyzeTenderPages,
} from "@/lib/ai/analyze-tender";

import {
    saveAiRequirements,
} from "@/lib/requirements/save-ai-requirements";

import { readStoredFile } from "@/lib/storage";

import {
    extractPdfPages,
    PdfExtractionError,
} from "@/lib/pdf/extract-pages";

import {
    DailyAnalysisLimitError,
    releaseDailyAnalysisSlot,
    reserveDailyAnalysisSlot,
} from "@/lib/ai/analysis-limit";

import {
    verifyTenderRequirements,
} from "@/lib/requirements/verify-tender-requirements";

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

    let analysisSlotReserved = false;
    let reservedUsageDate: string | null = null;

    await prisma.tender.update({
        where: {
            id: tender.id,
        },
        data: {
            status: "PROCESSING",
            stage: "EXTRACTING_TEXT",
            errorCode: null,
        },
    });

    try {
        const pdfBuffer = await readStoredFile(
            tender.fileStorageKey,
        );

        const pages = await extractPdfPages(pdfBuffer);
        const pagesWithoutText = pages.filter(
            (page) => !page.hasText,
        );
        const readablePages = pages.filter(
            (page) => page.hasText,
        );

        await prisma.$transaction(
            async (transaction: Prisma.TransactionClient) => {
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
                        status: "PROCESSING",
                        stage: "TEXT_EXTRACTED",
                        errorCode:
                            pagesWithoutText.length > 0
                                ? "NO_READABLE_TEXT"
                                : null,
                    },
                });
            },
        );

        if (readablePages.length === 0) {
            await prisma.tender.update({
                where: {
                    id: tender.id,
                },
                data: {
                    status: "ATTENTION_REQUIRED",
                    stage: "TEXT_EXTRACTION_COMPLETE",
                    errorCode: "NO_READABLE_TEXT",
                },
            });

            return {
                tenderId: tender.id,
                pageCount: pages.length,
                requirementsCount: 0,
                failedChunks: [],
                status: "ATTENTION_REQUIRED" as const,
            };
        }

        await prisma.tender.update({
            where: {
                id: tender.id,
            },
            data: {
                status: "PROCESSING",
                stage: "ANALYZING_REQUIREMENTS",
                errorCode: null,
            },
        });

        const provider = createAiProvider();

        try {
            const reservation = await reserveDailyAnalysisSlot(ownerId);

            analysisSlotReserved = true;
            reservedUsageDate = reservation.usageDate;
        } catch (error) {
            if (error instanceof DailyAnalysisLimitError) {
                await prisma.tender.update({
                    where: {
                        id: tender.id,
                    },
                    data: {
                        status: "ATTENTION_REQUIRED",
                        stage: "AI_LIMIT_REACHED",
                        errorCode: error.code,
                    },
                });

                return {
                    tenderId: tender.id,
                    pageCount: pages.length,
                    requirementsCount: 0,
                    failedChunks: [],
                    status: "ATTENTION_REQUIRED" as const,
                };
            }

            throw error;
        }

        const analysis = await analyzeTenderPages(
            readablePages,
            provider,
        );
        analysisSlotReserved = false;

        const savedRequirements =
            await saveAiRequirements(
                tender.id,
                analysis.requirements,
            );

        const verification =
            await verifyTenderRequirements(
                tender.id,
                ownerId,
            );

        const attentionRequired =
            pagesWithoutText.length > 0 ||
            analysis.failedChunks.length > 0;

        const finalStatus = attentionRequired
            ? "ATTENTION_REQUIRED"
            : "ANALYZED";

        await prisma.tender.update({
            where: {
                id: tender.id,
            },
            data: {
                status: finalStatus,
                stage: "REQUIREMENTS_VERIFIED",
                errorCode:
                    analysis.failedChunks.length > 0
                        ? "AI_CHUNK_FAILED"
                        : pagesWithoutText.length > 0
                            ? "NO_READABLE_TEXT"
                            : null,
            },
        });

        return {
            tenderId: tender.id,
            pageCount: pages.length,
            requirementsCount: savedRequirements.savedCount,
            verifiedCount: verification.verifiedCount,
            unverifiedCount: verification.unverifiedCount,
            failedChunks: analysis.failedChunks,
            status: finalStatus,
        };
    } catch (error) {
        if (analysisSlotReserved && reservedUsageDate) {
            try {
                await releaseDailyAnalysisSlot(
                    ownerId,
                    reservedUsageDate,
                );
            } catch (releaseError) {
                console.error(
                    "Unable to release failed analysis slot.",
                    releaseError,
                );
            }
        }
        const errorCode =
            error instanceof PdfExtractionError
                ? error.code
                : error instanceof AiProviderError
                    ? `AI_${error.code}`
                    : "AI_PROCESSING_FAILED";

        await prisma.tender.update({
            where: {
                id: tender.id,
            },
            data: {
                status: "PROCESSING_FAILED",
                stage: "AI_PROCESSING_FAILED",
                errorCode,
            },
        });

        throw error;
    }
}
