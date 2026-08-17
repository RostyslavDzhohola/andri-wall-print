import {
  internalMutationGeneric as internalMutation,
  internalQueryGeneric as internalQuery,
  queryGeneric as query
} from "convex/server";
import { internal as generatedInternal } from "./_generated/api";
import { v } from "convex/values";

import {
  COMMUNITY_GALLERY_PAGE_SIZE,
  createCommunityGalleryPublicSlug,
  isEnabledEnvironmentValue
} from "../lib/community-gallery";
import { printValidator } from "./validators";

const internal = generatedInternal;
const MODERATION_MODEL = "omni-moderation-latest";
const MODERATION_RETRY_DELAYS_MS = [5 * 60_000, 30 * 60_000] as const;

const publicGallerySampleValidator = v.object({
  id: v.string(),
  title: v.string(),
  description: v.string(),
  sourceKind: v.literal("community_ai"),
  print: printValidator,
  assets: v.object({
    poster: v.string(),
    glb: v.string(),
    usdz: v.string()
  })
});

const publicGalleryPageValidator = v.object({
  page: v.array(publicGallerySampleValidator),
  continueCursor: v.union(v.string(), v.null()),
  isDone: v.boolean()
});

const moderationInputValidator = v.union(
  v.null(),
  v.object({
    prompt: v.string(),
    imageStorageId: v.id("_storage"),
    imageContentType: v.string()
  })
);

function communityGalleryEnabled() {
  return isEnabledEnvironmentValue(process.env.WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED);
}

async function holdEntryWhileGalleryDisabled(ctx: any, entry: any, now: number, attempts: number) {
  await ctx.db.patch(entry._id, {
    moderationOutcome: "error",
    moderationAttempts: attempts,
    moderatedAt: now,
    status: "held",
    updatedAt: now
  });
}

function makePublicAssetMeta(assetMeta: {
  poster: { contentType: string; byteLength: number };
  glb: { contentType: string; byteLength: number };
  usdz: { contentType: string; byteLength: number };
}) {
  return {
    poster: { ...assetMeta.poster, fileName: "community-ai-concept.png" },
    glb: { ...assetMeta.glb, fileName: "community-ai-concept.glb" },
    usdz: { ...assetMeta.usdz, fileName: "community-ai-concept.usdz" }
  };
}

async function serializePublishedEntry(ctx: any, entry: any) {
  const [poster, glb, usdz] = await Promise.all([
    ctx.storage.getUrl(entry.assetStorageIds.poster),
    ctx.storage.getUrl(entry.assetStorageIds.glb),
    ctx.storage.getUrl(entry.assetStorageIds.usdz)
  ]);

  if (!poster || !glb || !usdz) {
    return null;
  }

  return {
    id: entry.publicSlug,
    title: entry.title,
    description: entry.description,
    sourceKind: "community_ai" as const,
    print: entry.print,
    assets: { poster, glb, usdz }
  };
}

export const enqueueReadyAiConcept = internalMutation({
  args: {
    draftId: v.id("aiConceptDrafts")
  },
  returns: v.union(v.id("galleryEntries"), v.null()),
  handler: async (ctx, args) => {
    if (!communityGalleryEnabled()) {
      return null;
    }

    const existing = await ctx.db
      .query("galleryEntries")
      .withIndex("by_ai_concept_draft", (q: any) => q.eq("aiConceptDraftId", args.draftId))
      .unique();

    if (existing) {
      return existing._id;
    }

    const draft = await ctx.db.get(args.draftId);

    if (
      draft?.status !== "ready" ||
      draft.galleryPublicationConsent !== true ||
      !draft.galleryConsentVersion ||
      !draft.galleryConsentRecordedAt ||
      !draft.previewBundleId ||
      !draft.assetStorageIds ||
      !draft.assetMeta
    ) {
      return null;
    }

    const bundle = await ctx.db.get(draft.previewBundleId);

    if (
      bundle?.status !== "ready" ||
      bundle.aiConceptDraftId !== draft._id ||
      !bundle.assetStorageIds ||
      !bundle.assetMeta
    ) {
      return null;
    }

    const now = Date.now();
    const entryId = await ctx.db.insert("galleryEntries", {
      aiConceptDraftId: draft._id,
      previewBundleId: bundle._id,
      publicSlug: createCommunityGalleryPublicSlug(),
      title: "Community AI concept",
      description: "An AI-generated wall print concept shared anonymously with Wall Print Pro.",
      print: bundle.print,
      assetStorageIds: bundle.assetStorageIds,
      assetMeta: makePublicAssetMeta(bundle.assetMeta),
      consentVersion: draft.galleryConsentVersion,
      consentRecordedAt: draft.galleryConsentRecordedAt,
      moderationModel: MODERATION_MODEL,
      moderationOutcome: "pending",
      moderationAttempts: 0,
      status: "pending",
      createdAt: now,
      updatedAt: now
    });

    await ctx.scheduler.runAfter(0, internal.galleryModeration.moderateGalleryEntry, {
      entryId,
      attempt: 1
    });

    return entryId;
  }
});

