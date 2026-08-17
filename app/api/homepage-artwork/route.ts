import { parseHomepageArtworkPostBody } from "@/lib/homepage-artwork-contract";
import { noStoreJson } from "@/lib/private-api-response";
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
    throw new Error("Wall preview could not be prepared.");
  }

  return body.value;
}

export async function GET(request: Request) {
  const publicSlug = new URL(request.url).searchParams.get("slug")?.trim() ?? "";

  if (!publicSlug) {
    return noStoreJson({ ok: false, message: "Wall preview status is unavailable." }, { status: 400 });
  }

  try {
    const preview = await callConvex("query", "arPreviews:getPublicPreview", { slug: publicSlug });

    return noStoreJson(preview);
  } catch {
    return noStoreJson({ ok: false, message: "Wall preview status is unavailable." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return noStoreJson({ ok: false, message: "Wall preview request could not be read." }, { status: 400 });
  }

  const body = parseHomepageArtworkPostBody(rawBody);

  if (!body) {
    return noStoreJson({ ok: false, message: "Wall preview request is invalid." }, { status: 400 });
  }

  try {
    if (body.action === "upload_url") {
      const uploadUrl = await callConvex("mutation", "previewBundles:generateHomepageUploadUrl", {});

      return noStoreJson({ ok: true, uploadUrl });
    }

    const created = await callConvex("mutation", "previewBundles:createHomepageUploadBundle", body.input);

    return noStoreJson({ ok: true, preview: created });
  } catch {
    return noStoreJson({ ok: false, message: "Wall preview could not be prepared." }, { status: 503 });
  }
}
