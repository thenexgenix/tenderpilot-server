import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { createTenderSchema } from "@/lib/validation/tender";
import { createHash } from "node:crypto";
import {
  deleteStoredFile,
  isOwnedBlobStorageKey,
  readStoredFile,
  savePdfFile,
} from "@/lib/storage";
import { validatePdfBuffer, validatePdfUpload } from "@/lib/validation/pdf";

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
        sourceType: true,
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

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_MULTIPART_FORM",
          message: "The upload form is invalid.",
        },
      },
      { status: 400 },
    );
  }

  const tenderResult = createTenderSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    issuerName: String(formData.get("issuerName") ?? ""),
    reference: String(formData.get("reference") ?? ""),
    sourceType: String(formData.get("sourceType") ?? "ACTIVE"),
    deadlineAt: String(formData.get("deadlineAt") ?? ""),
    notes: String(formData.get("notes") ?? ""),
  });

  if (!tenderResult.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Please check the submitted fields.",
          fields: tenderResult.error.flatten().fieldErrors,
        },
      },
      { status: 400 },
    );
  }

  const requestedStorageKey = formData.get("fileStorageKey");
  const blobStorageKey =
    typeof requestedStorageKey === "string" && requestedStorageKey
      ? requestedStorageKey
      : null;

  let pdfResult: Awaited<ReturnType<typeof validatePdfUpload>>;

  if (blobStorageKey) {
    if (!isOwnedBlobStorageKey(blobStorageKey, user.id)) {
      return NextResponse.json(
        {
          error: {
            code: "INVALID_STORAGE_KEY",
            message: "The uploaded PDF is not valid for this account.",
          },
        },
        { status: 400 },
      );
    }

    try {
      const storedBuffer = await readStoredFile(blobStorageKey);
      pdfResult = validatePdfBuffer(
        storedBuffer,
        String(formData.get("fileOriginalName") ?? "tender.pdf"),
        String(formData.get("fileMimeType") ?? "application/pdf"),
      );
    } catch {
      try {
        await deleteStoredFile(blobStorageKey);
      } catch {
        // Keep the original storage read response.
      }

      return NextResponse.json(
        {
          error: {
            code: "PDF_STORAGE_ERROR",
            message: "Unable to read the uploaded tender PDF.",
          },
        },
        { status: 500 },
      );
    }
  } else {
    pdfResult = await validatePdfUpload(formData.get("file"));
  }

  if (!pdfResult.ok) {
    if (blobStorageKey) {
      try {
        await deleteStoredFile(blobStorageKey);
      } catch {
        // Keep the original validation response.
      }
    }

    return NextResponse.json(
      {
        error: {
          code: pdfResult.code,
          message: pdfResult.message,
        },
      },
      { status: 400 },
    );
  }

  const allowDuplicate = formData.get("allowDuplicate") === "true";

  const fileSha256 = createHash("sha256")
    .update(pdfResult.buffer)
    .digest("hex");

  let storageKey: string | null = blobStorageKey;

  try {
    const duplicateTender = await prisma.tender.findFirst({
      where: {
        ownerId: user.id,
        fileSha256,
        deletedAt: null,
      },
      select: {
        id: true,
        title: true,
      },
    });

    if (duplicateTender && !allowDuplicate) {
      if (storageKey) {
        await deleteStoredFile(storageKey);
        storageKey = null;
      }

      return NextResponse.json(
        {
          error: {
            code: "DUPLICATE_FILE",
            message: `This PDF was already uploaded as "${duplicateTender.title}".`,
            existingTenderId: duplicateTender.id,
          },
        },
        { status: 409 },
      );
    }

    storageKey ??= await savePdfFile(pdfResult.buffer);

    const { title, issuerName, reference, sourceType, deadlineAt, notes } =
      tenderResult.data;

    const tender = await prisma.tender.create({
      data: {
        ownerId: user.id,
        title,
        issuerName,
        reference: reference || null,
        sourceType,
        deadlineAt: deadlineAt ? new Date(deadlineAt) : null,
        notes: notes || null,
        status: "DRAFT",
        stage: "PDF_UPLOADED",
        fileStorageKey: storageKey,
        fileOriginalName: pdfResult.originalName,
        fileMimeType: pdfResult.mimeType,
        fileSizeBytes: pdfResult.sizeBytes,
        fileSha256,
        fileUploadedAt: new Date(),
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
        fileOriginalName: true,
        fileSizeBytes: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: tender }, { status: 201 });
  } catch {
    if (storageKey) {
      try {
        await deleteStoredFile(storageKey);
      } catch {
        // Keep the original database/storage error response.
      }
    }

    return NextResponse.json(
      {
        error: {
          code: "UPLOAD_FAILED",
          message: "Unable to store the tender PDF.",
        },
      },
      { status: 500 },
    );
  }
}
