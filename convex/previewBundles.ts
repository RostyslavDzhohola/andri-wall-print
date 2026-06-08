import { internalMutationGeneric as internalMutation, internalQueryGeneric as internalQuery, mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { internal as generatedInternal } from "./_generated/api";
import { ConvexError, v } from "convex/values";

import { AR_SAMPLES } from "../lib/ar-sample";
import {
  DEFAULT_PREVIEW_BUNDLE_CROP,
  DEFAULT_PREVIEW_BUNDLE_PRINT,
  PREVIEW_GENERATOR_VERSION,
  createPreviewBundlePublicSlug,
  makePreviewBundleIdempotencyKey,
  normalizeBundleTitle,
  stableStringify,
  validatePreviewBundleUpload
} from "../lib/preview-bundle-contract";
import { requireWallPrintProSeller } from "./sellerAuth";
import { assetMetaValidator, assetStorageIdsValidator, assetUrlsValidator, previewBundleCropValidator, printValidator } from "./validators";

const internal = generatedInternal;

const sellerBundleValidator = v.object({
  id: v.string(),
  publicSlug: v.string(),
  builderInviteId: v.optional(v.string()),
  createdVia: v.union(v.literal("seller"), v.literal("builder")),
  title: v.string(),
  description: v.string(),
  status: v.string(),
  print: printValidator,
  sourceKind: v.union(v.literal("upload"), v.literal("sample")),
  publicUrl: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  failureReason: v.optional(v.string()),
  rejectionReason: v.optional(v.string())
});

const createdPreviewLinkValidator = v.object({
  bundleId: v.string(),
  publicSlug: v.string(),
  publicUrl: v.string(),
  status: v.string()
});

const generationInputValidator = v.union(
  v.null(),
  v.object({
    bundleId: v.id("previewBundles"),
    publicSlug: v.string(),
    title: v.string(),
    print: printValidator,
    source: v.object({
      storageId: v.id("_storage"),
      originalFileName: v.string(),
      contentType: v.string(),
      byteLength: v.number()
    }),
    generatorVersion: v.string(),
    attempt: v.number()
  })
);

function toPublicUrl(publicSlug: string) {
  return `/preview/${publicSlug}`;
}

function normalizeUploadSourceFingerprint(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new ConvexError({
      code: "INVALID_UPLOAD",
      message: "Upload fingerprint could not be verified."
    });
  }

  return normalized;
}

function logicalUploadSourceId(source: {
  sourceFingerprint?: string;
  originalFileName: string;
  contentType: string;
  byteLength: number;
}) {
  if (source.sourceFingerprint) {
    return `sha256:${source.sourceFingerprint}`;
  }

  return `file:${source.originalFileName}:${source.contentType}:${source.byteLength}`;
}

function logicalPreviewBundleKey(bundle: {
  source:
    | {
        kind: "upload";
        sourceFingerprint?: string;
        originalFileName: string;
        contentType: string;
        byteLength: number;
      }
    | {
        kind: "sample";
        sampleId: string;
      };
  crop: { mode: "contain" | "cover" };
  print: { aspectRatio: string; widthMeters: number; heightMeters: number; label: string };
  generatorVersion: string;
}) {
  const source =
    bundle.source.kind === "sample"
      ? {
          kind: "sample",
          sourceId: bundle.source.sampleId
        }
      : {
          kind: "upload",
          sourceId: logicalUploadSourceId(bundle.source),
          contentType: bundle.source.contentType,
          byteLength: bundle.source.byteLength
        };

  return stableStringify({
    source,
    crop: bundle.crop,
    print: bundle.print,
    generatorVersion: bundle.generatorVersion
  });
}

async function findReusableSellerBundle(
  ctx: any,
  input: {
    sellerSubject: string;
    idempotencyKey: string;
    logicalKey: string;
  }
) {
  const existingByKey = await ctx.db
    .query("previewBundles")
    .withIndex("by_idempotency_key", (q: any) => q.eq("idempotencyKey", input.idempotencyKey))
    .first();

  if (existingByKey && existingByKey.sellerSubject === input.sellerSubject) {
    return existingByKey;
  }

  const recentBundles = await ctx.db
    .query("previewBundles")
    .withIndex("by_seller_createdAt", (q: any) => q.eq("sellerSubject", input.sellerSubject))
    .order("desc")
    .take(100);

  return recentBundles.find((bundle: any) => logicalPreviewBundleKey(bundle) === input.logicalKey) ?? null;
}

