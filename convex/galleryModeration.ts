"use node";

import { internalActionGeneric as internalAction } from "convex/server";
import { internal as generatedInternal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

import { moderateGeneratedArtwork } from "../lib/openai-moderation-provider";
import { isEnabledEnvironmentValue } from "../lib/community-gallery";

const internal = generatedInternal;

export async function moderateGalleryEntryHandler(ctx: any, args: { entryId: Id<"galleryEntries">; attempt: number }) {
  if (!isEnabledEnvironmentValue(process.env.WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED)) {
    await ctx.runMutation(internal.gallery.recordModerationFailure, {
      entryId: args.entryId,
      attempt: args.attempt
    });
    return null;
  }

  const input = (await ctx.runQuery(internal.gallery.getModerationInput, {
    entryId: args.entryId
  })) as {
    prompt: string;
    imageStorageId: Id<"_storage">;
    imageContentType: string;
  } | null;

  if (!input) {
    return null;
  }

  try {
    const image = await ctx.storage.get(input.imageStorageId);

    if (!image) {
      throw new Error("Generated image is unavailable for moderation.");
    }

    const result = await moderateGeneratedArtwork({
      apiKey: process.env.OPENAI_API_KEY,
      prompt: input.prompt,
      imageBytes: new Uint8Array(await image.arrayBuffer()),
      imageContentType: input.imageContentType
    });

    await ctx.runMutation(internal.gallery.completeModeration, {
      entryId: args.entryId,
      attempt: args.attempt,
      flagged: result.flagged,
      flaggedCategories: result.flaggedCategories
    });
  } catch (error) {
    console.error("Community gallery moderation failed.", {
      entryId: args.entryId,
      attempt: args.attempt,
      error: error instanceof Error ? error.message : "Unknown moderation error"
    });
    await ctx.runMutation(internal.gallery.recordModerationFailure, {
      entryId: args.entryId,
      attempt: args.attempt
    });
  }

  return null;
}

export const moderateGalleryEntry = internalAction({
  args: {
    entryId: v.id("galleryEntries"),
    attempt: v.number()
  },
  returns: v.null(),
  handler: moderateGalleryEntryHandler
});
