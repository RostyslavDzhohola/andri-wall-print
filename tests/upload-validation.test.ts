import { describe, expect, it } from "vitest";

import {
  PUBLIC_UPLOAD_MALFORMED_REASON,
  PUBLIC_UPLOAD_MAX_DIMENSION_PX,
  PUBLIC_UPLOAD_MAX_TOTAL_PIXELS,
  PUBLIC_UPLOAD_MIN_DIMENSION_PX,
  PUBLIC_UPLOAD_TOO_SMALL_REASON,
  PUBLIC_UPLOAD_UNSUPPORTED_REASON,
  validatePublicUploadImageBytes,
  validateStoredPreviewUpload
} from "@/convex/uploadValidation";
import { PREVIEW_BUNDLE_MAX_SOURCE_BYTES } from "@/lib/preview-bundle-contract";

const PNG_SHA = "a".repeat(64);

function bytesFromAscii(value: string) {
  return Uint8Array.from(Array.from(value, (character) => character.charCodeAt(0)));
}

function concatBytes(...parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }

  return output;
}

function u16be(value: number) {
  return Uint8Array.from([(value >>> 8) & 0xff, value & 0xff]);
}

function u16le(value: number) {
  return Uint8Array.from([value & 0xff, (value >>> 8) & 0xff]);
}

function u24le(value: number) {
  return Uint8Array.from([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff]);
}

