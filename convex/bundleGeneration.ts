"use node";

import { internalActionGeneric as internalAction } from "convex/server";
import { internal as generatedInternal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

import { generateFlatPrintAssets } from "../lib/ar-asset-generator";
import { AR_ASSET_CONTENT_TYPES } from "../lib/ar-launcher";

const internal = generatedInternal;

function errorMessage(error: unknown) {
  if (!(error instanceof Error)) {
    return "This wall preview needs attention.";
  }

  return error.message;
}

function isRejectedUploadError(message: string) {
  return (
    message.startsWith("Uploaded artwork byte length") ||
    message.startsWith("Uploaded artwork is not a valid prepared PNG") ||
    message.startsWith("Prepared upload ") ||
    message.startsWith("Generated poster exceeds") ||
    message.startsWith("Generated GLB exceeds") ||
    message.startsWith("Generated USDZ exceeds") ||
    message.startsWith("Generated AR bundle exceeds")
  );
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
    bundleId: v.id("previewBundles"),
    attempt: v.optional(v.number())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    let input: {
      attempt: number;
      title: string;
      print: { widthMeters: number; heightMeters: number };
      source: {
        storageId: Id<"_storage">;
        originalFileName: string;
        byteLength: number;
      };
      generatorVersion: string;
    } | null = null;

    try {
      input = await ctx.runQuery(internal.previewBundles.getGenerationInput, {
        bundleId: args.bundleId,
        attempt: args.attempt
      });

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
      const reason = errorMessage(error);

      if (input) {
        await ctx.runMutation(internal.previewBundles.finalizeGenerationFailure, {
          bundleId: args.bundleId,
          attempt: input.attempt,
          reason,
          rejected: isRejectedUploadError(reason)
        });
      } else {
        await ctx.runMutation(internal.previewBundles.recordGenerationCrash, {
          bundleId: args.bundleId,
          reason
        });
      }
    }

    return null;
  }
});
