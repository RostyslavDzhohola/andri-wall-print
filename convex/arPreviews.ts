import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";

import { normalizePreviewBundlePrintDisplay } from "../lib/preview-bundle-contract";
import { isFreshPreviewGeneration } from "./previewBundles";
import {
  assertValidAssetMeta,
  assertValidPrint,
  assetMetaValidator,
  assetStorageIdsValidator,
  printValidator
} from "./validators";

const readyPublicPreviewValidator = v.object({
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
  sourceKind: v.optional(v.union(v.literal("upload"), v.literal("sample"), v.literal("ai_concept"))),
  status: v.literal("ready")
});

const publicPreviewValidator = v.union(
  readyPublicPreviewValidator,
  v.object({
    id: v.string(),
    slug: v.string(),
    status: v.union(v.literal("preparing"), v.literal("unavailable")),
    reason: v.optional(v.string())
  })
);

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

async function getStorageAssetUrls(
  ctx: any,
  assetStorageIds: { poster: string; glb: string; usdz: string }
) {
  const [poster, glb, usdz] = await Promise.all([
    ctx.storage.getUrl(assetStorageIds.poster),
    ctx.storage.getUrl(assetStorageIds.glb),
    ctx.storage.getUrl(assetStorageIds.usdz)
  ]);

  return {
    poster,
    glb,
    usdz
  };
}

export async function getPublicPreviewHandler(ctx: any, args: { slug: string }) {
  const bundle = await ctx.db
    .query("previewBundles")
    .withIndex("by_public_slug", (q: any) => q.eq("publicSlug", args.slug))
    .first();

  if (bundle) {
    if (bundle.status === "ready") {
      const assets =
        bundle.assetUrls ??
        (bundle.assetStorageIds ? await getStorageAssetUrls(ctx, bundle.assetStorageIds) : { poster: null, glb: null, usdz: null });

      if (assets.poster && assets.glb && assets.usdz && bundle.assetMeta) {
        return {
          id: bundle.publicSlug,
          slug: bundle.publicSlug,
          title: bundle.title,
          description: bundle.description,
          print: normalizePreviewBundlePrintDisplay(bundle.print),
          assets,
          assetMeta: bundle.assetMeta,
          sourceKind: bundle.source.kind,
          status: "ready" as const
        };
      }

      if (assets.poster && assets.glb && assets.usdz && bundle.assetUrls) {
        return {
          id: bundle.publicSlug,
          slug: bundle.publicSlug,
          title: bundle.title,
          description: bundle.description,
          print: normalizePreviewBundlePrintDisplay(bundle.print),
          assets,
          assetMeta: {
            poster: { fileName: "sample-poster", contentType: "image/png", byteLength: 0 },
            glb: { fileName: "sample.glb", contentType: "model/gltf-binary", byteLength: 0 },
            usdz: { fileName: "sample.usdz", contentType: "model/vnd.usdz+zip", byteLength: 0 }
          },
          sourceKind: bundle.source.kind,
          status: "ready" as const
        };
      }

      return {
        id: bundle.publicSlug,
        slug: bundle.publicSlug,
        status: "unavailable" as const,
        reason: "This client preview is not available."
      };
    }

    if ((bundle.status === "uploaded" || bundle.status === "generating") && isFreshPreviewGeneration(bundle)) {
      return {
        id: bundle.publicSlug,
        slug: bundle.publicSlug,
        status: "preparing" as const,
        reason: "This client preview is being prepared. Check back shortly."
      };
    }

    return {
      id: bundle.publicSlug,
      slug: bundle.publicSlug,
      status: "unavailable" as const,
      reason: "This client preview is not available."
    };
  }

  const preview = await ctx.db
    .query("arPreviews")
    .withIndex("by_slug", (q: any) => q.eq("slug", args.slug))
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
    print: normalizePreviewBundlePrintDisplay(preview.print),
    assets: {
      poster,
      glb,
      usdz
    },
    assetMeta: preview.assetMeta,
    sourceKind: "sample" as const,
    status: "ready" as const
  };
}

export const getPublicPreview = queryGeneric({
  args: {
    slug: v.string()
  },
  returns: v.union(publicPreviewValidator, v.null()),
  handler: getPublicPreviewHandler
});
