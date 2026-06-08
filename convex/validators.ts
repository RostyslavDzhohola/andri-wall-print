import { v } from "convex/values";

import { PREVIEW_BUNDLE_STATUSES } from "../lib/preview-bundle-contract";

type PrintPayload = {
  widthMeters: number;
  heightMeters: number;
};

type AssetMetaPayload = {
  poster: { byteLength: number };
  glb: { byteLength: number };
  usdz: { byteLength: number };
};

export const printValidator = v.object({
  aspectRatio: v.string(),
  // Convex number validators are structural; assertValidPrint enforces ranges before writes.
  widthMeters: v.number(),
  heightMeters: v.number(),
  label: v.string()
});

export const assetStorageIdsValidator = v.object({
  poster: v.id("_storage"),
  glb: v.id("_storage"),
  usdz: v.id("_storage")
});

export const assetUrlsValidator = v.object({
  poster: v.string(),
  glb: v.string(),
  usdz: v.string()
});

export const assetMetaValidator = v.object({
  poster: v.object({
    fileName: v.string(),
    contentType: v.string(),
    // Convex number validators are structural; assertValidAssetMeta enforces integer byte sizes before writes.
    byteLength: v.number()
  }),
  glb: v.object({
    fileName: v.string(),
    contentType: v.string(),
    byteLength: v.number()
  }),
  usdz: v.object({
    fileName: v.string(),
    contentType: v.string(),
    byteLength: v.number()
  })
});

export const previewBundleStatusValidator = v.union(...PREVIEW_BUNDLE_STATUSES.map((status) => v.literal(status)));

export const previewBundleCropValidator = v.object({
  mode: v.union(v.literal("contain"), v.literal("cover"))
});

export const previewBundleSourceValidator = v.union(
  v.object({
    kind: v.literal("upload"),
    storageId: v.id("_storage"),
    originalFileName: v.string(),
    contentType: v.string(),
    byteLength: v.number(),
    sourceFingerprint: v.optional(v.string())
  }),
  v.object({
    kind: v.literal("sample"),
    sampleId: v.string()
  })
);

function assertPositiveFiniteNumber(fieldName: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive finite number.`);
  }
}

function assertNonNegativeSafeInteger(fieldName: string, value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }
}

export function assertValidPrint(print: PrintPayload) {
  assertPositiveFiniteNumber("print.widthMeters", print.widthMeters);
  assertPositiveFiniteNumber("print.heightMeters", print.heightMeters);
}

export function assertValidAssetMeta(assetMeta: AssetMetaPayload) {
  assertNonNegativeSafeInteger("assetMeta.poster.byteLength", assetMeta.poster.byteLength);
  assertNonNegativeSafeInteger("assetMeta.glb.byteLength", assetMeta.glb.byteLength);
  assertNonNegativeSafeInteger("assetMeta.usdz.byteLength", assetMeta.usdz.byteLength);
}
