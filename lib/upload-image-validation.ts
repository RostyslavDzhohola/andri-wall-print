import { PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES, PREVIEW_BUNDLE_MAX_SOURCE_BYTES } from "./preview-bundle-contract";

export type SniffedUploadImageFormat = "jpeg" | "png" | "webp";

export type SniffedUploadImage = {
  format: SniffedUploadImageFormat;
  contentType: "image/jpeg" | "image/png" | "image/webp";
  widthPx: number;
  heightPx: number;
  byteLength: number;
};

export type UploadImageByteValidation =
  | ({
      ok: true;
      reason: null;
    } & SniffedUploadImage)
  | {
      ok: false;
      reason: string;
    };

type SniffImageResult =
  | ({
      ok: true;
    } & SniffedUploadImage)
  | {
      ok: false;
      kind: "malformed" | "unsupported";
    };

type DimensionReasonMessages = {
  unverified: string;
  tooSmall: string;
  tooWide: string;
  tooManyPixels: string;
};

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const;
const JPEG_SIGNATURE = [0xff, 0xd8] as const;

export const PUBLIC_UPLOAD_ACCEPTED_FORMATS_LABEL = "JPEG/PNG/WebP";
export const PUBLIC_UPLOAD_MIN_DIMENSION_PX = 64;
export const PUBLIC_UPLOAD_MAX_DIMENSION_PX = 12_000;
export const PUBLIC_UPLOAD_MAX_TOTAL_PIXELS = 80_000_000;
export const PUBLIC_UPLOAD_UNSUPPORTED_REASON = "Upload must be a JPEG, PNG, or WebP image.";
export const PUBLIC_UPLOAD_MALFORMED_REASON = "Upload appears to be damaged or incomplete. Choose a JPEG, PNG, or WebP file.";
export const PUBLIC_UPLOAD_SIZE_UNVERIFIED_REASON = "Upload size could not be verified.";
export const PUBLIC_UPLOAD_TOO_SMALL_REASON = `Upload must be at least ${PUBLIC_UPLOAD_MIN_DIMENSION_PX}px on both sides. Choose a larger JPEG, PNG, or WebP image.`;
export const PUBLIC_UPLOAD_TOO_WIDE_REASON = `Upload dimensions must be ${PUBLIC_UPLOAD_MAX_DIMENSION_PX}px or smaller on each side.`;
export const PUBLIC_UPLOAD_TOO_MANY_PIXELS_REASON = `Upload must be ${Math.round(PUBLIC_UPLOAD_MAX_TOTAL_PIXELS / 1_000_000)} megapixels or smaller.`;
export const PUBLIC_UPLOAD_DIMENSIONS_UNVERIFIED_REASON =
  "Upload image dimensions could not be verified. Choose a JPEG, PNG, or WebP file.";

export const PREPARED_PNG_INVALID_REASON = "Uploaded artwork is not a valid prepared PNG image. Choose the file again.";
export const PREPARED_PNG_BYTE_LENGTH_MISMATCH_REASON =
  "Uploaded artwork byte length does not match the stored file. Choose the file again.";
export const PREPARED_PNG_TOO_SMALL_REASON = `Prepared upload must be at least ${PUBLIC_UPLOAD_MIN_DIMENSION_PX}px on both sides before AR generation.`;
export const PREPARED_PNG_TOO_WIDE_REASON = `Prepared upload dimensions must be ${PUBLIC_UPLOAD_MAX_DIMENSION_PX}px or smaller on each side before AR generation.`;
export const PREPARED_PNG_TOO_MANY_PIXELS_REASON = `Prepared upload must be ${Math.round(
  PUBLIC_UPLOAD_MAX_TOTAL_PIXELS / 1_000_000
)} megapixels or smaller before AR generation.`;
export const PREPARED_PNG_DIMENSIONS_UNVERIFIED_REASON = "Prepared upload image dimensions could not be verified before AR generation.";

const PUBLIC_DIMENSION_REASONS: DimensionReasonMessages = {
  unverified: PUBLIC_UPLOAD_DIMENSIONS_UNVERIFIED_REASON,
  tooSmall: PUBLIC_UPLOAD_TOO_SMALL_REASON,
  tooWide: PUBLIC_UPLOAD_TOO_WIDE_REASON,
  tooManyPixels: PUBLIC_UPLOAD_TOO_MANY_PIXELS_REASON
};

const PREPARED_PNG_DIMENSION_REASONS: DimensionReasonMessages = {
  unverified: PREPARED_PNG_DIMENSIONS_UNVERIFIED_REASON,
  tooSmall: PREPARED_PNG_TOO_SMALL_REASON,
  tooWide: PREPARED_PNG_TOO_WIDE_REASON,
  tooManyPixels: PREPARED_PNG_TOO_MANY_PIXELS_REASON
};

function hasBytes(bytes: Uint8Array, offset: number, expected: readonly number[]) {
  if (offset < 0 || bytes.byteLength < offset + expected.length) {
    return false;
  }

  for (let index = 0; index < expected.length; index += 1) {
    if (bytes[offset + index] !== expected[index]) {
      return false;
    }
  }

  return true;
}

