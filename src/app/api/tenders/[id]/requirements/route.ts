import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";

type RouteContext = {
    params: Promise<{ id: string }>;
};

const filterSchema = z.object({
    category: z.string().trim().max(80).optional(),
    obligation: z
        .enum(["MANDATORY", "OPTIONAL", "UNCLEAR"])
        .optional(),
    verification: z
        .enum([
            "VERIFIED",
            "UNVERIFIED",
            "NOT_FOUND",
            "HUMAN_CONFIRMED",
            "REJECTED",
        ])
        .optional(),
});

const manualRequirementSchema = z.object({
    category: z.string().trim().min(1).max(80),
    text: z.string().trim().min(1).max(10000),
    obligation: z.enum([
        "MANDATORY",
        "OPTIONAL",
        "UNCLEAR",
    ]),
    pageNumber: z.number().int().positive().nullable().optional(),
    quote: z.string().trim().max(400).nullable().optional(),
    checkNote: z.string().max(2000).nullable().optional(),
});

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
    const url = new URL(request.url);

    const filterResult = filterSchema.safeParse({
        category:
            url.searchParams.get("category") || undefined,
        obligation:
            url.searchParams.get("obligation") || undefined,
        verification:
            url.searchParams.get("verification") || undefined,
    });

    if (!filterResult.success) {
        return NextResponse.json(
            {
                error: {
                    code: "INVALID_FILTER",
                    message: "One or more filters are invalid.",
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

    const filters = filterResult.data;
    const where: Prisma.RequirementWhereInput = {
        tenderId: tender.id,
    };

    if (filters.category) {
        where.category = filters.category;
    }

    if (filters.obligation) {
        where.obligation = filters.obligation;
    }

    if (filters.verification) {
        where.verification = filters.verification;
    }

    const requirements = await prisma.requirement.findMany({
        where,
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
            updatedAt: true,
        },
        orderBy: {
            displayId: "asc",
        },
    });

    return NextResponse.json({
        data: {
            tenderId: tender.id,
            status: tender.status,
            stage: tender.stage,
            requirements,
        },
    });
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

    const parsed = manualRequirementSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            {
                error: {
                    code: "INVALID_MANUAL_REQUIREMENT",
                    message:
                        "Category, text and obligation are required.",
                },
            },
            { status: 400 },
        );
    }

    const { id: tenderId } = await params;

    const tender = await prisma.tender.findFirst({
        where: {
            id: tenderId,
            ownerId: user.id,
            deletedAt: null,
        },
        select: {
            id: true,
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

    const createdRequirement = await prisma.$transaction(
        async (transaction) => {
            const existingRequirements =
                await transaction.requirement.findMany({
                    where: {
                        tenderId: tender.id,
                    },
                    select: {
                        displayId: true,
                    },
                });

            const highestNumber = existingRequirements.reduce(
                (highest, requirement) => {
                    const match = /^REQ-(\d+)$/.exec(
                        requirement.displayId,
                    );

                    return match
                        ? Math.max(highest, Number(match[1]))
                        : highest;
                },
                0,
            );

            const hasEvidence =
                parsed.data.pageNumber !== null &&
                parsed.data.pageNumber !== undefined &&
                Boolean(parsed.data.quote?.trim());

            return transaction.requirement.create({
                data: {
                    tenderId: tender.id,
                    displayId: `REQ-${String(
                        highestNumber + 1,
                    ).padStart(3, "0")}`,
                    category: parsed.data.category,
                    text: parsed.data.text,
                    obligation: parsed.data.obligation,
                    pageNumber: parsed.data.pageNumber ?? null,
                    quote: parsed.data.quote?.trim() || null,
                    verification: hasEvidence
                        ? "HUMAN_CONFIRMED"
                        : "NOT_FOUND",
                    origin: "MANUAL",
                    checkStatus: "NOT_REVIEWED",
                    checkNote: parsed.data.checkNote?.trim() || null,
                    reviewedAt: new Date(),
                },
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
        },
    );

    return NextResponse.json(
        {
            data: {
                requirement: createdRequirement,
            },
        },
        { status: 201 },
    );
}