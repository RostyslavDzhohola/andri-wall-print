"use node";

import { internalActionGeneric as internalAction } from "convex/server";
import { internal as generatedInternal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

import { generateFlatPrintAssets, type GeneratedFlatPrintAssets } from "../lib/ar-asset-generator";
import { AR_ASSET_CONTENT_TYPES } from "../lib/ar-launcher";
import { generateOpenAiConceptImage, makeWallPrintConceptPrompt, type OpenAiImageFailure } from "../lib/openai-image-provider";
import { DEFAULT_PREVIEW_BUNDLE_PRINT, PREVIEW_GENERATOR_VERSION, type PreviewBundlePrint } from "../lib/preview-bundle-contract";

const internal = generatedInternal as any;

export function mapOpenAiFailureToAiDraftFailure(failure: OpenAiImageFailure) {
  return {
    status: failure.code === "refused" ? ("rejected" as const) : ("failed" as const),
    reason: failure.reason,
    providerFailureCode: failure.code,
    ...(failure.metadata ? { providerMetadata: failure.metadata } : {})
  };
}

function toArrayBuffer(bytes: Uint8Array) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
}

function fileStem(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "concept-draft"
  );
}

function assetFileStem(value: string) {
  return fileStem(value.replace(/\.[^.]+$/, ""));
}

function generationErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Generated artwork could not be prepared for wall placement.";
}

export type AiConceptArGenerationResult =
  | {
      status: "ready";
      assets: GeneratedFlatPrintAssets;
      assetMeta: {
        poster: { fileName: string; contentType: string; byteLength: number };
        glb: { fileName: string; contentType: string; byteLength: number };
        usdz: { fileName: string; contentType: string; byteLength: number };
      };
    }
  | {
      status: "composite_only";
      posterBytes: Uint8Array;
      reason: string;
    };

export function generateAiConceptArAssets(input: {
  textureBytes: Uint8Array;
  textureFileName: string;
  textureContentType: "image/png";
  expectedTextureByteLength: number;
  title: string;
  print?: PreviewBundlePrint;
  generator?: string;
}): AiConceptArGenerationResult {
  const print = input.print ?? DEFAULT_PREVIEW_BUNDLE_PRINT;
  const stem = assetFileStem(input.textureFileName);

  try {
    const assets = generateFlatPrintAssets({
      textureBytes: input.textureBytes,
      textureFileName: `${stem}.png`,
      textureContentType: input.textureContentType,
      expectedTextureByteLength: input.expectedTextureByteLength,
      title: input.title,
      widthMeters: print.widthMeters,
      heightMeters: print.heightMeters,
      generator: input.generator ?? PREVIEW_GENERATOR_VERSION
    });

    return {
      status: "ready",
      assets,
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
    };
  } catch (error) {
    return {
      status: "composite_only",
      posterBytes: input.textureBytes,
      reason: generationErrorMessage(error)
    };
  }
}

