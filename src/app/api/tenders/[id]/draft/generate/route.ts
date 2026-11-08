import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { runTenderDraftGeneration } from "@/lib/draft/run-draft-generation";
import { z } from "zod";

type RouteContext = {
    params: Promise<{ id: string }>;
};

export async function POST(
    request: Request,
    { params }: RouteContext,
) {
    const requestSchema = z.object({
        confirmRegenerate: z.boolean().optional(),
    });

    let body: unknown = {};

    try {
        body = await request.json();
    } catch {
        body = {};
    }

    const parsedBody = requestSchema.safeParse(body);

    if (!parsedBody.success) {
        return NextResponse.json(
            {
                error: {
                    code: "INVALID_REGENERATION_REQUEST",
                    message: "Invalid draft generation request.",
                },
            },
            { status: 400 },
        );
    }

    const confirmRegenerate =
        parsedBody.data.confirmRegenerate === true;

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

    if (
        tender.draftStatus === "READY" &&
        !confirmRegenerate
    ) {
        return NextResponse.json(
            {
                error: {
                    code:
                        "DRAFT_REGENERATION_CONFIRMATION_REQUIRED",
                    message:
                        "Regeneration confirmation is required.",
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