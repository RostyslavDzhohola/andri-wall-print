import { Buffer } from "node:buffer";

import { AR_ASSET_SIZE_BUDGET_BYTES, AR_SAMPLE_TOTAL_SIZE_BUDGET_BYTES, type ArAssetKind } from "./ar-launcher";
import { formatDecimalFeetFromMeters } from "./preview-bundle-contract";
import { validatePreparedPngTextureBytes } from "./upload-image-validation";

export type FlatPrintSizeGuideOptions = {
  enabled: boolean;
};

export type FlatPrintAssetInput = {
  textureBytes: Uint8Array;
  textureFileName: string;
  textureContentType: "image/png";
  expectedTextureByteLength?: number;
  title: string;
  widthMeters: number;
  heightMeters: number;
  generator: string;
  sizeGuide?: FlatPrintSizeGuideOptions;
};

export type GeneratedFlatPrintAssets = {
  poster: Uint8Array;
  glb: Uint8Array;
  usdz: Uint8Array;
  meta: Record<ArAssetKind, { byteLength: number; contentType: string }>;
};

function align(value: number, boundary = 4) {
  return Math.ceil(value / boundary) * boundary;
}

function padBuffer(buffer: Buffer, boundary = 4, padByte = 0x20) {
  const padding = align(buffer.length, boundary) - buffer.length;

  if (padding === 0) {
    return buffer;
  }

  return Buffer.concat([buffer, Buffer.alloc(padding, padByte)]);
}

function writeFloat32(values: number[]) {
  const buffer = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => buffer.writeFloatLE(value, index * 4));
  return buffer;
}

function writeUint16(values: number[]) {
  const buffer = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => buffer.writeUInt16LE(value, index * 2));
  return buffer;
}

function writeUInt32(value: number) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value, 0);
  return buffer;
}

function formatSizeGuideMeters(value: number) {
  return formatDecimalFeetFromMeters(value);
}

function getSizeGuideLabels(input: FlatPrintAssetInput) {
  const widthLabel = `${formatSizeGuideMeters(input.widthMeters)} wide`;
  const heightLabel = `${formatSizeGuideMeters(input.heightMeters)} tall`;

  return {
    widthLabel,
    heightLabel,
    summary: `${widthLabel} x ${heightLabel}`
  };
}

type SizeGuideGeometry = {
  points: number[];
  triangleIndices: number[];
  quadIndices: number[];
  min: [number, number, number];
  max: [number, number, number];
};

function isSizeGuideEnabled(input: FlatPrintAssetInput) {
  return input.sizeGuide?.enabled === true;
}

function makeSizeGuideGeometry(input: FlatPrintAssetInput): SizeGuideGeometry {
  const halfWidth = input.widthMeters / 2;
  const halfHeight = input.heightMeters / 2;
  const shortSide = Math.min(input.widthMeters, input.heightMeters);
  const thickness = Math.max(shortSide * 0.012, 0.006);
  const gap = Math.max(shortSide * 0.06, 0.035);
  const tickLength = Math.max(shortSide * 0.09, 0.05);
  const zOffset = 0.008;
  const points: number[] = [];
  const triangleIndices: number[] = [];
  const quadIndices: number[] = [];

  const addRect = (xMin: number, yMin: number, xMax: number, yMax: number) => {
    const base = points.length / 3;

    points.push(xMin, yMin, zOffset, xMax, yMin, zOffset, xMax, yMax, zOffset, xMin, yMax, zOffset);
    triangleIndices.push(base, base + 1, base + 2, base, base + 2, base + 3);
    quadIndices.push(base, base + 1, base + 2, base + 3);
  };

  const horizontalGuideY = -halfHeight - gap;
  const verticalGuideX = halfWidth + gap;

  addRect(-halfWidth, horizontalGuideY - thickness / 2, halfWidth, horizontalGuideY + thickness / 2);
  addRect(-halfWidth - thickness / 2, horizontalGuideY - tickLength / 2, -halfWidth + thickness / 2, horizontalGuideY + tickLength / 2);
  addRect(halfWidth - thickness / 2, horizontalGuideY - tickLength / 2, halfWidth + thickness / 2, horizontalGuideY + tickLength / 2);
  addRect(verticalGuideX - thickness / 2, -halfHeight, verticalGuideX + thickness / 2, halfHeight);
  addRect(verticalGuideX - tickLength / 2, -halfHeight - thickness / 2, verticalGuideX + tickLength / 2, -halfHeight + thickness / 2);
  addRect(verticalGuideX - tickLength / 2, halfHeight - thickness / 2, verticalGuideX + tickLength / 2, halfHeight + thickness / 2);

  const xs = points.filter((_value, index) => index % 3 === 0);
  const ys = points.filter((_value, index) => index % 3 === 1);

  return {
    points,
    triangleIndices,
    quadIndices,
    min: [Math.min(...xs), Math.min(...ys), zOffset],
    max: [Math.max(...xs), Math.max(...ys), zOffset]
  };
}