function u32be(value: number) {
  return Uint8Array.from([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}

function u32le(value: number) {
  return Uint8Array.from([value & 0xff, (value >>> 8) & 0xff, (value >>> 16) & 0xff, (value >>> 24) & 0xff]);
}

function makePng(widthPx: number, heightPx: number) {
  return concatBytes(
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    u32be(13),
    bytesFromAscii("IHDR"),
    u32be(widthPx),
    u32be(heightPx),
    Uint8Array.from([8, 6, 0, 0, 0]),
    u32be(0),
    u32be(0),
    bytesFromAscii("IEND"),
    u32be(0)
  );
}

function makeJpeg(widthPx: number, heightPx: number) {
  return concatBytes(
    Uint8Array.from([0xff, 0xd8]),
    Uint8Array.from([0xff, 0xe0]),
    u16be(4),
    Uint8Array.from([0, 0]),
    Uint8Array.from([0xff, 0xc0]),
    u16be(11),
    Uint8Array.from([8]),
    u16be(heightPx),
    u16be(widthPx),
    Uint8Array.from([1, 1, 0x11, 0]),
    Uint8Array.from([0xff, 0xd9])
  );
}

function makeWebpChunk(chunkType: "VP8 " | "VP8L" | "VP8X", data: Uint8Array) {
  return concatBytes(bytesFromAscii("RIFF"), u32le(4 + 8 + data.byteLength), bytesFromAscii("WEBP"), bytesFromAscii(chunkType), u32le(data.byteLength), data);
}

function makeVp8Webp(widthPx: number, heightPx: number) {
  return makeWebpChunk(
    "VP8 ",
    concatBytes(Uint8Array.from([0, 0, 0, 0x9d, 0x01, 0x2a]), u16le(widthPx & 0x3fff), u16le(heightPx & 0x3fff))
  );
}

function makeVp8lWebp(widthPx: number, heightPx: number) {
  const widthMinusOne = widthPx - 1;
  const heightMinusOne = heightPx - 1;

  return makeWebpChunk(
    "VP8L",
    Uint8Array.from([
      0x2f,
      widthMinusOne & 0xff,
      ((widthMinusOne >>> 8) & 0x3f) | ((heightMinusOne & 0x03) << 6),
      (heightMinusOne >>> 2) & 0xff,
      (heightMinusOne >>> 10) & 0x0f
    ])
  );
}

function makeVp8xWebp(widthPx: number, heightPx: number) {
  return makeWebpChunk(
    "VP8X",
    concatBytes(Uint8Array.from([0, 0, 0, 0]), u24le(widthPx - 1), u24le(heightPx - 1))
  );
}

function makeFtyp(brand: string) {
  return concatBytes(u32be(24), bytesFromAscii("ftyp"), bytesFromAscii(brand), new Uint8Array(12));
}

function ctxWithStoredUpload(metadata: { contentType?: string; size: number; sha256: string } | null) {
  return {
    db: {
      system: {
        get: async () => metadata
      }
    }
  };
}

describe("public upload byte validation", () => {
  it("rejects wrong-type uploads by magic bytes even when metadata could lie", () => {
    const claimedFileName = "artwork.png";
    const claimedMimeType = "image/png";

    expect(claimedFileName).toBe("artwork.png");
    expect(claimedMimeType).toBe("image/png");

    for (const bytes of [
      bytesFromAscii("%PDF-1.7\n"),
      bytesFromAscii("GIF89a"),
      bytesFromAscii("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"),
      makeFtyp("avif"),
      makeFtyp("heic")
    ]) {
      expect(validatePublicUploadImageBytes(bytes)).toEqual({
        ok: false,
        reason: PUBLIC_UPLOAD_UNSUPPORTED_REASON
      });
    }
  });

  it("rejects malformed or truncated image headers per accepted format", () => {
    expect(validatePublicUploadImageBytes(makePng(640, 480).subarray(0, 24))).toEqual({
      ok: false,
      reason: PUBLIC_UPLOAD_MALFORMED_REASON
    });
    expect(validatePublicUploadImageBytes(concatBytes(Uint8Array.from([0xff, 0xd8, 0xff, 0xc0]), u16be(11), Uint8Array.from([8])))).toEqual({
      ok: false,
      reason: PUBLIC_UPLOAD_MALFORMED_REASON
    });
    expect(validatePublicUploadImageBytes(concatBytes(bytesFromAscii("RIFF"), u32le(24), bytesFromAscii("WEBP"), bytesFromAscii("VP8X")))).toEqual({
      ok: false,
      reason: PUBLIC_UPLOAD_MALFORMED_REASON
    });
  });

  it("rejects byte-budget and dimension-bound breaches with distinct reasons", () => {
    expect(validatePublicUploadImageBytes(new Uint8Array())).toEqual({
      ok: false,
      reason: "Upload size could not be verified."
    });

    expect(validatePublicUploadImageBytes(new Uint8Array(PREVIEW_BUNDLE_MAX_SOURCE_BYTES + 1))).toEqual({
      ok: false,
      reason: "Upload must be 10 MB or smaller."
    });

    expect(validatePublicUploadImageBytes(makePng(PUBLIC_UPLOAD_MAX_DIMENSION_PX + 1, 640))).toEqual({
      ok: false,
      reason: "Upload dimensions must be 12000px or smaller on each side."
    });

    expect(validatePublicUploadImageBytes(makePng(10_000, Math.floor(PUBLIC_UPLOAD_MAX_TOTAL_PIXELS / 10_000) + 1))).toEqual({
      ok: false,
      reason: "Upload must be 80 megapixels or smaller."
    });
  });

  it("rejects images under the minimum dimension floor with user-friendly copy", () => {
    expect(validatePublicUploadImageBytes(makePng(PUBLIC_UPLOAD_MIN_DIMENSION_PX - 1, 640))).toEqual({
      ok: false,
      reason: PUBLIC_UPLOAD_TOO_SMALL_REASON
    });
  });

  it("accepts JPEG, PNG, and WebP fixtures and reports sniffed dimensions", () => {
    expect(validatePublicUploadImageBytes(makeJpeg(640, 480))).toMatchObject({
      ok: true,
      contentType: "image/jpeg",
      format: "jpeg",
      widthPx: 640,
      heightPx: 480
    });
    expect(validatePublicUploadImageBytes(makePng(800, 600))).toMatchObject({
      ok: true,
      contentType: "image/png",
      format: "png",
      widthPx: 800,
      heightPx: 600
    });
    expect(validatePublicUploadImageBytes(makeVp8Webp(320, 240))).toMatchObject({
      ok: true,
      contentType: "image/webp",
      format: "webp",
      widthPx: 320,
      heightPx: 240
    });
    expect(validatePublicUploadImageBytes(makeVp8lWebp(321, 241))).toMatchObject({
      ok: true,
      contentType: "image/webp",
      format: "webp",
      widthPx: 321,
      heightPx: 241
    });
    expect(validatePublicUploadImageBytes(makeVp8xWebp(322, 242))).toMatchObject({
      ok: true,
      contentType: "image/webp",
      format: "webp",
      widthPx: 322,
      heightPx: 242
    });
  });
});

describe("stored preview upload validation", () => {
  it("uses stored Convex metadata for content type, size, and fingerprint", async () => {
    const bytes = makePng(800, 600);

    await expect(
      validateStoredPreviewUpload(ctxWithStoredUpload({ contentType: "image/png", size: bytes.byteLength, sha256: PNG_SHA }), {
        sourceStorageId: "storage_123",
        contentType: "image/png",
        byteLength: bytes.byteLength,
        sourceFingerprint: PNG_SHA
      })
    ).resolves.toEqual({
      contentType: "image/png",
      byteLength: bytes.byteLength,
      sourceFingerprint: PNG_SHA
    });
  });

  it("rejects client metadata that does not match the stored file", async () => {
    await expect(
      validateStoredPreviewUpload(ctxWithStoredUpload({ contentType: "image/png", size: 1200, sha256: PNG_SHA }), {
        sourceStorageId: "storage_123",
        contentType: "image/png",
        byteLength: 999,
        sourceFingerprint: PNG_SHA
      })
    ).rejects.toThrow("Uploaded artwork metadata did not match the stored file. Choose the file again.");
  });

  it("rejects stored files that are not prepared PNG textures", async () => {
    await expect(
      validateStoredPreviewUpload(ctxWithStoredUpload({ contentType: "image/jpeg", size: 1200, sha256: PNG_SHA }), {
        sourceStorageId: "storage_123",
        contentType: "image/jpeg",
        byteLength: 1200,
        sourceFingerprint: PNG_SHA
      })
    ).rejects.toThrow("Prepared upload must be a PNG image before AR generation.");
  });

  it("rejects fingerprint mismatches", async () => {
    const bytes = makePng(800, 600);

    await expect(
      validateStoredPreviewUpload(ctxWithStoredUpload({ contentType: "image/png", size: bytes.byteLength, sha256: PNG_SHA }), {
        sourceStorageId: "storage_123",
        contentType: "image/png",
        byteLength: bytes.byteLength,
        sourceFingerprint: "b".repeat(64)
      })
    ).rejects.toThrow("Uploaded artwork fingerprint did not match the stored file. Choose the file again.");
  });
});