export const getModerationInput = internalQuery({
  args: {
    entryId: v.id("galleryEntries")
  },
  returns: moderationInputValidator,
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);

    if (entry?.status !== "pending") {
      return null;
    }

    const draft = await ctx.db.get(entry.aiConceptDraftId);

    if (
      draft?.status !== "ready" ||
      draft.galleryPublicationConsent !== true ||
      !draft.generatedImageStorageId ||
      !draft.generatedImageMeta
    ) {
      return null;
    }

    return {
      prompt: draft.prompt,
      imageStorageId: draft.generatedImageStorageId,
      imageContentType: draft.generatedImageMeta.contentType
    };
  }
});

export const completeModeration = internalMutation({
  args: {
    entryId: v.id("galleryEntries"),
    attempt: v.number(),
    flagged: v.boolean(),
    flaggedCategories: v.array(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);

    if (entry?.status !== "pending") {
      return null;
    }

    const now = Date.now();

    if (!communityGalleryEnabled()) {
      await holdEntryWhileGalleryDisabled(ctx, entry, now, args.attempt);
      return null;
    }

    await ctx.db.patch(entry._id, {
      moderationOutcome: args.flagged ? "flagged" : "passed",
      moderationAttempts: args.attempt,
      flaggedCategories: args.flaggedCategories,
      moderatedAt: now,
      status: args.flagged ? "held" : "published",
      ...(args.flagged ? {} : { publishedAt: now }),
      updatedAt: now
    });

    return null;
  }
});

export const recordModerationFailure = internalMutation({
  args: {
    entryId: v.id("galleryEntries"),
    attempt: v.number()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const entry = await ctx.db.get(args.entryId);

    if (entry?.status !== "pending") {
      return null;
    }

    const now = Date.now();

    if (!communityGalleryEnabled()) {
      await holdEntryWhileGalleryDisabled(ctx, entry, now, args.attempt);
      return null;
    }

    const retryDelay = MODERATION_RETRY_DELAYS_MS[args.attempt - 1];

    if (retryDelay !== undefined) {
      await ctx.db.patch(entry._id, {
        moderationOutcome: "error",
        moderationAttempts: args.attempt,
        updatedAt: now
      });
      await ctx.scheduler.runAfter(retryDelay, internal.galleryModeration.moderateGalleryEntry, {
        entryId: entry._id,
        attempt: args.attempt + 1
      });
      return null;
    }

    await ctx.db.patch(entry._id, {
      moderationOutcome: "error",
      moderationAttempts: args.attempt,
      moderatedAt: now,
      status: "held",
      updatedAt: now
    });
    return null;
  }
});

export const listPublished = query({
  args: {
    cursor: v.optional(v.string())
  },
  returns: publicGalleryPageValidator,
  handler: async (ctx, args) => {
    if (!communityGalleryEnabled()) {
      return { page: [], continueCursor: null, isDone: true };
    }

    const result = await ctx.db
      .query("galleryEntries")
      .withIndex("by_status_createdAt", (q: any) => q.eq("status", "published"))
      .order("desc")
      .paginate({ numItems: COMMUNITY_GALLERY_PAGE_SIZE, cursor: args.cursor ?? null });
    const serialized = await Promise.all(result.page.map((entry: any) => serializePublishedEntry(ctx, entry)));

    return {
      page: serialized.filter((entry): entry is NonNullable<typeof entry> => entry !== null),
      continueCursor: result.continueCursor,
      isDone: result.isDone
    };
  }
});

export const getPublishedBySlug = query({
  args: {
    slug: v.string()
  },
  returns: v.union(publicGallerySampleValidator, v.null()),
  handler: async (ctx, args) => {
    if (!communityGalleryEnabled()) {
      return null;
    }

    const entry = await ctx.db
      .query("galleryEntries")
      .withIndex("by_public_slug", (q: any) => q.eq("publicSlug", args.slug))
      .unique();

    if (entry?.status !== "published") {
      return null;
    }

    return await serializePublishedEntry(ctx, entry);
  }
});
