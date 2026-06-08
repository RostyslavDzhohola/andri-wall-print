import { describe, expect, it } from "vitest";

import { generateFlatPrintAssets, makeGlbFlatPrint, makeUsdzFlatPrint } from "@/lib/ar-asset-generator";

const ONE_BY_ONE_PNG = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0a,
  0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4,
  0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82
]);

const INPUT = {
  textureBytes: ONE_BY_ONE_PNG,
  textureFileName: "proof.png",
  textureContentType: "image/png" as const,
  title: "Client Proof",
  widthMeters: 0.45,
  heightMeters: 0.9,
  generator: "test-generator"
};

function readGlbJson(glb: Uint8Array) {
  const buffer = Buffer.from(glb);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonType = buffer.toString("ascii", 16, 20);

  expect(jsonType).toBe("JSON");

  return JSON.parse(buffer.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

describe("TypeScript AR asset generator", () => {
  it("builds a GLB wall plane with the same geometry and alpha contract as the Python reference", () => {
    const glb = makeGlbFlatPrint(INPUT);
    const buffer = Buffer.from(glb);
    const gltf = readGlbJson(glb);

    expect(buffer.readUInt32LE(0)).toBe(0x46546c67);
    expect(gltf.asset.generator).toBe("test-generator");
    expect(gltf.materials[0].alphaMode).toBe("MASK");
    expect(gltf.materials[0].alphaCutoff).toBe(0.5);
    expect(gltf.accessors[0].min).toEqual([-0.225, -0.45, 0]);
    expect(gltf.accessors[0].max).toEqual([0.225, 0.45, 0]);
  });

  it("builds an uncompressed USDZ package with a USDA plane and opacity threshold", () => {
    const usdz = Buffer.from(makeUsdzFlatPrint(INPUT));

    expect(usdz.toString("ascii", 0, 2)).toBe("PK");
    expect(usdz.toString("utf8")).toContain("#usda 1.0");
    expect(usdz.toString("utf8")).toContain("float inputs:opacityThreshold = 0.5");
    expect(usdz.toString("utf8")).toContain("asset inputs:file = @proof.png@");
  });

  it("returns asset metadata under mobile budgets", () => {
    const assets = generateFlatPrintAssets(INPUT);

    expect(assets.meta.poster.contentType).toBe("image/png");
    expect(assets.meta.glb.contentType).toBe("model/gltf-binary");
    expect(assets.meta.usdz.contentType).toBe("model/vnd.usdz+zip");
    expect(assets.meta.poster.byteLength + assets.meta.glb.byteLength + assets.meta.usdz.byteLength).toBeLessThan(12_750_000);
  });
});