export function assertPngTextureBytes(textureBytes: Uint8Array, expectedByteLength?: number) {
  const validation = validatePreparedPngTextureBytes(textureBytes, expectedByteLength);

  if (!validation.ok) {
    throw new Error(validation.reason);
  }
}

export function makeGlbFlatPrint(input: FlatPrintAssetInput) {
  const texture = Buffer.from(input.textureBytes);
  const halfWidth = input.widthMeters / 2;
  const halfHeight = input.heightMeters / 2;
  const positionBytes = writeFloat32([
    -halfWidth,
    -halfHeight,
    0,
    halfWidth,
    -halfHeight,
    0,
    halfWidth,
    halfHeight,
    0,
    -halfWidth,
    halfHeight,
    0
  ]);
  const uvBytes = writeFloat32([0, 0, 1, 0, 1, 1, 0, 1]);
  const indexBytes = writeUint16([0, 1, 2, 0, 2, 3]);
  const sizeGuide = isSizeGuideEnabled(input) ? makeSizeGuideGeometry(input) : null;
  const sizeGuidePositionBytes = sizeGuide ? writeFloat32(sizeGuide.points) : null;
  const sizeGuideIndexBytes = sizeGuide ? writeUint16(sizeGuide.triangleIndices) : null;
  const chunks: Array<readonly [string, Buffer]> = [
    ["positions", positionBytes],
    ["uvs", uvBytes],
    ["indices", indexBytes],
    ["texture", texture]
  ];
  const offsets: Record<string, number> = {};
  const binParts: Buffer[] = [];
  let binLength = 0;

  if (sizeGuidePositionBytes && sizeGuideIndexBytes) {
    chunks.push(["sizeGuidePositions", sizeGuidePositionBytes], ["sizeGuideIndices", sizeGuideIndexBytes]);
  }

  for (const [name, data] of chunks) {
    const paddedLength = align(binLength);
    if (paddedLength > binLength) {
      binParts.push(Buffer.alloc(paddedLength - binLength));
      binLength = paddedLength;
    }

    offsets[name] = binLength;
    binParts.push(data);
    binLength += data.length;
  }

  const binChunk = padBuffer(Buffer.concat(binParts), 4, 0x00);
  const asset: Record<string, unknown> = { version: "2.0", generator: input.generator };
  const bufferViews: Array<{ buffer: number; byteOffset: number; byteLength: number; target?: number }> = [
    { buffer: 0, byteOffset: offsets.positions, byteLength: positionBytes.length, target: 34962 },
    { buffer: 0, byteOffset: offsets.uvs, byteLength: uvBytes.length, target: 34962 },
    { buffer: 0, byteOffset: offsets.indices, byteLength: indexBytes.length, target: 34963 },
    { buffer: 0, byteOffset: offsets.texture, byteLength: texture.length }
  ];
  const accessors: Array<{ bufferView: number; componentType: number; count: number; type: string; min?: number[]; max?: number[] }> = [
    {
      bufferView: 0,
      componentType: 5126,
      count: 4,
      type: "VEC3",
      min: [-halfWidth, -halfHeight, 0],
      max: [halfWidth, halfHeight, 0]
    },
    { bufferView: 1, componentType: 5126, count: 4, type: "VEC2" },
    { bufferView: 2, componentType: 5123, count: 6, type: "SCALAR" }
  ];
  const primitives: Array<Record<string, unknown>> = [
    {
      attributes: { POSITION: 0, TEXCOORD_0: 1 },
      indices: 2,
      material: 0,
      mode: 4
    }
  ];
  const materials: Array<Record<string, unknown>> = [
    {
      name: "Printed Artwork",
      alphaMode: "MASK",
      alphaCutoff: 0.5,
      doubleSided: true,
      pbrMetallicRoughness: {
        baseColorTexture: { index: 0 },
        metallicFactor: 0,
        roughnessFactor: 0.74
      }
    }
  ];

  if (sizeGuide && sizeGuidePositionBytes && sizeGuideIndexBytes) {
    const labels = getSizeGuideLabels(input);
    const positionBufferView = bufferViews.length;
    const positionAccessor = accessors.length;
    const indexBufferView = bufferViews.length + 1;
    const indexAccessor = accessors.length + 1;
    const guideMaterial = materials.length;

    asset.extras = {
      sizeGuide: {
        widthMeters: input.widthMeters,
        heightMeters: input.heightMeters,
        widthLabel: labels.widthLabel,
        heightLabel: labels.heightLabel,
        summary: labels.summary
      }
    };
    bufferViews.push(
      { buffer: 0, byteOffset: offsets.sizeGuidePositions, byteLength: sizeGuidePositionBytes.length, target: 34962 },
      { buffer: 0, byteOffset: offsets.sizeGuideIndices, byteLength: sizeGuideIndexBytes.length, target: 34963 }
    );
    accessors.push(
      {
        bufferView: positionBufferView,
        componentType: 5126,
        count: sizeGuide.points.length / 3,
        type: "VEC3",
        min: sizeGuide.min,
        max: sizeGuide.max
      },
      { bufferView: indexBufferView, componentType: 5123, count: sizeGuide.triangleIndices.length, type: "SCALAR" }
    );
    materials.push({
      name: "Size Guide",
      doubleSided: true,
      pbrMetallicRoughness: {
        baseColorFactor: [0.09, 0.21, 0.23, 1],
        metallicFactor: 0,
        roughnessFactor: 0.55
      }
    });
    primitives.push({
      attributes: { POSITION: positionAccessor },
      indices: indexAccessor,
      material: guideMaterial,
      mode: 4
    });
  }

  const gltf = {
    asset,
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0, name: input.title }],
    meshes: [
      {
        primitives
      }
    ],
    materials,
    textures: [{ source: 0 }],
    images: [{ mimeType: input.textureContentType, bufferView: 3, name: input.textureFileName }],
    samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 33071, wrapT: 33071 }],
    buffers: [{ byteLength: binChunk.length }],
    bufferViews,
    accessors
  };
  const jsonChunk = padBuffer(Buffer.from(JSON.stringify(gltf), "utf8"), 4, 0x20);
  const totalLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length;

  return Buffer.concat([
    writeUInt32(0x46546c67),
    writeUInt32(2),
    writeUInt32(totalLength),
    writeUInt32(jsonChunk.length),
    Buffer.from("JSON"),
    jsonChunk,
    writeUInt32(binChunk.length),
    Buffer.from("BIN\0"),
    binChunk
  ]);
}

