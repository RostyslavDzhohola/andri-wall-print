import { AR_SAMPLES, type ArSample } from "@/lib/ar-sample";
import { hasReadyArAssetUrls } from "@/lib/ar-launcher";

export type PublicPreviewResult =
  | {
      status: "ready";
      sample: ArSample;
      source: "convex" | "local-fallback";
    }
  | {
      status: "unavailable";
      slug: string;
      reason: string;
    };

type ConvexSuccessResponse = {
  status: "success";
  value: unknown;
};

type ConvexErrorResponse = {
  status: "error";
  errorMessage?: string;
};

type ConvexHttpResponse = ConvexSuccessResponse | ConvexErrorResponse;

type FetchLike = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    cache: "no-store";
  }
) => Promise<Pick<Response, "json" | "ok" | "status">>;

export type PublicPreviewOptions = {
  convexUrl?: string;
  allowLocalFallback?: boolean;
  fetcher?: FetchLike;
};

function readConvexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
}

function normalizeConvexUrl(convexUrl: string) {
  return convexUrl.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function parseConvexPreviewValue(value: unknown): ArSample | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id) ?? readString(value.slug);
  const title = readString(value.title);
  const description = readString(value.description);
  const print = isRecord(value.print) ? value.print : null;
  const assets = isRecord(value.assets) ? value.assets : null;

  if (!id || !title || !description || !print || !assets) {
    return null;
  }

  const aspectRatio = readString(print.aspectRatio);
  const widthMeters = readNumber(print.widthMeters);
  const heightMeters = readNumber(print.heightMeters);
  const label = readString(print.label);
  const poster = readString(assets.poster);
  const glb = readString(assets.glb);
  const usdz = readString(assets.usdz);

  if (!aspectRatio || widthMeters === null || heightMeters === null || !label || !poster || !glb || !usdz) {
    return null;
  }

  return {
    id,
    title,
    description,
    print: {
      aspectRatio,
      widthMeters,
      heightMeters,
      label
    },
    assets: {
      poster,
      glb,
      usdz
    }
  };
}

export async function getPublicPreview(slug: string, options: PublicPreviewOptions = {}): Promise<PublicPreviewResult> {
  const convexUrl = options.convexUrl ?? readConvexUrl();

  if (convexUrl) {
    const response = await (options.fetcher ?? fetch)(`${normalizeConvexUrl(convexUrl)}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        path: "arPreviews:getPublicPreview",
        args: { slug },
        format: "json"
      }),
      cache: "no-store"
    });

    if (!response.ok) {
      return {
        status: "unavailable",
        slug,
        reason: `Convex query returned HTTP ${response.status}.`
      };
    }

    const body = (await response.json()) as ConvexHttpResponse;

    if (body.status === "error") {
      return {
        status: "unavailable",
        slug,
        reason: body.errorMessage ?? "Convex query failed."
      };
    }

    const sample = parseConvexPreviewValue(body.value);

    if (sample && hasReadyArAssetUrls(sample)) {
      return {
        status: "ready",
        sample,
        source: "convex"
      };
    }

    return {
      status: "unavailable",
      slug,
      reason: "Convex preview is missing one or more asset URLs."
    };
  }

  if (options.allowLocalFallback ?? process.env.PHASE0_PREVIEW_LOCAL_FALLBACK === "1") {
    const sample = AR_SAMPLES.find((candidate) => candidate.id === slug);

    if (sample) {
      return {
        status: "ready",
        sample,
        source: "local-fallback"
      };
    }
  }

  return {
    status: "unavailable",
    slug,
    reason: "Convex URL is not configured."
  };
}
