import { Prisma } from "@prisma/client";
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

const reviewActions = [
    "CHECKLIST",
    "CONFIRM",
    "REJECT",
    "EDIT",
] as const;

const updateSchema = z.object({
    action: z.enum(reviewActions).default("CHECKLIST"),
    checkStatus: z.enum(checklistStatuses).optional(),
    checkNote: z.string().max(2000).nullable().optional(),

    text: z.string().trim().min(1).max(10000).optional(),
    category: z.string().trim().min(1).max(80).optional(),
    obligation: z
        .enum(["MANDATORY", "OPTIONAL", "UNCLEAR"])
        .optional(),
    pageNumber: z.number().int().positive().nullable().optional(),
    quote: z.string().trim().max(400).nullable().optional(),
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
                    code: "INVALID_REQUIREMENT_UPDATE",
                    message: "The requirement update is invalid.",
                },
            },
            { status: 400 },
        );
    }

    const { rid } = await params;
    const action = parsed.data.action;

    const checkNote =
        parsed.data.checkNote === undefined
            ? undefined
            : parsed.data.checkNote?.trim() || null;

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

    let updateData: Prisma.RequirementUpdateInput = {};

    if (action === "CHECKLIST") {
        if (!parsed.data.checkStatus) {
            return NextResponse.json(
                {
                    error: {
                        code: "CHECK_STATUS_REQUIRED",
                        message: "Checklist status is required.",
                    },
                },
                { status: 400 },
            );
        }

        const normalizedNote = checkNote ?? "";

        const noteRequired =
            requirement.obligation === "MANDATORY" &&
            ["SATISFIED", "NOT_APPLICABLE"].includes(
                parsed.data.checkStatus,
            );

        if (
            noteRequired &&
            normalizedNote.length < 10
        ) {
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

        updateData = {
            checkStatus: parsed.data.checkStatus,
            checkNote: normalizedNote || null,
        };
    }

    if (action === "CONFIRM") {
        updateData = {
            verification: "HUMAN_CONFIRMED",
            reviewedAt: new Date(),
        };

        if (checkNote !== undefined) {
            updateData.checkNote = checkNote;
        }
    }

    if (action === "REJECT") {
        updateData = {
            verification: "REJECTED",
            reviewedAt: new Date(),
        };

        if (checkNote !== undefined) {
            updateData.checkNote = checkNote;
        }
    }

    if (action === "EDIT") {
        if (
            !parsed.data.text ||
            !parsed.data.category ||
            !parsed.data.obligation
        ) {
            return NextResponse.json(
                {
                    error: {
                        code: "EDIT_FIELDS_REQUIRED",
                        message:
                            "Text, category and obligation are required when editing a requirement.",
                    },
                },
                { status: 400 },
            );
        }

        updateData = {
            text: parsed.data.text,
            category: parsed.data.category,
            obligation: parsed.data.obligation,
            verification: "HUMAN_CONFIRMED",
            reviewedAt: new Date(),
        };

        if (parsed.data.pageNumber !== undefined) {
            updateData.pageNumber = parsed.data.pageNumber;
        }

        if (parsed.data.quote !== undefined) {
            updateData.quote =
                parsed.data.quote?.trim() || null;
        }

        if (checkNote !== undefined) {
            updateData.checkNote = checkNote;
        }
    }

    const updatedRequirement = await prisma.requirement.update({
        where: {
            id: requirement.id,
        },
        data: updateData,
        select: {
            id: true,
            displayId: true,
            category: true,
            text: true,
            explanation: true,
            obligation: true,
            pageNumber: true,
            quote: true,
            verification: true,
            origin: true,
            checkStatus: true,
            checkNote: true,
            reviewedAt: true,
            updatedAt: true,
        },
    });

    return NextResponse.json({
        data: {
            requirement: updatedRequirement,
        },
    });
}