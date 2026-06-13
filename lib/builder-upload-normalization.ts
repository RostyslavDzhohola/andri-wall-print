import {
  PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES,
  PREVIEW_BUNDLE_MAX_SOURCE_BYTES,
  PREVIEW_BUNDLE_SOURCE_CONTENT_TYPES,
  validatePreviewBundleUpload,
  validatePreviewSourceUpload
} from "./preview-bundle-contract";

export const BUILDER_UPLOAD_SOURCE_CONTENT_TYPES = PREVIEW_BUNDLE_SOURCE_CONTENT_TYPES;
export const BUILDER_UPLOAD_MAX_SOURCE_BYTES = PREVIEW_BUNDLE_MAX_SOURCE_BYTES;
export const BUILDER_UPLOAD_MAX_LONG_EDGE_PX = 2048;
export const BUILDER_UPLOAD_MIN_SHORT_EDGE_PX = 512;
const PNG_BUDGET_RETRY_SAFETY_FACTOR = 0.92;
const MAX_PNG_BUDGET_ATTEMPTS = 6;

export type BuilderUploadValidation = {
  ok: boolean;
  reason: string | null;
};

export type NormalizedBuilderUpload = {
  file: File;
  widthPx: number;
  heightPx: number;
  originalWidthPx: number;
  originalHeightPx: number;
  originalContentType: string;
  originalByteLength: number;
  wasResized: boolean;
};

export function validateBuilderSourceUpload(input: { contentType: string; byteLength: number }): BuilderUploadValidation {
  return validatePreviewSourceUpload(input);
}

export function computeNormalizedImageDimensions(widthPx: number, heightPx: number, maxLongEdgePx = BUILDER_UPLOAD_MAX_LONG_EDGE_PX) {
  if (
    !Number.isSafeInteger(widthPx) ||
    !Number.isSafeInteger(heightPx) ||
    !Number.isSafeInteger(maxLongEdgePx) ||
    widthPx <= 0 ||
    heightPx <= 0 ||
    maxLongEdgePx <= 0
  ) {
    throw new Error("Image dimensions must be positive integers.");
  }

  const longEdge = Math.max(widthPx, heightPx);
  const scale = Math.min(1, maxLongEdgePx / longEdge);
  const width = Math.max(1, Math.round(widthPx * scale));
  const height = Math.max(1, Math.round(heightPx * scale));

  return {
    width,
    height,
    wasResized: scale < 1
  };
}

export function validateBuilderImageDimensions(widthPx: number, heightPx: number): BuilderUploadValidation {
  if (!Number.isSafeInteger(widthPx) || !Number.isSafeInteger(heightPx) || widthPx <= 0 || heightPx <= 0) {
    return {
      ok: false,
      reason: "Uploaded image dimensions could not be verified."
    };
  }

  if (Math.min(widthPx, heightPx) < BUILDER_UPLOAD_MIN_SHORT_EDGE_PX) {
    return {
      ok: false,
      reason: `Upload must be at least ${BUILDER_UPLOAD_MIN_SHORT_EDGE_PX}px on the shortest side.`
    };
  }

  return {
    ok: true,
    reason: null
  };
}

export function computePngBudgetRetryDimensions(input: {
  widthPx: number;
  heightPx: number;
  byteLength: number;
  maxByteLength?: number;
  minShortEdgePx?: number;
}) {
  const maxByteLength = input.maxByteLength ?? PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES;
  const minShortEdgePx = input.minShortEdgePx ?? BUILDER_UPLOAD_MIN_SHORT_EDGE_PX;

  if (
    !Number.isSafeInteger(input.widthPx) ||
    !Number.isSafeInteger(input.heightPx) ||
    !Number.isSafeInteger(input.byteLength) ||
    !Number.isSafeInteger(maxByteLength) ||
    !Number.isSafeInteger(minShortEdgePx) ||
    input.widthPx <= 0 ||
    input.heightPx <= 0 ||
    input.byteLength <= 0 ||
    maxByteLength <= 0 ||
    minShortEdgePx <= 0
  ) {
    throw new Error("Image dimensions and byte lengths must be positive integers.");
  }

  if (input.byteLength <= maxByteLength) {
    return null;
  }

  const scale = Math.min(0.95, Math.sqrt(maxByteLength / input.byteLength) * PNG_BUDGET_RETRY_SAFETY_FACTOR);
  const width = Math.max(1, Math.floor(input.widthPx * scale));
  const height = Math.max(1, Math.floor(input.heightPx * scale));

  if (width >= input.widthPx || height >= input.heightPx || Math.min(width, height) < minShortEdgePx) {
    return null;
  }

  return {
    width,
    height,
    wasResized: true
  };
}