function formatUsdaNumber(value: number) {
  return Number(value.toFixed(6)).toString();
}

function formatUsdaPoints(points: number[]) {
  const formattedPoints: string[] = [];

  for (let index = 0; index < points.length; index += 3) {
    formattedPoints.push(`(${formatUsdaNumber(points[index])}, ${formatUsdaNumber(points[index + 1])}, ${formatUsdaNumber(points[index + 2])})`);
  }

  return formattedPoints.join(", ");
}

function formatUsdaIndices(indices: number[]) {
  return indices.join(", ");
}

function makeUsdaSizeGuideMesh(input: FlatPrintAssetInput) {
  if (!isSizeGuideEnabled(input)) {
    return "";
  }

  const sizeGuide = makeSizeGuideGeometry(input);
  const faceVertexCounts = Array.from({ length: sizeGuide.quadIndices.length / 4 }, () => "4").join(", ");

  return `
    def Mesh "SizeGuide"
    {
        uniform token subdivisionScheme = "none"
        point3f[] points = [${formatUsdaPoints(sizeGuide.points)}]
        int[] faceVertexCounts = [${faceVertexCounts}]
        int[] faceVertexIndices = [${formatUsdaIndices(sizeGuide.quadIndices)}]
        normal3f[] normals = [(0, 0, 1)] (
            interpolation = "constant"
        )
        rel material:binding = </Print/Materials/SizeGuideMaterial>
    }
`;
}

