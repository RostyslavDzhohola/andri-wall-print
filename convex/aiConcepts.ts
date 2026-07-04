"use node";

import { internalActionGeneric as internalAction } from "convex/server";
import { internal as generatedInternal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

import { generateOpenAiConceptImage, makeWallPrintConceptPrompt, type OpenAiImageFailure } from "../lib/openai-image-provider";

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
    const generatedImageStorageId = await ctx.storage.store(new Blob([toArrayBuffer(result.bytes)], { type: result.contentType }));
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

    let created: {
      bundleId: Id<"previewBundles">;
      publicSlug: string;
      publicUrl: string;
      status: string;
    };

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
        print: draft.print
      })) as {
        bundleId: Id<"previewBundles">;
        publicSlug: string;
        publicUrl: string;
        status: string;
      };
    } catch {
      await ctx.runMutation(internal.leadRequests.finalizeAiDraftFailure, {
        draftId: args.draftId,
        status: "failed",
        reason: "AI concept image was saved, but preview preparation failed.",
        providerMetadata: result.metadata,
        model: result.model
      });
      return null;
    }

    await ctx.runMutation(internal.leadRequests.finalizeAiDraftReady, {
      draftId: args.draftId,
      generatedImageStorageId,
      generatedImageMeta,
      previewBundleId: created.bundleId,
      publicPreviewSlug: created.publicSlug,
      providerMetadata: result.metadata,
      model: result.model
    });

    return null;
  }
});
