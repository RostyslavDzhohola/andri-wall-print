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

export const PREVIEW_BUNDLE_SOURCE_KINDS = ["upload", "sample", "ai_concept"] as const;

export type PreviewBundleSourceKind = (typeof PREVIEW_BUNDLE_SOURCE_KINDS)[number];

export const PREVIEW_BUNDLE_PRINT_UNITS = ["cm", "in"] as const;

export type PreviewBundlePrintUnit = (typeof PREVIEW_BUNDLE_PRINT_UNITS)[number];

export const PREVIEW_BUNDLE_PRINT_SIZE_LIMITS = {
  minCentimeters: 30,
  maxCentimeters: 305,
  minInches: 12,
  maxInches: 120
} as const;

export type PreviewBundlePrintDimensionInput = {
  width: number;
  height: number;
  unit: PreviewBundlePrintUnit;
};

export type PreviewBundlePrintValidationResult =
  | {
      ok: true;
      print: PreviewBundlePrint;
      reason: null;
    }
  | {
      ok: false;
      print: null;
      reason: string;
    };

export type PreviewBundleSourceForKey = {
  kind: PreviewBundleSourceKind;
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
  label: "1.5 ft x 3 ft"
};

export const PREVIEW_BUNDLE_SOURCE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const PREVIEW_BUNDLE_GENERATOR_TEXTURE_CONTENT_TYPES = ["image/png"] as const;
export const PREVIEW_BUNDLE_MAX_SOURCE_BYTES = 10_000_000;
export const PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES = 4_000_000;
export const PREVIEW_BUNDLE_PUBLIC_SLUG_BYTES = 12;

export function isPreviewBundleStatus(status: string): status is PreviewBundleStatus {
  return PREVIEW_BUNDLE_STATUSES.includes(status as PreviewBundleStatus);
}

