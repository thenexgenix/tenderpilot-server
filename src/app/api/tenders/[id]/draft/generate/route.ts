import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { runTenderDraftGeneration } from "@/lib/draft/run-draft-generation";

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
            draftStatus: true,
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

    if (tender.draftStatus === "GENERATING") {
        return NextResponse.json(
            {
                data: {
                    tenderId: tender.id,
                    status: "GENERATING",
                },
            },
            { status: 202 },
        );
    }

    if (tender.draftStatus === "READY") {
        return NextResponse.json(
            {
                error: {
                    code: "DRAFT_ALREADY_EXISTS",
                    message:
                        "A draft already exists. Regeneration confirmation will be added on Day 15.",
                },
            },
            { status: 409 },
        );
    }

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

    void runTenderDraftGeneration(tender.id, user.id).catch(() => {
        // The generation runner records the failure state.
    });

    return NextResponse.json(
        {
            data: {
                tenderId: tender.id,
                status: "GENERATING",
            },
        },
        { status: 202 },
    );
}