import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(
    _request: Request,
    { params }: RouteContext,
) {
    const user = await getCurrentUser();

    if (!user) {
        return NextResponse.json(
            {
                error: {
                    code: "UNAUTHENTICATED",
                    message: "Authentication required.",
                },
            },
            { status: 401 },
        );
    }

    const { id } = await params;

    const tender = await prisma.tender.findFirst({
        where: {
            id,
            ownerId: user.id,
            deletedAt: null,
        },
        select: {
            id: true,
            status: true,
            stage: true,
            errorCode: true,
        },
    });

    if (!tender) {
        return NextResponse.json(
            {
                error: {
                    code: "TENDER_NOT_FOUND",
                    message: "Tender not found.",
                },
            },
            { status: 404 },
        );
    }

    const [pageCount, pagesWithText, pagesWithoutText] =
        await Promise.all([
            prisma.documentPage.count({
                where: {
                    tenderId: tender.id,
                },
            }),
            prisma.documentPage.count({
                where: {
                    tenderId: tender.id,
                    hasText: true,
                },
            }),
            prisma.documentPage.count({
                where: {
                    tenderId: tender.id,
                    hasText: false,
                },
            }),
        ]);

    return NextResponse.json({
        data: {
            tenderId: tender.id,
            status: tender.status,
            stage: tender.stage,
            errorCode: tender.errorCode,
            pageCount,
            pagesWithText,
            pagesWithoutText,
        },
    });
}