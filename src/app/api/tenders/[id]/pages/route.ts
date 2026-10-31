import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function GET(
    request: Request,
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
    const pageValue = new URL(request.url).searchParams.get("page") ?? "1";
    const pageNumber = Number(pageValue);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
        return NextResponse.json(
            {
                error: {
                    code: "INVALID_PAGE",
                    message: "Page number must be a positive integer.",
                },
            },
            { status: 400 },
        );
    }

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

    const pageCount = await prisma.documentPage.count({
        where: {
            tenderId: tender.id,
        },
    });

    if (pageCount === 0) {
        return NextResponse.json({
            data: {
                tenderId: tender.id,
                status: tender.status,
                stage: tender.stage,
                errorCode: tender.errorCode,
                pageCount: 0,
                page: null,
            },
        });
    }

    const page = await prisma.documentPage.findFirst({
        where: {
            tenderId: tender.id,
            pageNumber,
        },
        select: {
            pageNumber: true,
            text: true,
            characterCount: true,
            hasText: true,
            extractionStatus: true,
            errorCode: true,
        },
    });

    if (!page) {
        return NextResponse.json(
            {
                error: {
                    code: "PAGE_NOT_FOUND",
                    message: "The requested page does not exist.",
                },
            },
            { status: 404 },
        );
    }

    return NextResponse.json({
        data: {
            tenderId: tender.id,
            status: tender.status,
            stage: tender.stage,
            errorCode: tender.errorCode,
            pageCount,
            page,
        },
    });
}