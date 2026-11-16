import { Buffer } from "node:buffer";

export const MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024;

export type PdfValidationResult =
  | {
      ok: false;
      code: string;
      message: string;
    }
  | {
      ok: true;
      buffer: Buffer;
      originalName: string;
      mimeType: string;
      sizeBytes: number;
    };

export function validatePdfBuffer(
  buffer: Buffer,
  originalName: string,
  mimeType = "application/pdf",
): PdfValidationResult {
  const normalizedName = originalName.trim();

  if (!normalizedName.toLowerCase().endsWith(".pdf")) {
    return {
      ok: false,
      code: "INVALID_EXTENSION",
      message: "Only PDF files are allowed.",
    };
  }

  if (buffer.length === 0) {
    return {
      ok: false,
      code: "EMPTY_FILE",
      message: "The selected file is empty.",
    };
  }

  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    return {
      ok: false,
      code: "FILE_TOO_LARGE",
      message: "PDF files must be 20 MB or smaller.",
    };
  }

  const signature = buffer.subarray(0, 5).toString("ascii");

  if (signature !== "%PDF-") {
    return {
      ok: false,
      code: "INVALID_PDF_SIGNATURE",
      message: "The selected file is not a valid PDF.",
    };
  }

  return {
    ok: true,
    buffer,
    originalName: normalizedName,
    mimeType: mimeType || "application/pdf",
    sizeBytes: buffer.length,
  };
}

export async function validatePdfUpload(
  value: FormDataEntryValue | null,
): Promise<PdfValidationResult> {
  if (!(value instanceof File)) {
    return {
      ok: false,
      code: "PDF_REQUIRED",
      message: "Please select a PDF file.",
    };
  }

  const buffer = Buffer.from(await value.arrayBuffer());

  return validatePdfBuffer(buffer, value.name, value.type || "application/pdf");
}
