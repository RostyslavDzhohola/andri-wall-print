import { NextResponse } from "next/server";

import { submitPublicPreviewConfirmation } from "@/lib/convex-public-confirmation";
import { normalizePreviewConfirmationNote } from "@/lib/preview-confirmation-contract";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "unavailable", reason: "Invalid confirmation request." }, { status: 400 });
  }

  if (!isRecord(body) || typeof body.publicSlug !== "string" || !body.publicSlug.trim()) {
    return NextResponse.json({ status: "unavailable", reason: "Invalid confirmation request." }, { status: 400 });
  }

  const result = await submitPublicPreviewConfirmation({
    publicSlug: body.publicSlug.trim(),
    buyerNote: normalizePreviewConfirmationNote(body.buyerNote)
  });

  return NextResponse.json(result, { status: result.status === "confirmed" ? 200 : 503 });
}
