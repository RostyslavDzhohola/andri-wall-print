import { NextResponse } from "next/server";

import { readConvexRuntimeUrl } from "@/lib/runtime-env";

export const runtime = "nodejs";
export const maxDuration = 60;

type ConvexResponse =
  | { status: "success"; value: unknown }
  | { status: "error"; errorMessage?: string };

function convexEndpoint() {
  return readConvexRuntimeUrl()?.replace(/\/+$/, "") ?? null;
}

async function callConvex(kind: "mutation" | "query", path: string, args: unknown) {
  const convexUrl = convexEndpoint();

  if (!convexUrl) {
    throw new Error("Wall preview uploads are temporarily unavailable.");
  }

  const response = await fetch(`${convexUrl}/api/${kind}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({ path, args, format: "json" }),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error("Wall preview uploads are temporarily unavailable.");
  }

  const body = (await response.json()) as ConvexResponse;

  if (body.status === "error") {
    throw new Error(body.errorMessage || "Wall preview could not be prepared.");
  }

  return body.value;
}

export async function GET(request: Request) {
  const publicSlug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";

  if (!publicSlug) {
    return NextResponse.json({ ok: false, message: "Wall preview status is unavailable." }, { status: 400 });
  }

  try {
    const preview = await callConvex("query", "arPreviews:getPublicPreview", { slug: publicSlug });

    return NextResponse.json(preview, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Wall preview status is unavailable." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "Wall preview request could not be read." }, { status: 400 });
  }

  try {
    if (body.action === "upload_url") {
      const uploadUrl = await callConvex("mutation", "previewBundles:generateHomepageUploadUrl", {});

      return NextResponse.json({ ok: true, uploadUrl });
    }

    if (body.action === "create") {
      const created = await callConvex("mutation", "previewBundles:createHomepageUploadBundle", body.input);

      return NextResponse.json({ ok: true, preview: created });
    }

    return NextResponse.json({ ok: false, message: "Wall preview action is not supported." }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Wall preview could not be prepared." },
      { status: 503 }
    );
  }
}
