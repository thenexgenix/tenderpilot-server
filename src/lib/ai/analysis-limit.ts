import { prisma } from "@/lib/prisma";

export const DAILY_ANALYSIS_LIMIT = 5;

export class DailyAnalysisLimitError extends Error {
    readonly code = "DAILY_ANALYSIS_LIMIT_REACHED";

    constructor() {
        super(
            "The daily AI analysis limit has been reached for this user.",
        );
        this.name = "DailyAnalysisLimitError";
    }
}

function getUsageDate() {
    return new Date().toISOString().slice(0, 10);
}

export async function reserveDailyAnalysisSlot(
    userId: string,
) {
    const usageDate = getUsageDate();

    return prisma.$transaction(async (transaction) => {
        const usage =
            await transaction.aiAnalysisUsage.upsert({
                where: {
                    userId_usageDate: {
                        userId,
                        usageDate,
                    },
                },
                create: {
                    userId,
                    usageDate,
                    analysisCount: 1,
                },
                update: {
                    analysisCount: {
                        increment: 1,
                    },
                },
            });

        if (usage.analysisCount > DAILY_ANALYSIS_LIMIT) {
            throw new DailyAnalysisLimitError();
        }

        return {
            usageDate,
            analysisCount: usage.analysisCount,
            remaining:
                DAILY_ANALYSIS_LIMIT - usage.analysisCount,
        };
    });
}