function serializeSellerBundle(bundle: {
  _id: string;
  publicSlug: string;
  builderInviteId?: string;
  createdVia?: "seller" | "builder";
  title: string;
  description: string;
  status: string;
  print: { aspectRatio: string; widthMeters: number; heightMeters: number; label: string };
  source: { kind: "upload" | "sample" };
  createdAt: number;
  updatedAt: number;
  failureReason?: string;
  rejectionReason?: string;
}) {
  return {
    id: bundle._id,
    publicSlug: bundle.publicSlug,
    builderInviteId: bundle.builderInviteId,
    createdVia: bundle.createdVia ?? "seller",
    title: bundle.title,
    description: bundle.description,
    status: bundle.status,
    print: bundle.print,
    sourceKind: bundle.source.kind,
    publicUrl: toPublicUrl(bundle.publicSlug),
    createdAt: bundle.createdAt,
    updatedAt: bundle.updatedAt,
    failureReason: bundle.failureReason,
    rejectionReason: bundle.rejectionReason
  };
}

async function getSellerOwnedBundle(ctx: any, bundleId: string) {
  const seller = await requireWallPrintProSeller(ctx);
  const bundle = await ctx.db.get(bundleId as never);

  if (!bundle || bundle.sellerSubject !== seller.subject) {
    throw new ConvexError({
      code: "NOT_FOUND",
      message: "Wall preview was not found for this admin workspace."
    });
  }

  return bundle;
}

export const generateSellerUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireWallPrintProSeller(ctx);
    return await ctx.storage.generateUploadUrl();
  }
});

export const listForSeller = query({
  args: {},
  returns: v.array(sellerBundleValidator),
  handler: async (ctx) => {
    const seller = await requireWallPrintProSeller(ctx);
    const bundles = await ctx.db
      .query("previewBundles")
      .withIndex("by_seller_createdAt", (q) => q.eq("sellerSubject", seller.subject))
      .order("desc")
      .take(100);
    const seen = new Set<string>();
    const uniqueBundles = [];

    for (const bundle of bundles) {
      const key = logicalPreviewBundleKey(bundle);

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      uniqueBundles.push(bundle);

      if (uniqueBundles.length >= 30) {
        break;
      }
    }

    return uniqueBundles.map(serializeSellerBundle);
  }
});

export const getForSeller = query({
  args: {
    bundleId: v.id("previewBundles")
  },
  returns: v.union(sellerBundleValidator, v.null()),
  handler: async (ctx, args) => {
    const seller = await requireWallPrintProSeller(ctx);
    const bundle = await ctx.db.get(args.bundleId);

    if (!bundle || bundle.sellerSubject !== seller.subject) {
      return null;
    }

    return serializeSellerBundle(bundle);
  }
});

export const createBundleFromSample = mutation({
  args: {
    sampleId: v.string(),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    print: v.optional(printValidator)
  },
  returns: createdPreviewLinkValidator,
  handler: async (ctx, args) => {
    const seller = await requireWallPrintProSeller(ctx);
    const sample = AR_SAMPLES.find((candidate) => candidate.id === args.sampleId);

    if (!sample) {
      throw new ConvexError({
        code: "INVALID_SAMPLE",
        message: "Selected saved artwork does not exist."
      });
    }

    const now = Date.now();
    const title = normalizeBundleTitle(args.title ?? sample.title);
    const description = args.description?.trim() || sample.description;
    const print = args.print ?? sample.print ?? DEFAULT_PREVIEW_BUNDLE_PRINT;
    const idempotencyKey = makePreviewBundleIdempotencyKey({
      sellerSubject: seller.subject,
      source: {
        kind: "sample",
        sourceId: sample.id
      },
      crop: DEFAULT_PREVIEW_BUNDLE_CROP,
      print,
      generatorVersion: PREVIEW_GENERATOR_VERSION
    });
    const logicalKey = logicalPreviewBundleKey({
      source: {
        kind: "sample",
        sampleId: sample.id
      },
      crop: DEFAULT_PREVIEW_BUNDLE_CROP,
      print,
      generatorVersion: PREVIEW_GENERATOR_VERSION
    });
    const existing = await findReusableSellerBundle(ctx, {
      sellerSubject: seller.subject,
      idempotencyKey,
      logicalKey
    });

    if (existing) {
      return {
        bundleId: existing._id,
        publicSlug: existing.publicSlug,
        publicUrl: toPublicUrl(existing.publicSlug),
        status: existing.status
      };
    }

    const publicSlug = createPreviewBundlePublicSlug();
    const bundleId = await ctx.db.insert("previewBundles", {
      publicSlug,
      sellerSubject: seller.subject,
      sellerEmail: seller.email,
      createdVia: "seller",
      title,
      description,
      source: {
        kind: "sample",
        sampleId: sample.id
      },
      crop: DEFAULT_PREVIEW_BUNDLE_CROP,
      print,
      generatorVersion: PREVIEW_GENERATOR_VERSION,
      idempotencyKey,
      status: "ready",
      assetUrls: sample.assets,
      publicReadyAt: now,
      createdAt: now,
      updatedAt: now
    });

    return {
      bundleId,
      publicSlug,
      publicUrl: toPublicUrl(publicSlug),
      status: "ready"
    };
  }
});

