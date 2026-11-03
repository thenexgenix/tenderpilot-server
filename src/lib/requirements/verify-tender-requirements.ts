import { prisma } from "@/lib/prisma";
import {
    verifyRequirementQuote,
    type VerificationPage,
} from "./verify-quote";

export async function verifyTenderRequirements(
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
        },
    });

    if (!tender) {
        throw new Error("Tender not found.");
    }

    const [requirements, pages] = await Promise.all([
        prisma.requirement.findMany({
            where: {
                tenderId: tender.id,
                origin: "AI",
            },
            select: {
                id: true,
                pageNumber: true,
                quote: true,
            },
        }),
        prisma.documentPage.findMany({
            where: {
                tenderId: tender.id,
            },
            select: {
                pageNumber: true,
                text: true,
            },
            orderBy: {
                pageNumber: "asc",
            },
        }),
    ]);

    const verificationPages: VerificationPage[] =
        pages.map((page) => ({
            pageNumber: page.pageNumber,
            text: page.text,
        }));

    let verifiedCount = 0;
    let unverifiedCount = 0;

    const updates = requirements.map((requirement) => {
        const result = verifyRequirementQuote(
            {
                pageNumber: requirement.pageNumber,
                quote: requirement.quote,
            },
            verificationPages,
        );

        if (result.verification === "VERIFIED") {
            verifiedCount += 1;
        } else {
            unverifiedCount += 1;
        }

        return prisma.requirement.update({
            where: {
                id: requirement.id,
            },
            data: {
                verification: result.verification,
                pageNumber: result.pageNumber,
            },
        });
    });

    await prisma.$transaction(updates);

    return {
        tenderId: tender.id,
        total: requirements.length,
        verifiedCount,
        unverifiedCount,
    };
}