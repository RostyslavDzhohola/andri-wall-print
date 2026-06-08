export const PREVIEW_GENERATOR_VERSION = "ts-flat-plane-v1";

export const PREVIEW_BUNDLE_STATUSES = [
  "uploaded",
  "validating",
  "rejected",
  "generating",
  "ready",
  "failed",
  "revoked"
] as const;

export type PreviewBundleStatus = (typeof PREVIEW_BUNDLE_STATUSES)[number];

export type PreviewBundleCrop = {
  mode: "contain" | "cover";
};

export type PreviewBundlePrint = {
  aspectRatio: string;
  widthMeters: number;
  heightMeters: number;
  label: string;
};

export type PreviewBundleSourceForKey = {
  kind: "upload" | "sample";
  sourceId: string;
  contentType?: string;
  byteLength?: number;
  originalFileName?: string;
};

export type PreviewBundleIdempotencyInput = {
  sellerSubject: string;
  source: PreviewBundleSourceForKey;
  crop: PreviewBundleCrop;
  print: PreviewBundlePrint;
  generatorVersion: string;
};

export const DEFAULT_PREVIEW_BUNDLE_CROP: PreviewBundleCrop = {
  mode: "contain"
};

export const DEFAULT_PREVIEW_BUNDLE_PRINT: PreviewBundlePrint = {
  aspectRatio: "1:2",
  widthMeters: 0.45,
  heightMeters: 0.9,
  label: "45 x 90 cm"
};

export const PREVIEW_BUNDLE_UPLOAD_CONTENT_TYPES = ["image/png"] as const;
export const PREVIEW_BUNDLE_MAX_SOURCE_BYTES = 8_000_000;
export const PREVIEW_BUNDLE_PUBLIC_SLUG_BYTES = 12;

export function isPreviewBundleStatus(status: string): status is PreviewBundleStatus {
  return PREVIEW_BUNDLE_STATUSES.includes(status as PreviewBundleStatus);
}

export function validatePreviewBundleUpload(input: { contentType: string; byteLength: number }) {
  if (!PREVIEW_BUNDLE_UPLOAD_CONTENT_TYPES.includes(input.contentType as (typeof PREVIEW_BUNDLE_UPLOAD_CONTENT_TYPES)[number])) {
    return {
      ok: false,
      reason: "Upload must be a PNG image for the current wall preview workflow."
    };
  }

  if (!Number.isSafeInteger(input.byteLength) || input.byteLength <= 0) {
    return {
      ok: false,
      reason: "Upload size could not be verified."
    };
  }

  if (input.byteLength > PREVIEW_BUNDLE_MAX_SOURCE_BYTES) {
    return {
      ok: false,
      reason: `Upload must be ${Math.round(PREVIEW_BUNDLE_MAX_SOURCE_BYTES / 1_000_000)} MB or smaller.`
    };
  }

  return {
    ok: true,
    reason: null
  };
}

export function normalizeBundleTitle(title: string) {
  const normalized = title.trim().replace(/\s+/g, " ");
  return normalized.length > 0 ? normalized : "Untitled wall print";
}

export function makePreviewBundlePrintFromCentimeters(widthCm: number, heightCm: number, fallback = DEFAULT_PREVIEW_BUNDLE_PRINT) {
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
    return fallback;
  }

  return {
    aspectRatio: `${Math.round(widthCm)}:${Math.round(heightCm)}`,
    widthMeters: widthCm / 100,
    heightMeters: heightCm / 100,
    label: `${Math.round(widthCm)} x ${Math.round(heightCm)} cm`
  };
}

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function hashStableString(input: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(36);
}

export function makePreviewBundleIdempotencyKey(input: PreviewBundleIdempotencyInput) {
  return `${input.generatorVersion}:${hashStableString(stableStringify(input))}`;
}

export function createPreviewBundlePublicSlug(randomBytes?: Uint8Array) {
  const bytes = randomBytes ?? crypto.getRandomValues(new Uint8Array(PREVIEW_BUNDLE_PUBLIC_SLUG_BYTES));
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  return `p-${token}`;
}