export function validatePreviewSourceUpload(input: { contentType: string; byteLength: number }) {
  if (!PREVIEW_BUNDLE_SOURCE_CONTENT_TYPES.includes(input.contentType as (typeof PREVIEW_BUNDLE_SOURCE_CONTENT_TYPES)[number])) {
    return {
      ok: false,
      reason: "Upload must be a JPEG, PNG, or WebP image."
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

export function validatePreviewBundleUpload(input: { contentType: string; byteLength: number }) {
  if (
    !PREVIEW_BUNDLE_GENERATOR_TEXTURE_CONTENT_TYPES.includes(
      input.contentType as (typeof PREVIEW_BUNDLE_GENERATOR_TEXTURE_CONTENT_TYPES)[number]
    )
  ) {
    return {
      ok: false,
      reason: "Prepared upload must be a PNG image before AR generation."
    };
  }

  if (!Number.isSafeInteger(input.byteLength) || input.byteLength <= 0) {
    return {
      ok: false,
      reason: "Upload size could not be verified."
    };
  }

  if (input.byteLength > PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES) {
    return {
      ok: false,
      reason: `Prepared upload must be ${Math.round(PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES / 1_000_000)} MB or smaller.`
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

const CM_PER_INCH = 2.54;
const METERS_PER_FOOT = 0.3048;
const SQ_FT_PER_SQ_METER = 10.76391041671;

function roundTo(value: number, decimals: number) {
  const multiplier = 10 ** decimals;

  return Math.round((value + Number.EPSILON) * multiplier) / multiplier;
}

function formatDecimal(value: number, decimals: number) {
  const rounded = roundTo(value, decimals);

  return Number.isInteger(rounded) ? `${rounded}` : rounded.toFixed(decimals).replace(/0+$/, "").replace(/\.$/, "");
}

function formatCentimeters(valueCm: number) {
  return formatDecimal(valueCm, valueCm % 1 === 0 ? 0 : 1);
}

function formatAspectRatioPart(valueCm: number) {
  return formatDecimal(valueCm, valueCm % 1 === 0 ? 0 : 1);
}

function printSizeBoundaryReason(dimensionName: "width" | "height", unit: PreviewBundlePrintUnit) {
  const label = dimensionName === "width" ? "Width" : "Height";

  if (unit === "in") {
    return `${label} must be between ${PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.minInches} and ${PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.maxInches} in (${PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.minCentimeters} and ${PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.maxCentimeters} cm).`;
  }

  return `${label} must be between ${PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.minCentimeters} and ${PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.maxCentimeters} cm (${PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.minInches} and ${PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.maxInches} in).`;
}

export function inchesToCentimeters(valueInches: number) {
  return valueInches * CM_PER_INCH;
}

export function centimetersToInches(valueCentimeters: number) {
  return valueCentimeters / CM_PER_INCH;
}

export function metersToCentimeters(valueMeters: number) {
  return valueMeters * 100;
}

export function formatFeetInchesFromMeters(valueMeters: number) {
  const totalInches = Math.max(1, Math.round(centimetersToInches(metersToCentimeters(valueMeters))));
  const feet = Math.floor(totalInches / 12);
  const inches = totalInches % 12;

  if (feet === 0) {
    return `${inches} in`;
  }

  if (inches === 0) {
    return `${feet} ft`;
  }

  return `${feet} ft ${inches} in`;
}

export function formatDecimalFeetFromMeters(valueMeters: number) {
  const feet = Math.max(0.1, valueMeters / METERS_PER_FOOT);

  return `${formatDecimal(feet, 1)} ft`;
}

export function formatPreviewBundlePrintDimensions(print: Pick<PreviewBundlePrint, "widthMeters" | "heightMeters">) {
  return `${formatDecimalFeetFromMeters(print.widthMeters)} x ${formatDecimalFeetFromMeters(print.heightMeters)}`;
}

export function getPreviewBundlePrintArea(print: Pick<PreviewBundlePrint, "widthMeters" | "heightMeters">) {
  const squareMeters = print.widthMeters * print.heightMeters;

  return {
    squareMeters,
    squareFeet: squareMeters * SQ_FT_PER_SQ_METER
  };
}

export function formatPreviewBundlePrintArea(print: Pick<PreviewBundlePrint, "widthMeters" | "heightMeters">) {
  const area = getPreviewBundlePrintArea(print);

  return `${formatDecimal(area.squareFeet, 1)} sq ft`;
}

export function normalizePreviewBundlePrintDisplay<T extends PreviewBundlePrint>(print: T): T {
  return {
    ...print,
    label: formatPreviewBundlePrintDimensions(print)
  };
}

export function validatePreviewBundlePrintSize(print: Pick<PreviewBundlePrint, "widthMeters" | "heightMeters">) {
  if (!Number.isFinite(print.widthMeters) || print.widthMeters <= 0) {
    return {
      ok: false as const,
      reason: "print.widthMeters must be a positive finite number."
    };
  }

  if (!Number.isFinite(print.heightMeters) || print.heightMeters <= 0) {
    return {
      ok: false as const,
      reason: "print.heightMeters must be a positive finite number."
    };
  }

  const widthCm = metersToCentimeters(print.widthMeters);
  const heightCm = metersToCentimeters(print.heightMeters);

  if (widthCm < PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.minCentimeters || widthCm > PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.maxCentimeters) {
    return {
      ok: false as const,
      reason: `print.widthMeters must be between ${PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.minCentimeters / 100} and ${PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.maxCentimeters / 100} meters.`
    };
  }

  if (heightCm < PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.minCentimeters || heightCm > PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.maxCentimeters) {
    return {
      ok: false as const,
      reason: `print.heightMeters must be between ${PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.minCentimeters / 100} and ${PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.maxCentimeters / 100} meters.`
    };
  }

  return {
    ok: true as const,
    reason: null
  };
}

export function makePreviewBundlePrintFromCentimeters(widthCm: number, heightCm: number, fallback = DEFAULT_PREVIEW_BUNDLE_PRINT) {
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) {
    return fallback;
  }

  const widthMeters = roundTo(widthCm / 100, 4);
  const heightMeters = roundTo(heightCm / 100, 4);
  const sizeValidation = validatePreviewBundlePrintSize({ widthMeters, heightMeters });

  if (!sizeValidation.ok) {
    return fallback;
  }

  const print = {
    aspectRatio: `${formatAspectRatioPart(widthCm)}:${formatAspectRatioPart(heightCm)}`,
    widthMeters,
    heightMeters,
    label: ""
  };

  return {
    ...print,
    label: formatPreviewBundlePrintDimensions(print)
  };
}

export function makePreviewBundlePrintFromDimensions(input: PreviewBundlePrintDimensionInput, fallback = DEFAULT_PREVIEW_BUNDLE_PRINT) {
  if (!Number.isFinite(input.width) || !Number.isFinite(input.height)) {
    return fallback;
  }

  const widthCm = input.unit === "in" ? inchesToCentimeters(input.width) : input.width;
  const heightCm = input.unit === "in" ? inchesToCentimeters(input.height) : input.height;

  return makePreviewBundlePrintFromCentimeters(widthCm, heightCm, fallback);
}

export function validatePreviewBundlePrintDimensions(input: PreviewBundlePrintDimensionInput): PreviewBundlePrintValidationResult {
  if (!PREVIEW_BUNDLE_PRINT_UNITS.includes(input.unit)) {
    return {
      ok: false,
      print: null,
      reason: "Choose centimeters or inches for the print size."
    };
  }

  if (!Number.isFinite(input.width) || input.width <= 0) {
    return {
      ok: false,
      print: null,
      reason: "Enter a positive width."
    };
  }

  if (!Number.isFinite(input.height) || input.height <= 0) {
    return {
      ok: false,
      print: null,
      reason: "Enter a positive height."
    };
  }

  const widthCm = input.unit === "in" ? inchesToCentimeters(input.width) : input.width;
  const heightCm = input.unit === "in" ? inchesToCentimeters(input.height) : input.height;

  if (widthCm < PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.minCentimeters || widthCm > PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.maxCentimeters) {
    return {
      ok: false,
      print: null,
      reason: printSizeBoundaryReason("width", input.unit)
    };
  }

  if (heightCm < PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.minCentimeters || heightCm > PREVIEW_BUNDLE_PRINT_SIZE_LIMITS.maxCentimeters) {
    return {
      ok: false,
      print: null,
      reason: printSizeBoundaryReason("height", input.unit)
    };
  }

  return {
    ok: true,
    print: makePreviewBundlePrintFromCentimeters(widthCm, heightCm),
    reason: null
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
  const keyInput = {
    ...input,
    print: {
      aspectRatio: input.print.aspectRatio,
      widthMeters: input.print.widthMeters,
      heightMeters: input.print.heightMeters
    }
  };

  return `${input.generatorVersion}:${hashStableString(stableStringify(keyInput))}`;
}

export function createPreviewBundlePublicSlug(randomBytes?: Uint8Array) {
  const bytes = randomBytes ?? crypto.getRandomValues(new Uint8Array(PREVIEW_BUNDLE_PUBLIC_SLUG_BYTES));
  const token = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

  return `p-${token}`;
}
