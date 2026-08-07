import type { ArSample } from "./ar-sample";
import { parseConvexPreviewValue } from "./convex-public-preview";
import { readConvexRuntimeUrl, readWallPrintProCommunityGalleryEnabled } from "./runtime-env";

type FetchLike = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    cache: "no-store";
    signal: AbortSignal;
  }
) => Promise<Pick<Response, "json" | "ok">>;

type GalleryOptions = {
  convexUrl?: string;
  enabled?: boolean;
  fetcher?: FetchLike;
};

export type PublicGalleryPage = {
  samples: ArSample[];
  continueCursor: string | null;
  isDone: boolean;
};

function normalizeConvexUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

async function callGalleryQuery(path: string, args: Record<string, unknown>, options: GalleryOptions) {
  const convexUrl = options.convexUrl ?? readConvexRuntimeUrl();
  const enabled = options.enabled ?? readWallPrintProCommunityGalleryEnabled();

  if (!convexUrl || !enabled) {
    return null;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 2_500);

  try {
    const response = await (options.fetcher ?? fetch)(`${normalizeConvexUrl(convexUrl)}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({ path, args, format: "json" }),
      cache: "no-store",
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    const body = (await response.json()) as unknown;

    if (!isRecord(body) || body.status !== "success") {
      return null;
    }

    return body.value;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getPublicGalleryPage(cursor?: string, options: GalleryOptions = {}): Promise<PublicGalleryPage> {
  const value = await callGalleryQuery("gallery:listPublished", cursor ? { cursor } : {}, options);

  if (!isRecord(value) || !Array.isArray(value.page)) {
    return { samples: [], continueCursor: null, isDone: true };
  }

  const samples = value.page
    .map(parseConvexPreviewValue)
    .filter((sample): sample is ArSample => sample?.sourceKind === "community_ai");

  return {
    samples,
    continueCursor: typeof value.continueCursor === "string" ? value.continueCursor : null,
    isDone: value.isDone === true
  };
}

export async function getPublishedGalleryEntryBySlug(slug: string, options: GalleryOptions = {}) {
  const normalizedSlug = slug.trim().slice(0, 160);

  if (!normalizedSlug) {
    return null;
  }

  const value = await callGalleryQuery("gallery:getPublishedBySlug", { slug: normalizedSlug }, options);
  const sample = parseConvexPreviewValue(value);

  return sample?.sourceKind === "community_ai" ? sample : null;
}
