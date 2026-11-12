import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { z } from "zod";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
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
      issuerName: true,
      reference: true,
      sourceType: true,
      deadlineAt: true,
      notes: true,
      status: true,
      stage: true,
      errorCode: true,
      createdAt: true,
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

  return NextResponse.json({ data: tender });
}

export async function PATCH(request: Request, { params }: RouteContext) {
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
      { error: { code: "INVALID_JSON", message: "Request body must be valid JSON." } },
      { status: 400 },
    );
  }

  const parsedBody = z
    .object({
      sourceType: z.enum([
        "ACTIVE",
        "PUBLIC_REFERENCE",
        "SYNTHETIC_REFERENCE",
      ]),
    })
    .safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "A valid tender document role is required.",
        },
      },
      { status: 400 },
    );
  }

  const { id } = await params;
  const result = await prisma.tender.updateMany({
    where: {
      id,
      ownerId: user.id,
      deletedAt: null,
    },
    data: { sourceType: parsedBody.data.sourceType },
  });

  if (result.count === 0) {
    return NextResponse.json(
      { error: { code: "TENDER_NOT_FOUND", message: "Tender not found." } },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: { id, sourceType: parsedBody.data.sourceType } });
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  const { id } = await params;

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

  const result = await prisma.tender.updateMany({
    where: {
      id,
      ownerId: user.id,
      deletedAt: null,
    },
    data: {
      deletedAt: new Date(),
    },
  });

  if (result.count === 0) {
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
      id,
      deleted: true,
    },
  });
}