export const generateConceptDraft = internalAction({
  args: {
    draftId: v.id("aiConceptDrafts")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = (await ctx.runQuery(internal.leadRequests.getAiDraftForGeneration, {
      draftId: args.draftId
    })) as
      | {
          draftId: Id<"aiConceptDrafts">;
          leadRequestId: Id<"leadRequests">;
          prompt: string;
          businessName?: string;
          wallDescription?: string;
          contactName: string;
          print?: {
            aspectRatio: string;
            widthMeters: number;
            heightMeters: number;
            label: string;
          };
        }
      | null;

    if (!draft) {
      return null;
    }

    const claimed = await ctx.runMutation(internal.leadRequests.markAiDraftGenerating, {
      draftId: args.draftId
    });

    if (!claimed) {
      return null;
    }

    const prompt = makeWallPrintConceptPrompt({
      conceptPrompt: draft.prompt,
      businessName: draft.businessName,
      wallDescription: draft.wallDescription
    });
    const result = await generateOpenAiConceptImage({
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_IMAGE_MODEL,
      print: draft.print,
      prompt
    });

    if (!result.ok) {
      const failure = mapOpenAiFailureToAiDraftFailure(result);
      await ctx.runMutation(internal.leadRequests.finalizeAiDraftFailure, {
        draftId: args.draftId,
        status: failure.status,
        reason: failure.reason,
        providerMetadata: failure.providerMetadata,
        providerFailureCode: failure.providerFailureCode
      });
      return null;
    }

    const fileName = `${fileStem(draft.contactName)}-concept.png`;
    let generatedImageStorageId: Id<"_storage">;

    try {
      generatedImageStorageId = await ctx.storage.store(new Blob([toArrayBuffer(result.bytes)], { type: result.contentType }));
    } catch (error) {
      await ctx.runMutation(internal.leadRequests.finalizeAiDraftFailure, {
        draftId: args.draftId,
        status: "failed",
        reason: generationErrorMessage(error),
        providerMetadata: result.metadata,
        model: result.model
      });
      return null;
    }

    const generatedImageMeta = {
      fileName,
      contentType: result.contentType,
      byteLength: result.bytes.byteLength
    };
    await ctx.runMutation(internal.leadRequests.recordAiDraftGeneratedImage, {
      draftId: args.draftId,
      generatedImageStorageId,
      generatedImageMeta,
      providerMetadata: result.metadata,
      model: result.model
    });

    const arAssets = generateAiConceptArAssets({
      textureBytes: result.bytes,
      textureFileName: fileName,
      textureContentType: result.contentType,
      expectedTextureByteLength: result.bytes.byteLength,
      title: `${draft.contactName} concept draft`,
      print: draft.print,
      generator: PREVIEW_GENERATOR_VERSION
    });

    if (arAssets.status === "composite_only") {
      await ctx.runMutation(internal.leadRequests.finalizeAiDraftCompositeOnly, {
        draftId: args.draftId,
        generatedImageStorageId,
        generatedImageMeta,
        reason: arAssets.reason,
        providerMetadata: result.metadata,
        model: result.model
      });
      return null;
    }

    let glbStorageId: Id<"_storage">;
    let usdzStorageId: Id<"_storage">;

    try {
      [glbStorageId, usdzStorageId] = await Promise.all([
        ctx.storage.store(new Blob([toArrayBuffer(arAssets.assets.glb)], { type: AR_ASSET_CONTENT_TYPES.glb })),
        ctx.storage.store(new Blob([toArrayBuffer(arAssets.assets.usdz)], { type: AR_ASSET_CONTENT_TYPES.usdz }))
      ]);
    } catch (error) {
      await ctx.runMutation(internal.leadRequests.finalizeAiDraftCompositeOnly, {
        draftId: args.draftId,
        generatedImageStorageId,
        generatedImageMeta,
        reason: generationErrorMessage(error),
        providerMetadata: result.metadata,
        model: result.model
      });
      return null;
    }

    const assetStorageIds = {
      poster: generatedImageStorageId,
      glb: glbStorageId,
      usdz: usdzStorageId
    };
    let created: {
      bundleId: Id<"previewBundles">;
      publicSlug: string;
      publicUrl: string;
      status: string;
    } | null = null;

    try {
      created = (await ctx.runMutation(internal.previewBundles.createBundleFromAiConcept, {
        leadRequestId: draft.leadRequestId,
        aiConceptDraftId: draft.draftId,
        sourceStorageId: generatedImageStorageId,
        originalFileName: fileName,
        contentType: result.contentType,
        byteLength: result.bytes.byteLength,
        title: `${draft.contactName} concept draft`,
        description: "Concept draft generated from a client request. Seller review required before artwork is final.",
        prompt: draft.prompt,
        print: draft.print,
        assetStorageIds,
        assetMeta: arAssets.assetMeta
      })) as {
        bundleId: Id<"previewBundles">;
        publicSlug: string;
        publicUrl: string;
        status: string;
      };
    } catch (error) {
      console.error("Failed to create preview bundle from AI concept draft.", {
        draftId: args.draftId,
        error
      });
      created = null;
    }

    await ctx.runMutation(internal.leadRequests.finalizeAiDraftReady, {
      draftId: args.draftId,
      generatedImageStorageId,
      generatedImageMeta,
      assetStorageIds,
      assetMeta: arAssets.assetMeta,
      ...(created
        ? {
            previewBundleId: created.bundleId,
            publicPreviewSlug: created.publicSlug
          }
        : {}),
      providerMetadata: result.metadata,
      model: result.model
    });

    return null;
  }
});
