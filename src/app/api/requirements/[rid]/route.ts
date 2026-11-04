import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type RouteContext = {
    params: Promise<{ rid: string }>;
};

const checklistStatuses = [
    "NOT_REVIEWED",
    "IN_PROGRESS",
    "SATISFIED",
    "NOT_SATISFIED",
    "NEEDS_CLARIFICATION",
    "NOT_APPLICABLE",
] as const;

const updateSchema = z.object({
    checkStatus: z.enum(checklistStatuses),
    checkNote: z.string().max(2000).nullable().optional(),
});

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
                    code: "INVALID_CHECKLIST_UPDATE",
                    message:
                        "Status must be valid and the note must contain at most 2000 characters.",
                },
            },
            { status: 400 },
        );
    }

    const { rid } = await params;
    const checkNote = parsed.data.checkNote?.trim() || null;

    const requirement = await prisma.requirement.findFirst({
        where: {
            id: rid,
            tender: {
                ownerId: user.id,
                deletedAt: null,
            },
        },
        select: {
            id: true,
            obligation: true,
        },
    });

    if (!requirement) {
        return NextResponse.json(
            {
                error: {
                    code: "REQUIREMENT_NOT_FOUND",
                    message: "Requirement not found.",
                },
            },
            { status: 404 },
        );
    }

    const noteRequired =
        requirement.obligation === "MANDATORY" &&
        ["SATISFIED", "NOT_APPLICABLE"].includes(
            parsed.data.checkStatus,
        );

    if (noteRequired && (!checkNote || checkNote.length < 10)) {
        return NextResponse.json(
            {
                error: {
                    code: "CHECK_NOTE_REQUIRED",
                    message:
                        "A note of at least 10 characters is required when a mandatory requirement is marked Satisfied or Not Applicable.",
                },
            },
            { status: 422 },
        );
    }

    const updatedRequirement = await prisma.requirement.update({
        where: {
            id: requirement.id,
        },
        data: {
            checkStatus: parsed.data.checkStatus,
            checkNote,
        },
        select: {
            id: true,
            displayId: true,
            category: true,
            text: true,
            obligation: true,
            pageNumber: true,
            quote: true,
            verification: true,
            origin: true,
            checkStatus: true,
            checkNote: true,
            updatedAt: true,
        },
    });

    return NextResponse.json({
        data: {
            requirement: updatedRequirement,
        },
    });
}