"use node";

import { internalActionGeneric as internalAction } from "convex/server";
import { internal as generatedInternal } from "./_generated/api";
import { v } from "convex/values";

import { generateFlatPrintAssets } from "../lib/ar-asset-generator";
import { AR_ASSET_CONTENT_TYPES } from "../lib/ar-launcher";

const internal = generatedInternal;

function errorMessage(error: unknown) {
  return error instanceof Error ? "Uploaded artwork could not be prepared." : "This wall preview needs attention.";
}

function fileStem(fileName: string) {
  return fileName
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "wall-print";
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

export const generateBundleAssets = internalAction({
  args: {
    bundleId: v.id("previewBundles")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const input = await ctx.runQuery(internal.previewBundles.getGenerationInput, args);

    if (!input) {
      return null;
    }

    const claimed = await ctx.runMutation(internal.previewBundles.markGenerating, {
      bundleId: args.bundleId,
      attempt: input.attempt
    });

    if (!claimed) {
      return null;
    }

    try {
      const sourceUrl = await ctx.storage.getUrl(input.source.storageId);

      if (!sourceUrl) {
        throw new Error("Uploaded artwork is not available.");
      }

      const response = await fetch(sourceUrl);

      if (!response.ok) {
        throw new Error("Uploaded artwork could not be opened.");
      }

      const textureBytes = new Uint8Array(await response.arrayBuffer());
      const stem = fileStem(input.source.originalFileName);
      const assets = generateFlatPrintAssets({
        textureBytes,
        textureFileName: `${stem}.png`,
        textureContentType: "image/png",
        expectedTextureByteLength: input.source.byteLength,
        title: input.title,
        widthMeters: input.print.widthMeters,
        heightMeters: input.print.heightMeters,
        generator: input.generatorVersion
      });
      const [poster, glb, usdz] = await Promise.all([
        ctx.storage.store(new Blob([toArrayBuffer(assets.poster)], { type: AR_ASSET_CONTENT_TYPES.poster })),
        ctx.storage.store(new Blob([toArrayBuffer(assets.glb)], { type: AR_ASSET_CONTENT_TYPES.glb })),
        ctx.storage.store(new Blob([toArrayBuffer(assets.usdz)], { type: AR_ASSET_CONTENT_TYPES.usdz }))
      ]);

      await ctx.runMutation(internal.previewBundles.finalizeBundleReady, {
        bundleId: args.bundleId,
        attempt: input.attempt,
        assetStorageIds: {
          poster,
          glb,
          usdz
        },
        assetMeta: {
          poster: {
            fileName: `${stem}.png`,
            contentType: AR_ASSET_CONTENT_TYPES.poster,
            byteLength: assets.meta.poster.byteLength
          },
          glb: {
            fileName: `${stem}.glb`,
            contentType: AR_ASSET_CONTENT_TYPES.glb,
            byteLength: assets.meta.glb.byteLength
          },
          usdz: {
            fileName: `${stem}.usdz`,
            contentType: AR_ASSET_CONTENT_TYPES.usdz,
            byteLength: assets.meta.usdz.byteLength
          }
        }
      });
    } catch (error) {
      await ctx.runMutation(internal.previewBundles.finalizeGenerationFailure, {
        bundleId: args.bundleId,
        attempt: input.attempt,
        reason: errorMessage(error),
        rejected: false
      });
    }

    return null;
  }
});
