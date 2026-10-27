import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { createTenderSchema } from "@/lib/validation/tender";

export async function GET() {
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

    try {
        const tenders = await prisma.tender.findMany({
            where: {
                ownerId: user.id,
                deletedAt: null,
            },
            orderBy: {
                createdAt: "desc",
            },
            select: {
                id: true,
                title: true,
                issuerName: true,
                reference: true,
                deadlineAt: true,
                notes: true,
                status: true,
                stage: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ data: tenders });
    } catch {
        return NextResponse.json(
            {
                error: {
                    code: "DATABASE_ERROR",
                    message: "Unable to load tenders.",
                },
            },
            { status: 500 },
        );
    }
}

export async function POST(request: Request) {
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

    const result = createTenderSchema.safeParse(body);

    if (!result.success) {
        return NextResponse.json(
            {
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Please check the submitted fields.",
                    fields: result.error.flatten().fieldErrors,
                },
            },
            { status: 400 },
        );
    }

    const { title, issuerName, reference, deadlineAt, notes } = result.data;

    try {
        const tender = await prisma.tender.create({
            data: {
                ownerId: user.id,
                title,
                issuerName,
                reference: reference || null,
                deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
                notes: notes || null,
                status: "DRAFT",
            },
            select: {
                id: true,
                title: true,
                issuerName: true,
                reference: true,
                deadlineAt: true,
                notes: true,
                status: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ data: tender }, { status: 201 });
    } catch {
        return NextResponse.json(
            {
                error: {
                    code: "DATABASE_ERROR",
                    message: "Unable to create the tender.",
                },
            },
            { status: 500 },
        );
    }
}