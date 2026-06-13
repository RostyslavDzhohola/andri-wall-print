import { AR_SAMPLES, type ArSample } from "./ar-sample";
import { hasReadyArAssetUrls } from "./ar-launcher";
import { formatPreviewBundlePrintDimensions } from "./preview-bundle-contract";
import { readConvexRuntimeUrl, readPhase0PreviewLocalFallback } from "./runtime-env";

export type PublicPreviewResult =
  | {
      status: "ready";
      sample: ArSample;
      source: "convex" | "local-fallback";
    }
  | {
      status: "preparing";
      slug: string;
      reason: string;
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
  return readConvexRuntimeUrl();
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

function readPreviewStatus(value: unknown) {
  if (!isRecord(value)) {
    return null;
  }

  return readString(value.status);
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
  const poster = readString(assets.poster);
  const glb = readString(assets.glb);
  const usdz = readString(assets.usdz);

  if (!aspectRatio || widthMeters === null || heightMeters === null || !poster || !glb || !usdz) {
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
      label: formatPreviewBundlePrintDimensions({ widthMeters, heightMeters })
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
  const allowLocalFallback = options.allowLocalFallback ?? readPhase0PreviewLocalFallback();

  if (allowLocalFallback) {
    const sample = AR_SAMPLES.find((candidate) => candidate.id === slug);

    if (sample) {
      return {
        status: "ready",
        sample,
        source: "local-fallback"
      };
    }

    if (readPhase0PreviewLocalFallback() || !convexUrl) {
      return {
        status: "unavailable",
        slug,
        reason: "This client preview is unavailable."
      };
    }
  }

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
        reason: "This client preview is unavailable."
      };
    }

    const body = (await response.json()) as ConvexHttpResponse;

    if (body.status === "error") {
      return {
        status: "unavailable",
        slug,
        reason: "This client preview is unavailable."
      };
    }

    const sample = parseConvexPreviewValue(body.value);
    const previewStatus = readPreviewStatus(body.value);

    if (previewStatus === "preparing") {
      return {
        status: "preparing",
        slug,
        reason: "This client preview is being prepared. Check back shortly."
      };
    }

    if (previewStatus === "unavailable") {
      return {
        status: "unavailable",
        slug,
        reason: "This client preview is unavailable."
      };
    }

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
      reason: "This client preview is not available."
    };
  }

  return {
    status: "unavailable",
    slug,
    reason: "This client preview is unavailable."
  };
}
