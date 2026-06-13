import { internalMutationGeneric as internalMutation, internalQueryGeneric as internalQuery, mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { internal as generatedInternal } from "./_generated/api";
import { ConvexError, v } from "convex/values";

import { AR_SAMPLES } from "../lib/ar-sample";
import {
  DEFAULT_PREVIEW_BUNDLE_CROP,
  DEFAULT_PREVIEW_BUNDLE_PRINT,
  PREVIEW_GENERATOR_VERSION,
  createPreviewBundlePublicSlug,
  formatPreviewBundlePrintDimensions,
  makePreviewBundleIdempotencyKey,
  normalizePreviewBundlePrintDisplay,
  normalizeBundleTitle,
  stableStringify,
  type PreviewBundlePrint,
  type PreviewBundleStatus
} from "../lib/preview-bundle-contract";
import {
  DEFAULT_PRICE_PER_SQUARE_FOOT_CENTS,
  SELLER_PRICING_CURRENCY,
  estimatePreviewPricing
} from "../lib/pricing-estimator";
import {
  makeInternalEstimate,
  makePreviewConfirmationAreaBasis,
  normalizePreviewConfirmationNote,
  type InternalAreaPricing,
  type PreviewConfirmationAreaBasis
} from "../lib/preview-confirmation-contract";
import { requireWallPrintProSeller } from "./sellerAuth";
import { readSellerPricingState } from "./sellerPricing";
import { normalizeUploadSourceFingerprint, validateStoredPreviewUpload } from "./uploadValidation";
import {
  assertValidPrint,
  assetMetaValidator,
  assetStorageIdsValidator,
  assetUrlsValidator,
  previewBundleCropValidator,
  previewConfirmationAreaBasisValidator,
  printValidator
} from "./validators";

const internal = generatedInternal;

export const GENERATION_UPLOADED_STALE_MS = 2 * 60 * 1000;
export const GENERATION_GENERATING_STALE_MS = 10 * 60 * 1000;
export const GENERATION_MAX_AUTO_ATTEMPTS = 3;

const GENERATION_AUTO_FAILURE_REASON =
  "Wall preview generation did not finish after 3 attempts. Please retry or upload the artwork again.";

const internalEstimateValidator = v.object({
  amount: v.number(),
  currency: v.string(),
  label: v.string(),
  source: v.literal("area_rate")
});

const sellerPricingEstimateValidator = v.object({
  currency: v.literal("USD"),
  areaSquareFeet: v.number(),
  pricePerSquareFootCents: v.number(),
  estimateCents: v.number()
});

const sellerConfirmationValidator = v.object({
  id: v.string(),
  publicSlug: v.string(),
  previewBundleId: v.string(),
  selectedArtworkTitle: v.string(),
  selectedPrintLabel: v.string(),
  selectedWidthMeters: v.number(),
  selectedHeightMeters: v.number(),
  areaBasis: previewConfirmationAreaBasisValidator,
  buyerNote: v.optional(v.string()),
  internalEstimate: v.optional(internalEstimateValidator),
  createdAt: v.number()
});

const publicConfirmationValidator = v.object({
  id: v.string(),
  publicSlug: v.string(),
  previewBundleId: v.string(),
  selectedArtworkTitle: v.string(),
  selectedPrintLabel: v.string(),
  selectedWidthMeters: v.number(),
  selectedHeightMeters: v.number(),
  areaBasis: previewConfirmationAreaBasisValidator,
  buyerNote: v.optional(v.string()),
  createdAt: v.number()
});

const sellerBundleValidator = v.object({
  id: v.string(),
  publicSlug: v.string(),
  builderInviteId: v.optional(v.string()),
  createdVia: v.union(v.literal("seller"), v.literal("builder")),
  title: v.string(),
  description: v.string(),
  status: v.string(),
  print: printValidator,
  pricing: sellerPricingEstimateValidator,
  sourceKind: v.union(v.literal("upload"), v.literal("sample")),
  publicUrl: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
  failureReason: v.optional(v.string()),
  rejectionReason: v.optional(v.string()),
  confirmations: v.array(sellerConfirmationValidator)
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
    print: {
      aspectRatio: bundle.print.aspectRatio,
      widthMeters: bundle.print.widthMeters,
      heightMeters: bundle.print.heightMeters
    },
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

type PreviewConfirmationRecord = {
  _id: string;
  previewBundleId: string;
  publicSlug: string;
  selectedArtworkTitle: string;
  selectedPrintLabel: string;
  selectedWidthMeters: number;
  selectedHeightMeters: number;
  areaBasis: PreviewConfirmationAreaBasis;
  buyerNote?: string;
  createdAt: number;
};

type SellerBundleRecord = {
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
};

type PreviewBundleJobRecord = {
  attempt: number;
  scheduledAt: number;
  scheduledFunctionId?: string;
  startedAt?: number;
  completedAt?: number;
  error?: string;
};

type PreviewBundleGenerationRecord = {
  _id: string;
  publicSlug: string;
  title: string;
  status: PreviewBundleStatus | string;
  source:
    | {
        kind: "upload";
        storageId: string;
        originalFileName: string;
        contentType: string;
        byteLength: number;
        sourceFingerprint?: string;
      }
    | {
        kind: "sample";
        sampleId: string;
      };
  print: PreviewBundlePrint;
  generatorVersion: string;
  job?: PreviewBundleJobRecord;
  createdAt: number;
  updatedAt: number;
};

export type StaleGenerationRecoveryDecision =
  | {
      action: "ignore";
    }
  | {
      action: "retry";
      attempt: number;
    }
  | {
      action: "fail";
      attempt: number;
      reason: string;
    };

type SellerPricingForSerialization = {
  currency?: string;
  pricePerSquareFootCents: number;
};

function sellerPricingToInternalAreaPricing(pricing: SellerPricingForSerialization): InternalAreaPricing {
  return {
    ratePerSquareFoot: pricing.pricePerSquareFootCents / 100,
    currency: pricing.currency ?? SELLER_PRICING_CURRENCY
  };
}

export function serializePublicConfirmation(confirmation: PreviewConfirmationRecord) {
  return {
    id: confirmation._id,
    publicSlug: confirmation.publicSlug,
    previewBundleId: confirmation.previewBundleId,
    selectedArtworkTitle: confirmation.selectedArtworkTitle,
    selectedPrintLabel: formatPreviewBundlePrintDimensions({
      widthMeters: confirmation.selectedWidthMeters,
      heightMeters: confirmation.selectedHeightMeters
    }),
    selectedWidthMeters: confirmation.selectedWidthMeters,
    selectedHeightMeters: confirmation.selectedHeightMeters,
    areaBasis: confirmation.areaBasis,
    buyerNote: confirmation.buyerNote,
    createdAt: confirmation.createdAt
  };
}

export function serializeReusablePublicConfirmationForBundle(
  confirmation: PreviewConfirmationRecord | null | undefined,
  bundle: Pick<SellerBundleRecord, "_id" | "publicSlug">
) {
  if (!confirmation || confirmation.previewBundleId !== bundle._id || confirmation.publicSlug !== bundle.publicSlug) {
    return undefined;
  }

  return serializePublicConfirmation(confirmation);
}

export function serializeSellerConfirmation(confirmation: PreviewConfirmationRecord, pricing: SellerPricingForSerialization) {
  return {
    ...serializePublicConfirmation(confirmation),
    internalEstimate: makeInternalEstimate(confirmation.areaBasis, sellerPricingToInternalAreaPricing(pricing))
  };
}

export function serializeSellerBundle(
  bundle: SellerBundleRecord,
  confirmations: PreviewConfirmationRecord[] = [],
  pricing: SellerPricingForSerialization = {
    currency: SELLER_PRICING_CURRENCY,
    pricePerSquareFootCents: DEFAULT_PRICE_PER_SQUARE_FOOT_CENTS
  }
) {
  return {
    id: bundle._id,
    publicSlug: bundle.publicSlug,
    builderInviteId: bundle.builderInviteId,
    createdVia: bundle.createdVia ?? "seller",
    title: bundle.title,
    description: bundle.description,
    status: bundle.status,
    print: normalizePreviewBundlePrintDisplay(bundle.print),
    pricing: estimatePreviewPricing(bundle.print, pricing.pricePerSquareFootCents),
    sourceKind: bundle.source.kind,
    publicUrl: toPublicUrl(bundle.publicSlug),
    createdAt: bundle.createdAt,
    updatedAt: bundle.updatedAt,
    failureReason: bundle.failureReason,
    rejectionReason: bundle.rejectionReason,
    confirmations: confirmations.map((confirmation) => serializeSellerConfirmation(confirmation, pricing))
  };
}

async function listBundleConfirmations(ctx: any, bundleId: string, limit?: number) {
  const queryResult = ctx.db
    .query("previewConfirmations")
    .withIndex("by_preview_bundle_createdAt", (q: any) => q.eq("previewBundleId", bundleId))
    .order("desc");

  return limit === undefined ? await queryResult.collect() : await queryResult.take(limit);
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

function generationAttempt(bundle: Pick<PreviewBundleGenerationRecord, "job">) {
  return bundle.job?.attempt ?? 1;
}

function generationUploadedAgeMs(bundle: PreviewBundleGenerationRecord, now: number) {
  return now - (bundle.job?.scheduledAt ?? bundle.updatedAt ?? bundle.createdAt);
}

function generationGeneratingAgeMs(bundle: PreviewBundleGenerationRecord, now: number) {
  return now - (bundle.job?.startedAt ?? bundle.updatedAt ?? bundle.job?.scheduledAt ?? bundle.createdAt);
}

export function serializeGenerationInput(bundle: PreviewBundleGenerationRecord | null | undefined) {
  if (!bundle || bundle.source.kind !== "upload" || bundle.status !== "uploaded") {
    return null;
  }

  return {
    bundleId: bundle._id,
    publicSlug: bundle.publicSlug,
    title: bundle.title,
    print: normalizePreviewBundlePrintDisplay(bundle.print),
    source: {
      storageId: bundle.source.storageId,
      originalFileName: bundle.source.originalFileName,
      contentType: bundle.source.contentType,
      byteLength: bundle.source.byteLength
    },
    generatorVersion: bundle.generatorVersion,
    attempt: generationAttempt(bundle)
  };
}

export function isFreshPreviewGeneration(bundle: PreviewBundleGenerationRecord, now = Date.now()) {
  if (bundle.source.kind !== "upload") {
    return false;
  }

  if (bundle.status === "uploaded") {
    return generationUploadedAgeMs(bundle, now) < GENERATION_UPLOADED_STALE_MS;
  }

  if (bundle.status === "generating") {
    return generationGeneratingAgeMs(bundle, now) < GENERATION_GENERATING_STALE_MS;
  }

  return false;
}

export function selectStaleGenerationRecovery(
  bundle: PreviewBundleGenerationRecord,
  now = Date.now()
): StaleGenerationRecoveryDecision {
  if (bundle.source.kind !== "upload") {
    return { action: "ignore" };
  }

  const attempt = generationAttempt(bundle);

  if (bundle.status === "uploaded") {
    if (generationUploadedAgeMs(bundle, now) < GENERATION_UPLOADED_STALE_MS) {
      return { action: "ignore" };
    }

    if (attempt >= GENERATION_MAX_AUTO_ATTEMPTS) {
      return {
        action: "fail",
        attempt,
        reason: GENERATION_AUTO_FAILURE_REASON
      };
    }

    return {
      action: "retry",
      attempt: attempt + 1
    };
  }

  if (bundle.status === "generating") {
    if (generationGeneratingAgeMs(bundle, now) < GENERATION_GENERATING_STALE_MS) {
      return { action: "ignore" };
    }

    if (attempt >= GENERATION_MAX_AUTO_ATTEMPTS) {
      return {
        action: "fail",
        attempt,
        reason: GENERATION_AUTO_FAILURE_REASON
      };
    }

    return {
      action: "retry",
      attempt: attempt + 1
    };
  }

  return { action: "ignore" };
}

export async function scheduleBundleGenerationJob(ctx: any, bundleId: string, attempt: number, scheduledAt = Date.now()) {
  const scheduledFunctionId = await ctx.scheduler.runAfter(0, internal.bundleGeneration.generateBundleAssets, { bundleId });

  await ctx.db.patch(bundleId as never, {
    status: "uploaded",
    failureReason: undefined,
    rejectionReason: undefined,
    job: {
      attempt,
      scheduledAt,
      scheduledFunctionId
    },
    updatedAt: scheduledAt
  });

  return scheduledFunctionId;
}

async function markGenerationPermanentlyFailed(
  ctx: any,
  bundle: PreviewBundleGenerationRecord,
  reason: string,
  completedAt = Date.now()
) {
  await ctx.db.patch(bundle._id as never, {
    status: "failed",
    failureReason: reason,
    rejectionReason: undefined,
    job: {
      attempt: generationAttempt(bundle),
      scheduledAt: bundle.job?.scheduledAt ?? completedAt,
      scheduledFunctionId: bundle.job?.scheduledFunctionId,
      startedAt: bundle.job?.startedAt,
      completedAt,
      error: reason
    },
    updatedAt: completedAt
  });
}

export const generateSellerUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireWallPrintProSeller(ctx);
    return await ctx.storage.generateUploadUrl();
  }
});

export const submitPublicConfirmation = mutation({
  args: {
    publicSlug: v.string(),
    buyerNote: v.optional(v.string())
  },
  returns: publicConfirmationValidator,
  handler: async (ctx, args) => {
    const publicSlug = args.publicSlug.trim();

    if (!publicSlug) {
      throw new ConvexError({
        code: "INVALID_CONFIRMATION",
        message: "This preview could not be confirmed."
      });
    }

    const bundle = await ctx.db
      .query("previewBundles")
      .withIndex("by_public_slug", (q) => q.eq("publicSlug", publicSlug))
      .first();

    if (!bundle || bundle.status !== "ready") {
      throw new ConvexError({
        code: "PREVIEW_UNAVAILABLE",
        message: "This preview is not available for confirmation."
      });
    }

    const existingConfirmation = await ctx.db
      .query("previewConfirmations")
      .withIndex("by_public_slug_createdAt", (q) => q.eq("publicSlug", bundle.publicSlug))
      .order("desc")
      .first();
    const reusableConfirmation = serializeReusablePublicConfirmationForBundle(existingConfirmation, bundle);

    if (reusableConfirmation) {
      return reusableConfirmation;
    }

    const now = Date.now();
    const buyerNote = normalizePreviewConfirmationNote(args.buyerNote);
    const areaBasis = makePreviewConfirmationAreaBasis(bundle.print);
    const confirmation = {
      previewBundleId: bundle._id,
      publicSlug: bundle.publicSlug,
      selectedArtworkTitle: bundle.title,
      selectedPrintLabel: formatPreviewBundlePrintDimensions(bundle.print),
      selectedWidthMeters: bundle.print.widthMeters,
      selectedHeightMeters: bundle.print.heightMeters,
      areaBasis,
      ...(buyerNote ? { buyerNote } : {}),
      createdAt: now
    };
    const confirmationId = await ctx.db.insert("previewConfirmations", confirmation);

    return serializePublicConfirmation({
      _id: confirmationId,
      ...confirmation
    });
  }
});

export const listForSeller = query({
  args: {},
  returns: v.array(sellerBundleValidator),
  handler: async (ctx) => {
    const seller = await requireWallPrintProSeller(ctx);
    const pricing = await readSellerPricingState(ctx, seller.subject);
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

    const serializedBundles = [];

    for (const bundle of uniqueBundles) {
      serializedBundles.push(serializeSellerBundle(bundle, await listBundleConfirmations(ctx, bundle._id, 1), pricing));
    }

    return serializedBundles;
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

    const pricing = await readSellerPricingState(ctx, seller.subject);
    return serializeSellerBundle(bundle, await listBundleConfirmations(ctx, bundle._id, 20), pricing);
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
    assertValidPrint(print);
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
    const requestedFingerprint = normalizeUploadSourceFingerprint(args.sourceFingerprint);
    const storedUpload = await validateStoredPreviewUpload(ctx, {
      sourceStorageId: args.sourceStorageId,
      contentType: args.contentType,
      byteLength: args.byteLength,
      sourceFingerprint: requestedFingerprint
    });
    assertValidPrint(args.print);

    const now = Date.now();
    const crop = args.crop ?? DEFAULT_PREVIEW_BUNDLE_CROP;
    const title = normalizeBundleTitle(args.title);
    const description = args.description?.trim() || "Wall Print Pro wall preview demo link.";
    const source = {
      kind: "upload" as const,
      storageId: args.sourceStorageId,
      originalFileName: args.originalFileName,
      contentType: storedUpload.contentType,
      byteLength: storedUpload.byteLength,
      sourceFingerprint: storedUpload.sourceFingerprint
    };
    const idempotencyKey = makePreviewBundleIdempotencyKey({
      sellerSubject: seller.subject,
      source: {
        kind: "upload",
        sourceId: `sha256:${storedUpload.sourceFingerprint}`,
        contentType: storedUpload.contentType,
        byteLength: storedUpload.byteLength
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
      createdAt: now,
      updatedAt: now
    });

    await scheduleBundleGenerationJob(ctx, bundleId, 1, now);

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
    await scheduleBundleGenerationJob(ctx, args.bundleId, (bundle.job?.attempt ?? 0) + 1, now);

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

    const confirmations = await listBundleConfirmations(ctx, args.bundleId);
    const buyerClaims = await ctx.db
      .query("buyerPreviewClaims")
      .withIndex("by_preview_bundle", (q: any) => q.eq("previewBundleId", args.bundleId))
      .collect();

    await Promise.all([
      ...Array.from(storageIds, (storageId) => ctx.storage.delete(storageId as never).catch(() => null)),
      ...confirmations.map((confirmation: { _id: string }) => ctx.db.delete(confirmation._id as never)),
      ...buyerClaims.map((claim: { _id: string }) => ctx.db.delete(claim._id as never))
    ]);
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

    return serializeGenerationInput(bundle);
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

    if (!bundle || bundle.source.kind !== "upload" || bundle.status !== "uploaded" || (bundle.job?.attempt ?? 1) !== args.attempt) {
      return false;
    }

    const now = Date.now();
    await ctx.db.patch(args.bundleId, {
      status: "generating",
      job: {
        attempt: args.attempt,
        scheduledAt: bundle.job?.scheduledAt ?? now,
        scheduledFunctionId: bundle.job?.scheduledFunctionId,
        startedAt: now
      },
      updatedAt: now
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

    if (!bundle || bundle.status !== "generating" || (bundle.job?.attempt ?? 1) !== args.attempt) {
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
        scheduledFunctionId: bundle.job?.scheduledFunctionId,
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

    if (!bundle || !["uploaded", "generating"].includes(bundle.status) || (bundle.job?.attempt ?? 1) !== args.attempt) {
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
        scheduledFunctionId: bundle.job?.scheduledFunctionId,
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
      print: normalizePreviewBundlePrintDisplay(bundle.print),
      assetStorageIds: bundle.assetStorageIds,
      assetUrls: bundle.assetUrls,
      assetMeta: bundle.assetMeta,
      status: bundle.status
    };
  }
});
