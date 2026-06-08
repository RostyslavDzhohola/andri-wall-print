import {
  PREVIEW_BUNDLE_MAX_SOURCE_BYTES,
  validatePreviewBundleUpload
} from "./preview-bundle-contract";

export const BUILDER_UPLOAD_SOURCE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const BUILDER_UPLOAD_MAX_SOURCE_BYTES = 10_000_000;
export const BUILDER_UPLOAD_MAX_LONG_EDGE_PX = 2048;

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
  if (!BUILDER_UPLOAD_SOURCE_CONTENT_TYPES.includes(input.contentType as (typeof BUILDER_UPLOAD_SOURCE_CONTENT_TYPES)[number])) {
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

  if (input.byteLength > BUILDER_UPLOAD_MAX_SOURCE_BYTES) {
    return {
      ok: false,
      reason: `Upload must be ${Math.round(BUILDER_UPLOAD_MAX_SOURCE_BYTES / 1_000_000)} MB or smaller.`
    };
  }

  return {
    ok: true,
    reason: null
  };
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
    return await createImageBitmap(file);
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

  const decoded = await decodeImage(file);
  const original = imageSize(decoded);
  const normalized = computeNormalizedImageDimensions(original.width, original.height);
  const canvas = document.createElement("canvas");

  canvas.width = normalized.width;
  canvas.height = normalized.height;

  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Could not prepare the uploaded artwork.");
  }

  context.clearRect(0, 0, normalized.width, normalized.height);
  context.drawImage(decoded, 0, 0, normalized.width, normalized.height);

  if ("close" in decoded) {
    decoded.close();
  }

  const blob = await canvasToPngBlob(canvas);
  const normalizedValidation = validateNormalizedPngUpload(blob.size);

  if (!normalizedValidation.ok) {
    throw new Error(normalizedValidation.reason ?? `Prepared upload must be under ${PREVIEW_BUNDLE_MAX_SOURCE_BYTES} bytes.`);
  }

  return {
    file: new File([blob], normalizedPngName(file.name), { type: "image/png" }),
    widthPx: normalized.width,
    heightPx: normalized.height,
    originalWidthPx: original.width,
    originalHeightPx: original.height,
    originalContentType: file.type,
    originalByteLength: file.size,
    wasResized: normalized.wasResized
  };
}
