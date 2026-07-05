import { describe, expect, it } from "vitest";

import { generateAiConceptArAssets } from "@/convex/aiConcepts";
import { DEFAULT_PREVIEW_BUNDLE_PRINT, PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES } from "@/lib/preview-bundle-contract";

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

function u32be(value: number) {
  return Uint8Array.from([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
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

const VALID_PNG = makePng(128, 128);

function generate(textureBytes: Uint8Array) {
  return generateAiConceptArAssets({
    textureBytes,
    textureFileName: "client-concept.png",
    textureContentType: "image/png",
    expectedTextureByteLength: textureBytes.byteLength,
    title: "Client Concept",
    print: DEFAULT_PREVIEW_BUNDLE_PRINT,
    generator: "test-generator"
  });
}

describe("AI concept AR asset chain", () => {
  it("turns a valid PNG into GLB and USDZ assets with ready status", () => {
    const result = generate(VALID_PNG);

    expect(result.status).toBe("ready");

    if (result.status !== "ready") {
      throw new Error("Expected ready AR assets.");
    }

    expect(result.assets.glb.byteLength).toBeGreaterThan(0);
    expect(result.assets.usdz.byteLength).toBeGreaterThan(0);
    expect(result.assetMeta).toMatchObject({
      poster: {
        fileName: "client-concept.png",
        contentType: "image/png",
        byteLength: VALID_PNG.byteLength
      },
      glb: {
        fileName: "client-concept.glb",
        contentType: "model/gltf-binary"
      },
      usdz: {
        fileName: "client-concept.usdz",
        contentType: "model/vnd.usdz+zip"
      }
    });
  });

  it("keeps malformed poster bytes and returns composite_only", () => {
    const malformed = Uint8Array.from([0x47, 0x49, 0x46, 0x38]);
    const result = generate(malformed);

    expect(result).toMatchObject({
      status: "composite_only",
      posterBytes: malformed,
      reason: "Uploaded artwork is not a valid prepared PNG image. Choose the file again."
    });
  });

  it("keeps oversized poster bytes and returns composite_only", () => {
    const oversized = new Uint8Array(PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES + 1);
    oversized.set(VALID_PNG, 0);
    const result = generate(oversized);

    expect(result.status).toBe("composite_only");

    if (result.status !== "composite_only") {
      throw new Error("Expected composite-only fallback.");
    }

    expect(result.posterBytes.byteLength).toBe(oversized.byteLength);
    expect(result.reason).toBe("Prepared upload must be 4 MB or smaller.");
  });
});
