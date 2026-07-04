import { describe, expect, it } from "vitest";

import { generateAiConceptArAssets } from "@/convex/aiConcepts";
import { AR_ASSET_SIZE_BUDGET_BYTES } from "@/lib/ar-launcher";
import { DEFAULT_PREVIEW_BUNDLE_PRINT } from "@/lib/preview-bundle-contract";

const ONE_BY_ONE_PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a,
  0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
]);

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
    const result = generate(ONE_BY_ONE_PNG);

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
        byteLength: ONE_BY_ONE_PNG.byteLength
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
    const oversized = new Uint8Array(AR_ASSET_SIZE_BUDGET_BYTES.poster + 1);
    oversized.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
    const result = generate(oversized);

    expect(result.status).toBe("composite_only");

    if (result.status !== "composite_only") {
      throw new Error("Expected composite-only fallback.");
    }

    expect(result.posterBytes.byteLength).toBe(oversized.byteLength);
    expect(result.reason).toBe(`Generated poster exceeds ${AR_ASSET_SIZE_BUDGET_BYTES.poster} bytes.`);
  });
});
