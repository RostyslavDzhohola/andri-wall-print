import { describe, expect, it } from "vitest";

import {
  BUILDER_UPLOAD_MAX_LONG_EDGE_PX,
  BUILDER_UPLOAD_MAX_SOURCE_BYTES,
  BUILDER_UPLOAD_MIN_SHORT_EDGE_PX,
  computePngBudgetRetryDimensions,
  computeNormalizedImageDimensions,
  validateBuilderImageDimensions,
  validateBuilderSourceUpload,
  validateNormalizedPngUpload,
  validatePublicUploadFile
} from "@/lib/builder-upload-normalization";
import { PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES } from "@/lib/preview-bundle-contract";
import { PUBLIC_UPLOAD_TOO_SMALL_REASON, PUBLIC_UPLOAD_UNSUPPORTED_REASON } from "@/lib/upload-image-validation";

function u32be(value: number) {
  return Uint8Array.from([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
}

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

function fileFromBytes(bytes: Uint8Array, name: string, type: string) {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);

  return new File([buffer], name, { type });
}

describe("buyer invite upload normalization contract", () => {
  it("allows JPEG, PNG, and WebP source uploads only", () => {
    for (const contentType of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateBuilderSourceUpload({ contentType, byteLength: 1200 })).toEqual({
        ok: true,
        reason: null
      });
    }

    expect(validateBuilderSourceUpload({ contentType: "application/pdf", byteLength: 1200 })).toEqual({
      ok: false,
      reason: "Upload must be a JPEG, PNG, or WebP image."
    });
  });

  it("rejects source uploads above the buyer invite source budget", () => {
    expect(validateBuilderSourceUpload({ contentType: "image/png", byteLength: BUILDER_UPLOAD_MAX_SOURCE_BYTES + 1 })).toEqual({
      ok: false,
      reason: "Upload must be 10 MB or smaller."
    });
  });

  it("caps the normalized image long edge at 2048px without upscaling small images", () => {
    expect(computeNormalizedImageDimensions(4096, 2048)).toEqual({
      width: BUILDER_UPLOAD_MAX_LONG_EDGE_PX,
      height: 1024,
      wasResized: true
    });
    expect(computeNormalizedImageDimensions(900, 1200)).toEqual({
      width: 900,
      height: 1200,
      wasResized: false
    });
  });

  it("rejects images below the useful source dimension floor", () => {
    expect(validateBuilderImageDimensions(BUILDER_UPLOAD_MIN_SHORT_EDGE_PX, 900)).toEqual({
      ok: true,
      reason: null
    });
    expect(validateBuilderImageDimensions(BUILDER_UPLOAD_MIN_SHORT_EDGE_PX - 1, 900)).toEqual({
      ok: false,
      reason: "Upload must be at least 512px on the shortest side."
    });
  });

  it("computes a smaller PNG retry size when canvas output exceeds the generator budget", () => {
    const retry = computePngBudgetRetryDimensions({
      widthPx: 2048,
      heightPx: 1536,
      byteLength: PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES * 2
    });

    expect(retry).toEqual({
      width: 1332,
      height: 999,
      wasResized: true
    });
  });

  it("stops PNG budget retries before crossing the minimum short edge", () => {
    expect(
      computePngBudgetRetryDimensions({
        widthPx: 640,
        heightPx: 512,
        byteLength: PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES * 3
      })
    ).toBeNull();
  });

  it("requires normalized PNG output to fit the existing AR generator budget", () => {
    expect(validateNormalizedPngUpload(PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES)).toEqual({
      ok: true,
      reason: null
    });
    expect(validateNormalizedPngUpload(PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES + 1)).toEqual({
      ok: false,
      reason: "Prepared upload is too large for this wall preview. Prepared upload must be 4 MB or smaller."
    });
  });
});

describe("public request upload selection-time validation", () => {
  it("rejects a magic-byte lie (GIF bytes named .png) with the unsupported-format reason", async () => {
    const gifBytesNamedPng = fileFromBytes(bytesFromAscii("GIF89a"), "artwork.png", "image/png");

    await expect(validatePublicUploadFile(gifBytesNamedPng)).resolves.toEqual({
      ok: false,
      reason: PUBLIC_UPLOAD_UNSUPPORTED_REASON
    });
  });

  it("rejects an image below the minimum dimension floor at selection time", async () => {
    const tinyPng = fileFromBytes(makePng(1, 1), "tiny.png", "image/png");

    await expect(validatePublicUploadFile(tinyPng)).resolves.toEqual({
      ok: false,
      reason: PUBLIC_UPLOAD_TOO_SMALL_REASON
    });
  });

  it("accepts a valid PNG at selection time", async () => {
    const validPng = fileFromBytes(makePng(800, 600), "wall.png", "image/png");

    await expect(validatePublicUploadFile(validPng)).resolves.toEqual({
      ok: true,
      reason: null
    });
  });
});