export const createBundleFromUpload = mutation({
  args: {
    sourceStorageId: v.id("_storage"),
    originalFileName: v.string(),
    contentType: v.string(),
    byteLength: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    sourceFingerprint: v.optional(v.string()),
    print: printValidator,
    crop: v.optional(previewBundleCropValidator)
  },
  returns: createdPreviewLinkValidator,
  handler: async (ctx, args) => {
    const seller = await requireWallPrintProSeller(ctx);
    const uploadValidation = validatePreviewBundleUpload({
      contentType: args.contentType,
      byteLength: args.byteLength
    });

    if (!uploadValidation.ok) {
      throw new ConvexError({
        code: "INVALID_UPLOAD",
        message: uploadValidation.reason
      });
    }

    const now = Date.now();
    const crop = args.crop ?? DEFAULT_PREVIEW_BUNDLE_CROP;
    const title = normalizeBundleTitle(args.title);
    const description = args.description?.trim() || "Wall Print Pro wall preview demo link.";
    const sourceFingerprint = normalizeUploadSourceFingerprint(args.sourceFingerprint);
    const source = {
      kind: "upload" as const,
      storageId: args.sourceStorageId,
      originalFileName: args.originalFileName,
      contentType: args.contentType,
      byteLength: args.byteLength,
      ...(sourceFingerprint ? { sourceFingerprint } : {})
    };
    const idempotencyKey = makePreviewBundleIdempotencyKey({
      sellerSubject: seller.subject,
      source: {
        kind: "upload",
        sourceId: sourceFingerprint ? `sha256:${sourceFingerprint}` : logicalUploadSourceId(source),
        contentType: args.contentType,
        byteLength: args.byteLength
      },
      crop,
      print: args.print,
      generatorVersion: PREVIEW_GENERATOR_VERSION
    });
    const logicalKey = logicalPreviewBundleKey({
      source,
      crop,
      print: args.print,
      generatorVersion: PREVIEW_GENERATOR_VERSION
    });
    const existing = await findReusableSellerBundle(ctx, {
      sellerSubject: seller.subject,
      idempotencyKey,
      logicalKey
    });

    if (existing) {
      return {
        bundleId: existing._id,
        publicSlug: existing.publicSlug,
        publicUrl: toPublicUrl(existing.publicSlug),
        status: existing.status
      };
    }

    const publicSlug = createPreviewBundlePublicSlug();
    const bundleId = await ctx.db.insert("previewBundles", {
      publicSlug,
      sellerSubject: seller.subject,
      sellerEmail: seller.email,
      createdVia: "seller",
      title,
      description,
      source,
      crop,
      print: args.print,
      generatorVersion: PREVIEW_GENERATOR_VERSION,
      idempotencyKey,
      status: "uploaded",
      job: {
        attempt: 1,
        scheduledAt: now
      },
      createdAt: now,
      updatedAt: now
    });

    await ctx.scheduler.runAfter(0, internal.bundleGeneration.generateBundleAssets, { bundleId });

    return {
      bundleId,
      publicSlug,
      publicUrl: toPublicUrl(publicSlug),
      status: "uploaded"
    };
  }
});

export const retryBundle = mutation({
  args: {
    bundleId: v.id("previewBundles")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bundle = await getSellerOwnedBundle(ctx, args.bundleId);

    if (bundle.source.kind !== "upload") {
      throw new ConvexError({
        code: "UNSUPPORTED_RETRY",
        message: "Only uploaded artwork can be prepared again."
      });
    }

    if (!["failed", "rejected", "uploaded"].includes(bundle.status)) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.bundleId, {
      status: "uploaded",
      failureReason: undefined,
      rejectionReason: undefined,
      job: {
        attempt: (bundle.job?.attempt ?? 0) + 1,
        scheduledAt: now
      },
      updatedAt: now
    });
    await ctx.scheduler.runAfter(0, internal.bundleGeneration.generateBundleAssets, { bundleId: args.bundleId });

    return null;
  }
});

export const revokeBundle = mutation({
  args: {
    bundleId: v.id("previewBundles")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bundle = await getSellerOwnedBundle(ctx, args.bundleId);
    const now = Date.now();

    if (bundle.assetStorageIds) {
      await Promise.all([
        ctx.storage.delete(bundle.assetStorageIds.poster),
        ctx.storage.delete(bundle.assetStorageIds.glb),
        ctx.storage.delete(bundle.assetStorageIds.usdz)
      ]);
    }

    await ctx.db.patch(args.bundleId, {
      status: "revoked",
      assetStorageIds: undefined,
      assetUrls: undefined,
      assetMeta: undefined,
      revokedAt: now,
      updatedAt: now
    });

    return null;
  }
});