export function validateNormalizedPngUpload(byteLength: number): BuilderUploadValidation {
  const validation = validatePreviewBundleUpload({
    contentType: "image/png",
    byteLength
  });

  if (!validation.ok) {
    return {
      ok: false,
      reason: `Prepared upload is too large for this wall preview. ${validation.reason}`
    };
  }

  return {
    ok: true,
    reason: null
  };
}

function normalizedPngName(fileName: string) {
  const stem =
    fileName
      .replace(/\.[^.]+$/, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]+/g, "")
      .replace(/^-+|-+$/g, "")
      .slice(0, 64) || "wall-print";

  return `${stem}.png`;
}

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in globalThis) {
    try {
      return await createImageBitmap(file);
    } catch {
      // Some browsers can decode a format through <img> even when createImageBitmap rejects it.
    }
  }

  if (typeof document === "undefined") {
    throw new Error("Image preparation is only available in a browser.");
  }

  return await new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Could not prepare uploaded image."));
    };
    image.src = objectUrl;
  });
}

function imageSize(image: ImageBitmap | HTMLImageElement) {
  if ("naturalWidth" in image && "naturalHeight" in image) {
    return {
      width: image.naturalWidth,
      height: image.naturalHeight
    };
  }

  return {
    width: image.width,
    height: image.height
  };
}

function canvasToPngBlob(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Could not prepare image to PNG."));
        return;
      }

      resolve(blob);
    }, "image/png");
  });
}

function drawImageToPngBlob(image: ImageBitmap | HTMLImageElement, widthPx: number, heightPx: number) {
  const canvas = document.createElement("canvas");

  canvas.width = widthPx;
  canvas.height = heightPx;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare the uploaded artwork.");
  }

  context.clearRect(0, 0, widthPx, heightPx);
  context.drawImage(image, 0, 0, widthPx, heightPx);

  return canvasToPngBlob(canvas);
}

async function makeBudgetedPngBlob(image: ImageBitmap | HTMLImageElement, initialDimensions: { width: number; height: number }) {
  let dimensions = initialDimensions;

  for (let attempt = 0; attempt < MAX_PNG_BUDGET_ATTEMPTS; attempt += 1) {
    const blob = await drawImageToPngBlob(image, dimensions.width, dimensions.height);
    const validation = validateNormalizedPngUpload(blob.size);

    if (validation.ok) {
      return {
        blob,
        width: dimensions.width,
        height: dimensions.height
      };
    }

    const retry = computePngBudgetRetryDimensions({
      widthPx: dimensions.width,
      heightPx: dimensions.height,
      byteLength: blob.size
    });

    if (!retry) {
      throw new Error(validation.reason ?? "Prepared upload is too large for this wall preview.");
    }

    dimensions = retry;
  }

  throw new Error(`Prepared upload must be ${Math.round(PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES / 1_000_000)} MB or smaller.`);
}

export async function fingerprintBuilderUpload(file: File) {
  const hash = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());

  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function normalizeBuilderUploadToPng(file: File): Promise<NormalizedBuilderUpload> {
  const sourceValidation = validateBuilderSourceUpload({
    contentType: file.type,
    byteLength: file.size
  });

  if (!sourceValidation.ok) {
    throw new Error(sourceValidation.reason ?? "Upload is not supported.");
  }

  if (typeof document === "undefined") {
    throw new Error("Upload preparation must run in a browser.");
  }

  let decoded: ImageBitmap | HTMLImageElement;

  try {
    decoded = await decodeImage(file);
  } catch {
    throw new Error("Could not read this image. Choose a JPEG, PNG, or WebP file.");
  }

  try {
    const original = imageSize(decoded);
    const dimensionValidation = validateBuilderImageDimensions(original.width, original.height);

    if (!dimensionValidation.ok) {
      throw new Error(dimensionValidation.reason ?? "Uploaded image dimensions could not be verified.");
    }

    const normalized = computeNormalizedImageDimensions(original.width, original.height);
    const prepared = await makeBudgetedPngBlob(decoded, normalized);

    return {
      file: new File([prepared.blob], normalizedPngName(file.name), { type: "image/png" }),
      widthPx: prepared.width,
      heightPx: prepared.height,
      originalWidthPx: original.width,
      originalHeightPx: original.height,
      originalContentType: file.type,
      originalByteLength: file.size,
      wasResized: normalized.wasResized || prepared.width !== original.width || prepared.height !== original.height
    };
  } finally {
    if ("close" in decoded) {
      decoded.close();
    }
  }
}
