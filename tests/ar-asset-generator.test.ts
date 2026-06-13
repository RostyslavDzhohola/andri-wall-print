import { describe, expect, it } from "vitest";

import { assertPngTextureBytes, generateFlatPrintAssets, makeGlbFlatPrint, makeUsdzFlatPrint } from "@/lib/ar-asset-generator";

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
    expect(gltf.asset.extras).toBeUndefined();
    expect(gltf.meshes[0].primitives).toHaveLength(1);
  });

  it("changes generated GLB and USDZ geometry when selected dimensions change", () => {
    const resizedInput = { ...INPUT, widthMeters: 1.2, heightMeters: 0.5 };
    const gltf = readGlbJson(makeGlbFlatPrint(resizedInput));
    const usdzText = Buffer.from(makeUsdzFlatPrint(resizedInput)).toString("utf8");

    expect(gltf.accessors[0].min).toEqual([-0.6, -0.25, 0]);
    expect(gltf.accessors[0].max).toEqual([0.6, 0.25, 0]);
    expect(usdzText).toContain("point3f[] points = [(-0.6, -0.25, 0), (0.6, -0.25, 0), (0.6, 0.25, 0), (-0.6, 0.25, 0)]");
  });

  it("builds an uncompressed USDZ package with a USDA plane and opacity threshold", () => {
    const usdz = Buffer.from(makeUsdzFlatPrint(INPUT));

    expect(usdz.toString("ascii", 0, 2)).toBe("PK");
    expect(usdz.toString("utf8")).toContain("#usda 1.0");
    expect(usdz.toString("utf8")).toContain("float inputs:opacityThreshold = 0.5");
    expect(usdz.toString("utf8")).toContain("asset inputs:file = @proof.png@");
    expect(usdz.toString("utf8")).not.toContain("SizeGuide");
  });

  it("can add optional GLB size-guide geometry and metadata", () => {
    const gltf = readGlbJson(makeGlbFlatPrint({ ...INPUT, sizeGuide: { enabled: true } }));

    expect(gltf.asset.extras.sizeGuide).toEqual({
      widthMeters: 0.45,
      heightMeters: 0.9,
      widthLabel: "1 ft 6 in wide",
      heightLabel: "2 ft 11 in tall",
      summary: "1 ft 6 in wide x 2 ft 11 in tall"
    });
    expect(gltf.meshes[0].primitives).toHaveLength(2);
    expect(gltf.meshes[0].primitives[1]).toMatchObject({
      attributes: { POSITION: 3 },
      indices: 4,
      material: 1,
      mode: 4
    });
    expect(gltf.materials[1].name).toBe("Size Guide");
    expect(gltf.accessors[3]).toMatchObject({
      componentType: 5126,
      count: 24,
      type: "VEC3"
    });
    expect(gltf.accessors[4]).toMatchObject({
      componentType: 5123,
      count: 36,
      type: "SCALAR"
    });
  });

  it("can add optional USDZ size-guide geometry without dropping the artwork texture", () => {
    const usdz = Buffer.from(makeUsdzFlatPrint({ ...INPUT, sizeGuide: { enabled: true } }));
    const text = usdz.toString("utf8");

    expect(text).toContain("#usda 1.0");
    expect(text).toContain('def Mesh "ArtworkPlane"');
    expect(text).toContain('def Mesh "SizeGuide"');
    expect(text).toContain('def Material "SizeGuideMaterial"');
    expect(text).toContain('string sizeGuideSummary = "1 ft 6 in wide x 2 ft 11 in tall"');
    expect(text).toContain("asset inputs:file = @proof.png@");
  });

  it("returns asset metadata under mobile budgets", () => {
    const assets = generateFlatPrintAssets(INPUT);

    expect(assets.meta.poster.contentType).toBe("image/png");
    expect(assets.meta.glb.contentType).toBe("model/gltf-binary");
    expect(assets.meta.usdz.contentType).toBe("model/vnd.usdz+zip");
    expect(assets.meta.poster.byteLength + assets.meta.glb.byteLength + assets.meta.usdz.byteLength).toBeLessThan(12_750_000);
  });

  it("rejects forged upload metadata before generating public AR assets", () => {
    expect(() => assertPngTextureBytes(ONE_BY_ONE_PNG, ONE_BY_ONE_PNG.byteLength - 1)).toThrow(
      "Uploaded artwork byte length does not match the stored file. Choose the file again."
    );
  });

  it("rejects non-PNG bytes before they can be embedded into generated AR assets", () => {
    expect(() =>
      generateFlatPrintAssets({
        ...INPUT,
        textureBytes: Uint8Array.from([0x47, 0x49, 0x46, 0x38])
      })
    ).toThrow("Uploaded artwork is not a valid prepared PNG image. Choose the file again.");
  });
});
