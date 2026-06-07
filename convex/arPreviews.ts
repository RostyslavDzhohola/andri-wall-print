import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import {
  assertValidAssetMeta,
  assertValidPrint,
  assetMetaValidator,
  assetStorageIdsValidator,
  printValidator
} from "./validators";

const publicPreviewValidator = v.object({
  id: v.string(),
  slug: v.string(),
  title: v.string(),
  description: v.string(),
  print: printValidator,
  assets: v.object({
    poster: v.union(v.string(), v.null()),
    glb: v.union(v.string(), v.null()),
    usdz: v.union(v.string(), v.null())
  }),
  assetMeta: assetMetaValidator,
  status: v.union(v.literal("ready"), v.literal("unavailable"))
});

function assertSeedToken(seedToken: string) {
  const configuredToken = process.env.PHASE0_SEED_TOKEN;

  if (!configuredToken || seedToken !== configuredToken) {
    throw new Error("Invalid Phase 0 seed token.");
  }
}

export const generateSeedUploadUrl = mutationGeneric({
  args: {
    seedToken: v.string()
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    assertSeedToken(args.seedToken);

    return await ctx.storage.generateUploadUrl();
  }
});

export const upsertSeedPreview = mutationGeneric({
  args: {
    seedToken: v.string(),
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    print: printValidator,
    assetStorageIds: assetStorageIdsValidator,
    assetMeta: assetMetaValidator,
    sourcePdfName: v.optional(v.string())
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    assertSeedToken(args.seedToken);
    assertValidPrint(args.print);
    assertValidAssetMeta(args.assetMeta);

    const now = Date.now();
    const existingPreviews = await ctx.db
      .query("arPreviews")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .collect();

    const preview = {
      slug: args.slug,
      title: args.title,
      description: args.description,
      print: args.print,
      assetStorageIds: args.assetStorageIds,
      assetMeta: args.assetMeta,
      sourcePdfName: args.sourcePdfName,
      status: "ready" as const,
      updatedAt: now
    };

    const [existing, ...duplicates] = existingPreviews;

    if (existing) {
      await ctx.db.patch(existing._id, preview);
      await Promise.all(duplicates.map((duplicate) => ctx.db.delete(duplicate._id)));

      return existing._id;
    }

    return await ctx.db.insert("arPreviews", {
      ...preview,
      createdAt: now
    });
  }
});

export const getPublicPreview = queryGeneric({
  args: {
    slug: v.string()
  },
  returns: v.union(publicPreviewValidator, v.null()),
  handler: async (ctx, args) => {
    const preview = await ctx.db
      .query("arPreviews")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .first();

    if (!preview) {
      return null;
    }

    const [poster, glb, usdz] = await Promise.all([
      ctx.storage.getUrl(preview.assetStorageIds.poster),
      ctx.storage.getUrl(preview.assetStorageIds.glb),
      ctx.storage.getUrl(preview.assetStorageIds.usdz)
    ]);

    return {
      id: preview.slug,
      slug: preview.slug,
      title: preview.title,
      description: preview.description,
      print: preview.print,
      assets: {
        poster,
        glb,
        usdz
      },
      assetMeta: preview.assetMeta,
      status: preview.status
    };
  }
});
