import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import {
    buildTenderIntelligence,
    type IntelligenceReference,
} from "@/lib/intelligence/reference-tender-intelligence";

type RouteContext = {
    params: Promise<{ id: string }>;
};

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
            title: true,
            sourceType: true,
            requirements: {
                orderBy: { displayId: "asc" },
                select: {
                    displayId: true,
                    category: true,
                    text: true,
                    obligation: true,
                    verification: true,
                    pageNumber: true,
                },
            },
        },
    });

    if (!tender) {
        return NextResponse.json(
            { error: { code: "NOT_FOUND", message: "Tender not found." } },
            { status: 404 },
        );
    }

    if (tender.sourceType !== "ACTIVE") {
        return NextResponse.json(
            {
                error: {
                    code: "REFERENCE_TENDER_NOT_ELIGIBLE",
                    message:
                        "Bid strategy is generated for an active tender. Reference documents are used as benchmarks.",
                },
            },
            { status: 400 },
        );
    }

    const references = (await prisma.tender.findMany({
        where: {
            ownerId: user.id,
            deletedAt: null,
            sourceType: {
                in: ["PUBLIC_REFERENCE", "SYNTHETIC_REFERENCE"],
            },
        },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            title: true,
            issuerName: true,
            sourceType: true,
            requirements: {
                orderBy: { displayId: "asc" },
                select: {
                    displayId: true,
                    category: true,
                    text: true,
                    obligation: true,
                    verification: true,
                    pageNumber: true,
                },
            },
        },
    })) as IntelligenceReference[];

    const intelligence = buildTenderIntelligence(tender, references);

    return NextResponse.json({ data: intelligence });
}
