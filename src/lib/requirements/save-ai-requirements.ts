import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ExtractedRequirement } from "@/lib/ai/schemas";

function normalizeRequirementText(value: string) {
    return value.replace(/\s+/g, " ").trim().toLowerCase();
}

function getDisplayNumber(displayId: string) {
    const match = /^REQ-(\d+)$/.exec(displayId);

    return match ? Number(match[1]) : 0;
}

export async function saveAiRequirements(
    tenderId: string,
    requirements: ExtractedRequirement[],
) {
    const uniqueRequirements = Array.from(
        new Map(
            requirements.map((requirement) => [
                [
                    requirement.page_number,
                    normalizeRequirementText(requirement.text),
                ].join(":"),
                requirement,
            ]),
        ).values(),
    );

    return prisma.$transaction(
        async (transaction: Prisma.TransactionClient) => {
            await transaction.requirement.deleteMany({
                where: {
                    tenderId,
                    origin: "AI",
                    checkStatus: "NOT_REVIEWED",
                },
            });

            const preservedRequirements =
                await transaction.requirement.findMany({
                    where: {
                        tenderId,
                    },
                    select: {
                        displayId: true,
                    },
                });

            const nextDisplayNumber =
                preservedRequirements.reduce(
                    (highest, requirement) =>
                        Math.max(
                            highest,
                            getDisplayNumber(requirement.displayId),
                        ),
                    0,
                ) + 1;

            if (uniqueRequirements.length === 0) {
                return {
                    savedCount: 0,
                    preservedCount: preservedRequirements.length,
                };
            }

            await transaction.requirement.createMany({
                data: uniqueRequirements.map((requirement, index) => ({
                    tenderId,
                    displayId: `REQ-${String(
                        nextDisplayNumber + index,
                    ).padStart(3, "0")}`,
                    category: requirement.category,
                    text: requirement.text,
                    obligation: requirement.obligation,
                    pageNumber: requirement.page_number,
                    quote: requirement.quote,
                    verification: "UNVERIFIED",
                    origin: "AI",
                    checkStatus: "NOT_REVIEWED",
                })),
            });

            return {
                savedCount: uniqueRequirements.length,
                preservedCount: preservedRequirements.length,
            };
        },
    );
}