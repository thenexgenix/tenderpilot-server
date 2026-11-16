import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";

export async function POST() {
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

  return NextResponse.json({
    data: {
      pathname: `tenders/${user.id}/${randomUUID()}.pdf`,
    },
  });
}
