import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type RouteContext = {
    params: Promise<{ id: string }>;
};

function parseWarnings(value: string | null) {
    if (!value) {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(value);

        return Array.isArray(parsed) &&
            parsed.every((item) => typeof item === "string")
            ? parsed
            : [];
    } catch {
        return [];
    }
}

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
            draftStatus: true,
            draftErrorCode: true,
            draftUpdatedAt: true,
            draft: {
                orderBy: {
                    position: "asc",
                },
                select: {
                    id: true,
                    key: true,
                    title: true,
                    position: true,
                    content: true,
                    generated: true,
                    warnings: true,
                    updatedAt: true,
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

    return NextResponse.json({
        data: {
            tenderId: tender.id,
            status: tender.draftStatus,
            errorCode: tender.draftErrorCode,
            updatedAt: tender.draftUpdatedAt,
            sections: tender.draft.map((section) => ({
                ...section,
                warnings: parseWarnings(section.warnings),
            })),
        },
    });
}