import { NextResponse } from "next/server";

import { getPublicGalleryPage } from "@/lib/convex-public-gallery";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cursor = new URL(request.url).searchParams.get("cursor")?.trim().slice(0, 500) || undefined;
  const page = await getPublicGalleryPage(cursor);

  return NextResponse.json(page, {
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