export const deleteBundle = mutation({
  args: {
    bundleId: v.id("previewBundles")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bundle = await getSellerOwnedBundle(ctx, args.bundleId);
    const storageIds = new Set<string>();

    if (bundle.source.kind === "upload") {
      storageIds.add(bundle.source.storageId);
    }

    if (bundle.assetStorageIds) {
      storageIds.add(bundle.assetStorageIds.poster);
      storageIds.add(bundle.assetStorageIds.glb);
      storageIds.add(bundle.assetStorageIds.usdz);
    }

    await Promise.all(Array.from(storageIds, (storageId) => ctx.storage.delete(storageId as never).catch(() => null)));
    await ctx.db.delete(args.bundleId);

    return null;
  }
});

export const getGenerationInput = internalQuery({
  args: {
    bundleId: v.id("previewBundles")
  },
  returns: generationInputValidator,
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId);

    if (!bundle || bundle.source.kind !== "upload" || bundle.status === "revoked") {
      return null;
    }

    return {
      bundleId: bundle._id,
      publicSlug: bundle.publicSlug,
      title: bundle.title,
      print: bundle.print,
      source: bundle.source,
      generatorVersion: bundle.generatorVersion,
      attempt: bundle.job?.attempt ?? 1
    };
  }
});

export const markGenerating = internalMutation({
  args: {
    bundleId: v.id("previewBundles"),
    attempt: v.number()
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId);

    if (!bundle || bundle.status === "revoked" || (bundle.job?.attempt ?? 1) !== args.attempt) {
      return false;
    }

    await ctx.db.patch(args.bundleId, {
      status: "generating",
      job: {
        attempt: args.attempt,
        scheduledAt: bundle.job?.scheduledAt ?? Date.now(),
        startedAt: Date.now()
      },
      updatedAt: Date.now()
    });

    return true;
  }
});

export const finalizeBundleReady = internalMutation({
  args: {
    bundleId: v.id("previewBundles"),
    attempt: v.number(),
    assetStorageIds: assetStorageIdsValidator,
    assetMeta: assetMetaValidator
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId);

    if (!bundle || bundle.status === "revoked" || (bundle.job?.attempt ?? 1) !== args.attempt) {
      return false;
    }

    const now = Date.now();
    await ctx.db.patch(args.bundleId, {
      status: "ready",
      assetStorageIds: args.assetStorageIds,
      assetUrls: undefined,
      assetMeta: args.assetMeta,
      failureReason: undefined,
      rejectionReason: undefined,
      publicReadyAt: now,
      job: {
        attempt: args.attempt,
        scheduledAt: bundle.job?.scheduledAt ?? now,
        startedAt: bundle.job?.startedAt,
        completedAt: now
      },
      updatedAt: now
    });

    return true;
  }
});

export const finalizeGenerationFailure = internalMutation({
  args: {
    bundleId: v.id("previewBundles"),
    attempt: v.number(),
    reason: v.string(),
    rejected: v.boolean()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId);

    if (!bundle || bundle.status === "revoked" || (bundle.job?.attempt ?? 1) !== args.attempt) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.bundleId, {
      status: args.rejected ? "rejected" : "failed",
      rejectionReason: args.rejected ? args.reason : undefined,
      failureReason: args.rejected ? undefined : args.reason,
      job: {
        attempt: args.attempt,
        scheduledAt: bundle.job?.scheduledAt ?? now,
        startedAt: bundle.job?.startedAt,
        completedAt: now,
        error: args.reason
      },
      updatedAt: now
    });

    return null;
  }
});

export const getReadyPublicBundle = internalQuery({
  args: {
    publicSlug: v.string()
  },
  returns: v.union(
    v.null(),
    v.object({
      id: v.string(),
      slug: v.string(),
      title: v.string(),
      description: v.string(),
      print: printValidator,
      assetStorageIds: v.optional(assetStorageIdsValidator),
      assetUrls: v.optional(assetUrlsValidator),
      assetMeta: v.optional(assetMetaValidator),
      status: v.string()
    })
  ),
  handler: async (ctx, args) => {
    const bundle = await ctx.db
      .query("previewBundles")
      .withIndex("by_public_slug", (q) => q.eq("publicSlug", args.publicSlug))
      .first();

    if (!bundle) {
      return null;
    }

    return {
      id: bundle.publicSlug,
      slug: bundle.publicSlug,
      title: bundle.status === "ready" ? bundle.title : "Wall Print Pro preview",
      description: bundle.status === "ready" ? bundle.description : "Your wall preview is being prepared.",
      print: bundle.print,
      assetStorageIds: bundle.assetStorageIds,
      assetUrls: bundle.assetUrls,
      assetMeta: bundle.assetMeta,
      status: bundle.status
    };
  }
});