function makeUsdaSizeGuideMaterial(input: FlatPrintAssetInput) {
  if (!isSizeGuideEnabled(input)) {
    return "";
  }

  return `
        def Material "SizeGuideMaterial"
        {
            token outputs:surface.connect = </Print/Materials/SizeGuideMaterial/PreviewSurface.outputs:surface>

            def Shader "PreviewSurface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0.09, 0.21, 0.23)
                float inputs:opacity = 1
                float inputs:metallic = 0
                float inputs:roughness = 0.55
                token outputs:surface
            }
        }
`;
}

function makeUsdaPrintMetadata(input: FlatPrintAssetInput) {
  if (!isSizeGuideEnabled(input)) {
    return "";
  }

  const labels = getSizeGuideLabels(input);

  return ` (
    customData = {
        string sizeGuideHeight = "${labels.heightLabel}"
        string sizeGuideSummary = "${labels.summary}"
        string sizeGuideWidth = "${labels.widthLabel}"
    }
)`;
}

export function makeUsdaFlatPrint(input: FlatPrintAssetInput) {
  const halfWidth = input.widthMeters / 2;
  const halfHeight = input.heightMeters / 2;

  return `#usda 1.0
(
    defaultPrim = "Print"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Print"${makeUsdaPrintMetadata(input)}
{
    def Mesh "ArtworkPlane"
    {
        uniform token subdivisionScheme = "none"
        point3f[] points = [(${-halfWidth}, ${-halfHeight}, 0), (${halfWidth}, ${-halfHeight}, 0), (${halfWidth}, ${halfHeight}, 0), (${-halfWidth}, ${halfHeight}, 0)]
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        normal3f[] normals = [(0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1)] (
            interpolation = "vertex"
        )
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (
            interpolation = "vertex"
        )
        rel material:binding = </Print/Materials/PrintedArtwork>
    }
${makeUsdaSizeGuideMesh(input)}

    def Scope "Materials"
    {
        def Material "PrintedArtwork"
        {
            token outputs:surface.connect = </Print/Materials/PrintedArtwork/PreviewSurface.outputs:surface>

            def Shader "PreviewSurface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor.connect = </Print/Materials/PrintedArtwork/Texture.outputs:rgb>
                float inputs:opacity.connect = </Print/Materials/PrintedArtwork/Texture.outputs:a>
                float inputs:opacityThreshold = 0.5
                float inputs:metallic = 0
                float inputs:roughness = 0.74
                token outputs:surface
            }

            def Shader "Texture"
            {
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @${input.textureFileName}@
                token inputs:sourceColorSpace = "sRGB"
                float2 inputs:st.connect = </Print/Materials/PrintedArtwork/StReader.outputs:result>
                float outputs:a
                color3f outputs:rgb
            }

            def Shader "StReader"
            {
                uniform token info:id = "UsdPrimvarReader_float2"
                token inputs:varname = "st"
                float2 outputs:result
            }
        }
${makeUsdaSizeGuideMaterial(input)}
    }
}
`;
}

