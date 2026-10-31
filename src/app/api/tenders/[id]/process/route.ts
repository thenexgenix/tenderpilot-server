import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { processTenderPdf } from "@/lib/pdf/process-tender";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function POST(
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

    if (tender.status === "PROCESSING") {
        return NextResponse.json(
            {
                data: {
                    tenderId: tender.id,
                    status: "PROCESSING",
                    stage: "EXTRACTING_TEXT",
                    queued: false,
                },
            },
            { status: 202 },
        );
    }

    await prisma.tender.update({
        where: {
            id: tender.id,
        },
        data: {
            status: "PROCESSING",
            stage: "QUEUED",
            errorCode: null,
        },
    });

    void processTenderPdf(tender.id, user.id).catch(() => {
        // processTenderPdf records the failure status in the database.
    });

    return NextResponse.json(
        {
            data: {
                tenderId: tender.id,
                status: "PROCESSING",
                stage: "QUEUED",
                queued: true,
            },
        },
        { status: 202 },
    );
}