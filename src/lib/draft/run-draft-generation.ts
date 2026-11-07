import {
    AiProviderError,
    createAiProvider,
} from "@/lib/ai/provider";
import {
    generateTenderDraft,
    type GeneratedDraft,
} from "@/lib/ai/generate-draft";
import { prisma } from "@/lib/prisma";

export class DraftGenerationError extends Error {
    constructor(
        public readonly code: string,
        message: string,
    ) {
        super(message);
        this.name = "DraftGenerationError";
    }
}

async function getDraftInput(
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
            title: true,
            issuerName: true,
            reference: true,
            deadlineAt: true,
            notes: true,
            requirements: {
                where: {
                    verification: {
                        not: "REJECTED",
                    },
                },
                select: {
                    displayId: true,
                    category: true,
                    text: true,
                    obligation: true,
                    pageNumber: true,
                    quote: true,
                    verification: true,
                    checkStatus: true,
                    checkNote: true,
                },
                orderBy: {
                    displayId: "asc",
                },
            },
        },
    });

    if (!tender) {
        throw new DraftGenerationError(
            "TENDER_NOT_FOUND",
            "Tender not found.",
        );
    }

    return tender;
}

function warningsForSection(
    generated: GeneratedDraft,
    sectionKey: string,
) {
    return generated.warnings
        .filter((warning) => warning.sectionKey === sectionKey)
        .map((warning) => warning.message);
}

export async function runTenderDraftGeneration(
    tenderId: string,
    ownerId: string,
) {
    const tender = await getDraftInput(tenderId, ownerId);

    await prisma.tender.update({
        where: {
            id: tender.id,
        },
        data: {
            draftStatus: "GENERATING",
            draftErrorCode: null,
            draftUpdatedAt: new Date(),
        },
    });

    try {
        const generated = await generateTenderDraft(
            {
                tender: {
                    title: tender.title,
                    issuerName: tender.issuerName,
                    reference: tender.reference,
                    deadlineAt: tender.deadlineAt,
                    notes: tender.notes,
                },
                requirements: tender.requirements,
            },
            createAiProvider(),
        );

        await prisma.$transaction(async (transaction) => {
            await transaction.draftSection.deleteMany({
                where: {
                    tenderId: tender.id,
                },
            });

            await transaction.draftSection.createMany({
                data: generated.sections.map((section, index) => ({
                    tenderId: tender.id,
                    key: section.key,
                    title: section.title,
                    position: index,
                    content: section.content,
                    generated: true,
                    warnings: JSON.stringify(
                        warningsForSection(generated, section.key),
                    ),
                })),
            });

            await transaction.tender.update({
                where: {
                    id: tender.id,
                },
                data: {
                    draftStatus: "READY",
                    draftErrorCode: null,
                    draftUpdatedAt: new Date(),
                },
            });
        });

        return generated;
    } catch (error) {
        const errorCode =
            error instanceof AiProviderError
                ? `AI_${error.code}`
                : error instanceof DraftGenerationError
                    ? error.code
                    : "DRAFT_GENERATION_FAILED";

        console.error("Draft generation failed.", {
            tenderId,
            errorCode,
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown draft generation error.",
        });

        await prisma.tender.update({
            where: {
                id: tender.id,
            },
            data: {
                draftStatus: "FAILED",
                draftErrorCode: errorCode,
                draftUpdatedAt: new Date(),
            },
        });

        throw error;
    }
}