const CRC_TABLE = Array.from({ length: 256 }, (_value, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function makeLocalFileHeader(fileName: Buffer, data: Buffer, offset: number) {
  const headerWithoutExtra = 30 + fileName.length;
  const extraLength = (64 - ((offset + headerWithoutExtra) % 64)) % 64;
  const header = Buffer.alloc(30);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(33, 12);
  header.writeUInt32LE(crc32(data), 14);
  header.writeUInt32LE(data.length, 18);
  header.writeUInt32LE(data.length, 22);
  header.writeUInt16LE(fileName.length, 26);
  header.writeUInt16LE(extraLength, 28);

  return Buffer.concat([header, fileName, Buffer.alloc(extraLength)]);
}

function makeCentralDirectoryHeader(fileName: Buffer, data: Buffer, localHeaderOffset: number) {
  const header = Buffer.alloc(46);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(33, 14);
  header.writeUInt32LE(crc32(data), 16);
  header.writeUInt32LE(data.length, 20);
  header.writeUInt32LE(data.length, 24);
  header.writeUInt16LE(fileName.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0o644 << 16, 38);
  header.writeUInt32LE(localHeaderOffset, 42);

  return Buffer.concat([header, fileName]);
}

function makeEndOfCentralDirectory(fileCount: number, centralDirectorySize: number, centralDirectoryOffset: number) {
  const header = Buffer.alloc(22);
  header.writeUInt32LE(0x06054b50, 0);
  header.writeUInt16LE(0, 4);
  header.writeUInt16LE(0, 6);
  header.writeUInt16LE(fileCount, 8);
  header.writeUInt16LE(fileCount, 10);
  header.writeUInt32LE(centralDirectorySize, 12);
  header.writeUInt32LE(centralDirectoryOffset, 16);
  header.writeUInt16LE(0, 20);

  return header;
}

export function makeUsdzFlatPrint(input: FlatPrintAssetInput) {
  const files = [
    ["model.usda", Buffer.from(makeUsdaFlatPrint(input), "utf8")],
    [input.textureFileName, Buffer.from(input.textureBytes)]
  ] as const;
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const [name, data] of files) {
    const fileName = Buffer.from(name, "utf8");
    const localOffset = offset;
    const localHeader = makeLocalFileHeader(fileName, data, localOffset);
    localParts.push(localHeader, data);
    offset += localHeader.length + data.length;
    centralParts.push(makeCentralDirectoryHeader(fileName, data, localOffset));
  }

  const centralDirectoryOffset = offset;
  const centralDirectory = Buffer.concat(centralParts);

  return Buffer.concat([
    ...localParts,
    centralDirectory,
    makeEndOfCentralDirectory(files.length, centralDirectory.length, centralDirectoryOffset)
  ]);
}

export function generateFlatPrintAssets(input: FlatPrintAssetInput): GeneratedFlatPrintAssets {
  assertPngTextureBytes(input.textureBytes, input.expectedTextureByteLength);

  const poster = Buffer.from(input.textureBytes);
  const glb = makeGlbFlatPrint(input);
  const usdz = makeUsdzFlatPrint(input);
  const totalBytes = poster.length + glb.length + usdz.length;

  if (poster.length > AR_ASSET_SIZE_BUDGET_BYTES.poster) {
    throw new Error(`Generated poster exceeds ${AR_ASSET_SIZE_BUDGET_BYTES.poster} bytes.`);
  }

  if (glb.length > AR_ASSET_SIZE_BUDGET_BYTES.glb) {
    throw new Error(`Generated GLB exceeds ${AR_ASSET_SIZE_BUDGET_BYTES.glb} bytes.`);
  }

  if (usdz.length > AR_ASSET_SIZE_BUDGET_BYTES.usdz) {
    throw new Error(`Generated USDZ exceeds ${AR_ASSET_SIZE_BUDGET_BYTES.usdz} bytes.`);
  }

  if (totalBytes > AR_SAMPLE_TOTAL_SIZE_BUDGET_BYTES) {
    throw new Error(`Generated AR bundle exceeds ${AR_SAMPLE_TOTAL_SIZE_BUDGET_BYTES} bytes.`);
  }

  return {
    poster,
    glb,
    usdz,
    meta: {
      poster: { byteLength: poster.length, contentType: input.textureContentType },
      glb: { byteLength: glb.length, contentType: "model/gltf-binary" },
      usdz: { byteLength: usdz.length, contentType: "model/vnd.usdz+zip" }
    }
  };
}
