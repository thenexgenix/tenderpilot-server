import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { buildDraftDocx } from "@/lib/export/build-draft-docx";

type RouteContext = {
    params: Promise<{ id: string }>;
};

const exportSchema = z.object({
    confirmReviewed: z.boolean(),
});

function safeFileName(value: string) {
    return (
        value
            .trim()
            .replace(/[^a-z0-9-_]+/gi, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 80) || "tender-proposal"
    );
}

export async function POST(
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

    const url = new URL(request.url);

    if (url.searchParams.get("format") !== "docx") {
        return NextResponse.json(
            {
                error: {
                    code: "UNSUPPORTED_EXPORT_FORMAT",
                    message: "Only DOCX export is supported.",
                },
            },
            { status: 400 },
        );
    }

    let body: unknown;

    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            {
                error: {
                    code: "INVALID_JSON",
                    message: "Request body must be valid JSON.",
                },
            },
            { status: 400 },
        );
    }

    const parsedBody = exportSchema.safeParse(body);

    if (
        !parsedBody.success ||
        parsedBody.data.confirmReviewed !== true
    ) {
        return NextResponse.json(
            {
                error: {
                    code: "REVIEW_CONFIRMATION_REQUIRED",
                    message:
                        "You must confirm that the draft was reviewed before exporting.",
                },
            },
            { status: 422 },
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
            title: true,
            issuerName: true,
            reference: true,
            draftStatus: true,
            draft: {
                orderBy: {
                    position: "asc",
                },
                select: {
                    title: true,
                    position: true,
                    content: true,
                },
            },
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

    if (
        tender.draftStatus !== "READY" ||
        tender.draft.length === 0
    ) {
        return NextResponse.json(
            {
                error: {
                    code: "DRAFT_NOT_READY",
                    message:
                        "A completed draft is required before export.",
                },
            },
            { status: 409 },
        );
    }

    try {
        const documentBuffer = await buildDraftDocx({
            tender: {
                title: tender.title,
                issuerName: tender.issuerName,
                reference: tender.reference,
            },
            sections: tender.draft,
        });

        const fileName = `${safeFileName(tender.title)}-proposal.docx`;

        return new Response(
            new Uint8Array(documentBuffer),
            {
                status: 200,
                headers: {
                    "Content-Type":
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    "Content-Disposition":
                        `attachment; filename="${fileName}"`,
                    "Cache-Control": "no-store",
                },
            },
        );
    } catch (error) {
        console.error("DOCX export failed.", {
            tenderId: tender.id,
            message:
                error instanceof Error
                    ? error.message
                    : "Unknown export error",
        });

        return NextResponse.json(
            {
                error: {
                    code: "DOCX_EXPORT_FAILED",
                    message:
                        "The DOCX could not be generated. Your draft was not changed.",
                },
            },
            { status: 500 },
        );
    }
}