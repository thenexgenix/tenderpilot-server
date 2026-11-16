import { issueSignedToken } from "@vercel/blob";
import {
  handleUploadPresigned,
  type HandleUploadPresignedBody,
} from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { isOwnedBlobStorageKey } from "@/lib/storage";
import { MAX_PDF_SIZE_BYTES } from "@/lib/validation/pdf";

export async function POST(request: Request) {
  let body: HandleUploadPresignedBody;

  try {
    body = (await request.json()) as HandleUploadPresignedBody;
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_UPLOAD_REQUEST",
          message: "Invalid upload request.",
        },
      },
      { status: 400 },
    );
  }

  try {
    const response = await handleUploadPresigned({
      body,
      request,
      getSignedToken: async (pathname) => {
        const user = await getCurrentUser();

        if (!user || !isOwnedBlobStorageKey(pathname, user.id)) {
          throw new Error("Upload is not authorized.");
        }

        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: ["application/pdf"],
          maximumSizeInBytes: MAX_PDF_SIZE_BYTES,
        });

        return {
          token,
          urlOptions: {
            allowedContentTypes: ["application/pdf"],
            maximumSizeInBytes: MAX_PDF_SIZE_BYTES,
          },
        };
      },
    });

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      {
        error: {
          code: "BLOB_UPLOAD_FAILED",
          message:
            error instanceof Error
              ? error.message
              : "Unable to prepare the PDF upload.",
        },
      },
      { status: 400 },
    );
  }
}
