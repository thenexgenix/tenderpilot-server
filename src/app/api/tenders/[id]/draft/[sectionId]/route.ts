import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type RouteContext = {
    params: Promise<{
        id: string;
        sectionId: string;
    }>;
};

const updateSchema = z.object({
    content: z.string().trim().min(1).max(50000),
});

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

export async function PATCH(
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

    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            {
                error: {
                    code: "INVALID_DRAFT_CONTENT",
                    message:
                        "Draft content is required and must be no longer than 50,000 characters.",
                },
            },
            { status: 400 },
        );
    }

    const { id, sectionId } = await params;

    const section = await prisma.draftSection.findFirst({
        where: {
            id: sectionId,
            tenderId: id,
            tender: {
                ownerId: user.id,
                deletedAt: null,
            },
        },
        select: {
            id: true,
        },
    });

    if (!section) {
        return NextResponse.json(
            {
                error: {
                    code: "DRAFT_SECTION_NOT_FOUND",
                    message: "Draft section not found.",
                },
            },
            { status: 404 },
        );
    }

    const updatedSection = await prisma.draftSection.update({
        where: {
            id: section.id,
        },
        data: {
            content: parsed.data.content,
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
    });

    return NextResponse.json({
        data: {
            section: {
                ...updatedSection,
                warnings: parseWarnings(updatedSection.warnings),
            },
        },
    });
}