function asciiAt(bytes: Uint8Array, offset: number, length: number) {
  if (offset < 0 || bytes.byteLength < offset + length) {
    return "";
  }

  let value = "";

  for (let index = 0; index < length; index += 1) {
    value += String.fromCharCode(bytes[offset + index]);
  }

  return value;
}

function dataView(bytes: Uint8Array) {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function readUint24LE(bytes: Uint8Array, offset: number) {
  if (bytes.byteLength < offset + 3) {
    return Number.NaN;
  }

  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

function sniffedImage(format: SniffedUploadImageFormat, widthPx: number, heightPx: number, byteLength: number): SniffImageResult {
  const contentType = format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";

  return {
    ok: true,
    format,
    contentType,
    widthPx,
    heightPx,
    byteLength
  };
}

function malformedImage(): SniffImageResult {
  return {
    ok: false,
    kind: "malformed"
  };
}

function unsupportedImage(): SniffImageResult {
  return {
    ok: false,
    kind: "unsupported"
  };
}

function parsePngUpload(bytes: Uint8Array): SniffImageResult {
  if (bytes.byteLength < 33) {
    return malformedImage();
  }

  const view = dataView(bytes);
  const ihdrLength = view.getUint32(8, false);
  const ihdrEnd = 8 + 4 + 4 + ihdrLength + 4;

  if (ihdrLength !== 13 || asciiAt(bytes, 12, 4) !== "IHDR" || ihdrEnd > bytes.byteLength) {
    return malformedImage();
  }

  return sniffedImage("png", view.getUint32(16, false), view.getUint32(20, false), bytes.byteLength);
}

function isJpegStartOfFrameMarker(marker: number) {
  return (
    (marker >= 0xc0 && marker <= 0xc3) ||
    (marker >= 0xc5 && marker <= 0xc7) ||
    (marker >= 0xc9 && marker <= 0xcb) ||
    (marker >= 0xcd && marker <= 0xcf)
  );
}

function isStandaloneJpegMarker(marker: number) {
  return marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9);
}

function parseJpegUpload(bytes: Uint8Array): SniffImageResult {
  if (bytes.byteLength < 4) {
    return malformedImage();
  }

  const view = dataView(bytes);
  let offset = 2;

  while (offset < bytes.byteLength) {
    if (bytes[offset] !== 0xff) {
      return malformedImage();
    }

    while (offset < bytes.byteLength && bytes[offset] === 0xff) {
      offset += 1;
    }

    if (offset >= bytes.byteLength) {
      return malformedImage();
    }

    const marker = bytes[offset];
    offset += 1;

    if (marker === 0x00) {
      return malformedImage();
    }

    if (marker === 0xda || marker === 0xd9) {
      return malformedImage();
    }

    if (isStandaloneJpegMarker(marker)) {
      continue;
    }

    if (offset + 2 > bytes.byteLength) {
      return malformedImage();
    }

    const segmentLength = view.getUint16(offset, false);

    if (segmentLength < 2 || offset + segmentLength > bytes.byteLength) {
      return malformedImage();
    }

    if (isJpegStartOfFrameMarker(marker)) {
      if (segmentLength < 8) {
        return malformedImage();
      }

      return sniffedImage("jpeg", view.getUint16(offset + 5, false), view.getUint16(offset + 3, false), bytes.byteLength);
    }

    offset += segmentLength;
  }

  return malformedImage();
}

function parseVp8Webp(bytes: Uint8Array, dataOffset: number, chunkSize: number): SniffImageResult {
  if (chunkSize < 10 || dataOffset + 10 > bytes.byteLength) {
    return malformedImage();
  }

  if (bytes[dataOffset + 3] !== 0x9d || bytes[dataOffset + 4] !== 0x01 || bytes[dataOffset + 5] !== 0x2a) {
    return malformedImage();
  }

  const view = dataView(bytes);
  const widthPx = view.getUint16(dataOffset + 6, true) & 0x3fff;
  const heightPx = view.getUint16(dataOffset + 8, true) & 0x3fff;

  return sniffedImage("webp", widthPx, heightPx, bytes.byteLength);
}

function parseVp8lWebp(bytes: Uint8Array, dataOffset: number, chunkSize: number): SniffImageResult {
  if (chunkSize < 5 || dataOffset + 5 > bytes.byteLength || bytes[dataOffset] !== 0x2f) {
    return malformedImage();
  }

  const widthMinusOne = bytes[dataOffset + 1] | ((bytes[dataOffset + 2] & 0x3f) << 8);
  const heightMinusOne =
    ((bytes[dataOffset + 2] & 0xc0) >> 6) | (bytes[dataOffset + 3] << 2) | ((bytes[dataOffset + 4] & 0x0f) << 10);

  return sniffedImage("webp", widthMinusOne + 1, heightMinusOne + 1, bytes.byteLength);
}

function parseVp8xWebp(bytes: Uint8Array, dataOffset: number, chunkSize: number): SniffImageResult {
  if (chunkSize < 10 || dataOffset + 10 > bytes.byteLength) {
    return malformedImage();
  }

  return sniffedImage("webp", readUint24LE(bytes, dataOffset + 4) + 1, readUint24LE(bytes, dataOffset + 7) + 1, bytes.byteLength);
}

function parseWebpUpload(bytes: Uint8Array): SniffImageResult {
  if (bytes.byteLength < 20) {
    return malformedImage();
  }

  const view = dataView(bytes);
  const riffSize = view.getUint32(4, true);

  if (riffSize + 8 > bytes.byteLength) {
    return malformedImage();
  }

  const chunkType = asciiAt(bytes, 12, 4);
  const chunkSize = view.getUint32(16, true);
  const dataOffset = 20;

  if (dataOffset + chunkSize > bytes.byteLength) {
    return malformedImage();
  }

  if (chunkType === "VP8 ") {
    return parseVp8Webp(bytes, dataOffset, chunkSize);
  }

  if (chunkType === "VP8L") {
    return parseVp8lWebp(bytes, dataOffset, chunkSize);
  }

  if (chunkType === "VP8X") {
    return parseVp8xWebp(bytes, dataOffset, chunkSize);
  }

  return malformedImage();
}

function sniffUploadImageBytes(bytes: Uint8Array): SniffImageResult {
  if (hasBytes(bytes, 0, PNG_SIGNATURE)) {
    return parsePngUpload(bytes);
  }

  if (hasBytes(bytes, 0, JPEG_SIGNATURE)) {
    return parseJpegUpload(bytes);
  }

  if (asciiAt(bytes, 0, 4) === "RIFF" && asciiAt(bytes, 8, 4) === "WEBP") {
    return parseWebpUpload(bytes);
  }

  return unsupportedImage();
}

function validateDimensions(image: SniffedUploadImage, reasons: DimensionReasonMessages) {
  if (!Number.isSafeInteger(image.widthPx) || !Number.isSafeInteger(image.heightPx) || image.widthPx <= 0 || image.heightPx <= 0) {
    return reasons.unverified;
  }

  if (image.widthPx < PUBLIC_UPLOAD_MIN_DIMENSION_PX || image.heightPx < PUBLIC_UPLOAD_MIN_DIMENSION_PX) {
    return reasons.tooSmall;
  }

  if (image.widthPx > PUBLIC_UPLOAD_MAX_DIMENSION_PX || image.heightPx > PUBLIC_UPLOAD_MAX_DIMENSION_PX) {
    return reasons.tooWide;
  }

  if (image.widthPx * image.heightPx > PUBLIC_UPLOAD_MAX_TOTAL_PIXELS) {
    return reasons.tooManyPixels;
  }

  return null;
}

export function validatePublicUploadImageBytes(bytes: Uint8Array): UploadImageByteValidation {
  if (!Number.isSafeInteger(bytes.byteLength) || bytes.byteLength <= 0) {
    return {
      ok: false,
      reason: PUBLIC_UPLOAD_SIZE_UNVERIFIED_REASON
    };
  }

  if (bytes.byteLength > PREVIEW_BUNDLE_MAX_SOURCE_BYTES) {
    return {
      ok: false,
      reason: `Upload must be ${Math.round(PREVIEW_BUNDLE_MAX_SOURCE_BYTES / 1_000_000)} MB or smaller.`
    };
  }

  const sniffed = sniffUploadImageBytes(bytes);

  if (!sniffed.ok) {
    return {
      ok: false,
      reason: sniffed.kind === "malformed" ? PUBLIC_UPLOAD_MALFORMED_REASON : PUBLIC_UPLOAD_UNSUPPORTED_REASON
    };
  }

  const dimensionReason = validateDimensions(sniffed, PUBLIC_DIMENSION_REASONS);

  if (dimensionReason) {
    return {
      ok: false,
      reason: dimensionReason
    };
  }

  return {
    ...sniffed,
    reason: null
  };
}

export function validatePreparedPngTextureBytes(textureBytes: Uint8Array, expectedByteLength?: number): UploadImageByteValidation {
  if (expectedByteLength !== undefined && textureBytes.byteLength !== expectedByteLength) {
    return {
      ok: false,
      reason: PREPARED_PNG_BYTE_LENGTH_MISMATCH_REASON
    };
  }

  if (!Number.isSafeInteger(textureBytes.byteLength) || textureBytes.byteLength <= 0) {
    return {
      ok: false,
      reason: PREPARED_PNG_INVALID_REASON
    };
  }

  if (textureBytes.byteLength > PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES) {
    return {
      ok: false,
      reason: `Prepared upload must be ${Math.round(PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES / 1_000_000)} MB or smaller.`
    };
  }

  const sniffed = sniffUploadImageBytes(textureBytes);

  if (!sniffed.ok || sniffed.format !== "png") {
    return {
      ok: false,
      reason: PREPARED_PNG_INVALID_REASON
    };
  }

  const dimensionReason = validateDimensions(sniffed, PREPARED_PNG_DIMENSION_REASONS);

  if (dimensionReason) {
    return {
      ok: false,
      reason: dimensionReason
    };
  }

  return {
    ...sniffed,
    reason: null
  };
}
