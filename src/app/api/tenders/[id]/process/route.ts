import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import {
    processTenderPdf,
} from "@/lib/pdf/process-tender";
import { PdfExtractionError } from "@/lib/pdf/extract-pages";

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

    try {
        const result = await processTenderPdf(id, user.id);

        return NextResponse.json({
            data: result,
        });
    } catch (error) {
        if (error instanceof PdfExtractionError) {
            const status =
                error.code === "TENDER_NOT_FOUND" ? 404 : 422;

            return NextResponse.json(
                {
                    error: {
                        code: error.code,
                        message: error.message,
                    },
                },
                { status },
            );
        }

        return NextResponse.json(
            {
                error: {
                    code: "TEXT_EXTRACTION_FAILED",
                    message: "Unable to extract text from this PDF.",
                },
            },
            { status: 500 },
        );
    }
}