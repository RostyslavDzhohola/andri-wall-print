import { internalMutationGeneric as internalMutation, internalQueryGeneric as internalQuery, mutationGeneric as mutation } from "convex/server";
import { internal as generatedInternal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";

import {
  DEFAULT_PREVIEW_BUNDLE_CROP,
  DEFAULT_PREVIEW_BUNDLE_PRINT,
  PREVIEW_GENERATOR_VERSION,
  createPreviewBundlePublicSlug,
  formatPreviewBundlePrintDimensions,
  makePreviewBundleIdempotencyKey,
  normalizePreviewBundlePrintDisplay,
  normalizeBundleTitle,
  type PreviewBundlePrint,
  type PreviewBundleStatus
} from "../lib/preview-bundle-contract";
import {
  makePreviewConfirmationAreaBasis,
  normalizePreviewConfirmationNote,
  type PreviewConfirmationAreaBasis
} from "../lib/preview-confirmation-contract";
import { getChicagoGenerationDayKey } from "../lib/lead-request-contract";
import {
  HOMEPAGE_UPLOAD_BUNDLE_DAILY_CAP,
  UPLOAD_FINGERPRINT_DAILY_CAP,
  UPLOAD_URL_DAILY_CAP,
  getContactBucketCount,
  getDailyCapCount,
  reserveContactBucket,
  reserveDailyCap
} from "./dailyCaps";
import {
  assertValidPrint,
  assetMetaValidator,
  assetStorageIdsValidator,
  assetUrlsValidator,
  previewConfirmationAreaBasisValidator,
  printValidator
} from "./validators";
import { validateStoredPreviewUpload } from "./uploadValidation";

const internal = generatedInternal;

export const GENERATION_UPLOADED_STALE_MS = 2 * 60 * 1000;
export const GENERATION_GENERATING_STALE_MS = 10 * 60 * 1000;
export const GENERATION_MAX_AUTO_ATTEMPTS = 3;

const GENERATION_AUTO_FAILURE_REASON =
  "Wall preview generation did not finish after 3 attempts. Please retry or upload the artwork again.";
const UPLOAD_CAP_MESSAGE = "Wall previews are at capacity today. Please call us or try again tomorrow.";

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

function logicalAiConceptSourceId(source: {
  aiConceptDraftId: Id<"aiConceptDrafts">;
  leadRequestId: Id<"leadRequests">;
  byteLength: number;
}) {
  return `ai:${source.leadRequestId}:${source.aiConceptDraftId}:${source.byteLength}`;
}

function logicalHomepageUploadSourceId(source: { sourceFingerprint: string; byteLength: number }) {
  return `homepage:${source.sourceFingerprint}:${source.byteLength}`;
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

type PreviewBundleJobRecord = {
  attempt: number;
  scheduledAt: number;
  scheduledFunctionId?: string;
  startedAt?: number;
  completedAt?: number;
  error?: string;
};

type PreviewBundleGenerationRecord = {
  _id: Id<"previewBundles">;
  publicSlug: string;
  title: string;
  status: PreviewBundleStatus | string;
  source:
    | {
        kind: "upload";
        storageId: Id<"_storage">;
        originalFileName: string;
        contentType: string;
        byteLength: number;
        sourceFingerprint?: string;
      }
    | {
        kind: "sample";
        sampleId: string;
      }
    | {
        kind: "ai_concept";
        storageId: Id<"_storage">;
        originalFileName: string;
        contentType: string;
        byteLength: number;
        leadRequestId: Id<"leadRequests">;
        aiConceptDraftId: Id<"aiConceptDrafts">;
        prompt: string;
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
  bundle: { _id: string; publicSlug: string }
) {
  if (!confirmation || confirmation.previewBundleId !== bundle._id || confirmation.publicSlug !== bundle.publicSlug) {
    return undefined;
  }

  return serializePublicConfirmation(confirmation);
}

async function listBundleConfirmations(ctx: any, bundleId: string, limit?: number) {
  const queryResult = ctx.db
    .query("previewConfirmations")
    .withIndex("by_preview_bundle_createdAt", (q: any) => q.eq("previewBundleId", bundleId))
    .order("desc");

  return limit === undefined ? await queryResult.collect() : await queryResult.take(limit);
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

export function serializeGenerationInput(bundle: PreviewBundleGenerationRecord | null | undefined, requestedAttempt?: number) {
  if (!bundle || bundle.source.kind === "sample" || bundle.status !== "uploaded") {
    return null;
  }

  const attempt = generationAttempt(bundle);

  if (requestedAttempt !== undefined && attempt !== requestedAttempt) {
    return null;
  }

  if (requestedAttempt === undefined && bundle.job?.scheduledFunctionId) {
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
    attempt
  };
}

export function isFreshPreviewGeneration(bundle: PreviewBundleGenerationRecord, now = Date.now()) {
  if (bundle.source.kind === "sample") {
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
  if (bundle.source.kind === "sample") {
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
  const scheduledFunctionId = await ctx.scheduler.runAfter(0, internal.bundleGeneration.generateBundleAssets, { bundleId, attempt });

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

async function markGenerationPermanentlyFailed(ctx: any, bundle: PreviewBundleGenerationRecord, reason: string, completedAt = Date.now()) {
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

export async function generateHomepageUploadUrlHandler(ctx: any) {
  const now = Date.now();
  const dayKey = `uploadUrls:${getChicagoGenerationDayKey(now)}`;
  const reserved = await reserveDailyCap(ctx, dayKey, UPLOAD_URL_DAILY_CAP, now);

  if (!reserved) {
    throw new ConvexError({
      code: "UPLOAD_CAP_REACHED",
      message: UPLOAD_CAP_MESSAGE
    });
  }

  return await ctx.storage.generateUploadUrl();
}

export const generateHomepageUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await generateHomepageUploadUrlHandler(ctx);
  }
});

type CreateHomepageUploadBundleArgs = {
  sourceStorageId: string;
  originalFileName: string;
  contentType: string;
  byteLength: number;
  sourceFingerprint: string;
  title: string;
  print: PreviewBundlePrint;
};

type IdempotentBundleCandidate = {
  source: {
    kind: string;
    sourceFingerprint?: string;
    byteLength?: number;
    contentType?: string;
  };
  print: Pick<PreviewBundlePrint, "aspectRatio" | "widthMeters" | "heightMeters">;
  crop: {
    mode: string;
  };
  status: string;
  job?: {
    attempt?: number;
  };
};

export type IdempotentBundleExpected = {
  kind: "upload";
  sourceFingerprint: string;
  byteLength: number;
  contentType: string;
  print: PreviewBundlePrint;
  cropMode?: "contain" | "cover";
};

export type IdempotentBundleReuseDecision =
  | { action: "insert" }
  | { action: "reuse" }
  | { action: "requeue"; attempt: number }
  | { action: "unavailable" };

export function selectIdempotentBundleReuse(
  existing: IdempotentBundleCandidate | null | undefined,
  expected: IdempotentBundleExpected
): IdempotentBundleReuseDecision {
  if (
    !existing ||
    existing.source.kind !== expected.kind ||
    existing.source.sourceFingerprint !== expected.sourceFingerprint ||
    existing.source.byteLength !== expected.byteLength ||
    existing.source.contentType !== expected.contentType ||
    existing.print.aspectRatio !== expected.print.aspectRatio ||
    existing.print.widthMeters !== expected.print.widthMeters ||
    existing.print.heightMeters !== expected.print.heightMeters ||
    existing.crop.mode !== (expected.cropMode ?? DEFAULT_PREVIEW_BUNDLE_CROP.mode)
  ) {
    return { action: "insert" };
  }

  if (["uploaded", "validating", "generating", "ready"].includes(existing.status)) {
    return { action: "reuse" };
  }

  if (existing.status === "failed") {
    return {
      action: "requeue",
      attempt: (existing.job?.attempt ?? 0) + 1
    };
  }

  if (existing.status === "rejected" || existing.status === "revoked") {
    return { action: "unavailable" };
  }

  return { action: "insert" };
}

export async function createHomepageUploadBundleHandler(ctx: any, args: CreateHomepageUploadBundleArgs) {
  assertValidPrint(args.print);
  const verifiedUpload = await validateStoredPreviewUpload(ctx, {
    sourceStorageId: args.sourceStorageId,
    contentType: args.contentType,
    byteLength: args.byteLength,
    sourceFingerprint: args.sourceFingerprint
  });
  const now = Date.now();
  const crop = DEFAULT_PREVIEW_BUNDLE_CROP;
  const title = normalizeBundleTitle(args.title);
  const idempotencyKey = makePreviewBundleIdempotencyKey({
    sellerSubject: "public-homepage",
    source: {
      kind: "upload",
      sourceId: logicalHomepageUploadSourceId(verifiedUpload),
      contentType: verifiedUpload.contentType,
      byteLength: verifiedUpload.byteLength
    },
    crop,
    print: args.print,
    generatorVersion: PREVIEW_GENERATOR_VERSION
  });
  const existing = await ctx.db
    .query("previewBundles")
    .withIndex("by_idempotency_key", (q: any) => q.eq("idempotencyKey", idempotencyKey))
    .first();
  const reuseDecision = selectIdempotentBundleReuse(existing, {
    kind: "upload",
    sourceFingerprint: verifiedUpload.sourceFingerprint,
    byteLength: verifiedUpload.byteLength,
    contentType: verifiedUpload.contentType,
    print: args.print,
    cropMode: crop.mode
  });

  if (reuseDecision.action === "reuse" && existing) {
    return {
      bundleId: existing._id,
      publicSlug: existing.publicSlug,
      publicUrl: toPublicUrl(existing.publicSlug),
      status: existing.status
    };
  }

  if (reuseDecision.action === "requeue" && existing) {
    await scheduleBundleGenerationJob(ctx, existing._id, reuseDecision.attempt, now);

    return {
      bundleId: existing._id,
      publicSlug: existing.publicSlug,
      publicUrl: toPublicUrl(existing.publicSlug),
      status: "uploaded"
    };
  }

  if (reuseDecision.action === "unavailable") {
    throw new ConvexError({
      code: "PREVIEW_UNAVAILABLE",
      message: "This artwork can not be previewed. Please try a different image."
    });
  }

  const dayKey = getChicagoGenerationDayKey(now);
  const uploadsDayKey = `uploads:${dayKey}`;
  const fingerprintKey = `fp:${verifiedUpload.sourceFingerprint}`;
  const globalCount = await getDailyCapCount(ctx, uploadsDayKey);
  const fingerprintCount = await getContactBucketCount(ctx, fingerprintKey, dayKey);

  if (
    globalCount >= HOMEPAGE_UPLOAD_BUNDLE_DAILY_CAP ||
    fingerprintCount >= UPLOAD_FINGERPRINT_DAILY_CAP
  ) {
    throw new ConvexError({
      code: "UPLOAD_CAP_REACHED",
      message: UPLOAD_CAP_MESSAGE
    });
  }

  await reserveDailyCap(ctx, uploadsDayKey, HOMEPAGE_UPLOAD_BUNDLE_DAILY_CAP, now);
  await reserveContactBucket(ctx, fingerprintKey, dayKey, UPLOAD_FINGERPRINT_DAILY_CAP, now);

  const publicSlug = createPreviewBundlePublicSlug();
  const bundleId = await ctx.db.insert("previewBundles", {
    publicSlug,
    sellerSubject: "public-homepage",
    title,
    description: "Artwork uploaded for an instant Wall Print Pro wall preview.",
    source: {
      kind: "upload",
      storageId: args.sourceStorageId,
      originalFileName: args.originalFileName,
      contentType: verifiedUpload.contentType,
      byteLength: verifiedUpload.byteLength,
      sourceFingerprint: verifiedUpload.sourceFingerprint
    },
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

export const createHomepageUploadBundle = mutation({
  args: {
    sourceStorageId: v.id("_storage"),
    originalFileName: v.string(),
    contentType: v.string(),
    byteLength: v.number(),
    sourceFingerprint: v.string(),
    title: v.string(),
    print: printValidator
  },
  returns: createdPreviewLinkValidator,
  handler: async (ctx, args) => {
    return await createHomepageUploadBundleHandler(ctx, args);
  }
});

export const createBundleFromAiConcept = internalMutation({
  args: {
    leadRequestId: v.id("leadRequests"),
    aiConceptDraftId: v.id("aiConceptDrafts"),
    sourceStorageId: v.id("_storage"),
    originalFileName: v.string(),
    contentType: v.literal("image/png"),
    byteLength: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    prompt: v.string(),
    print: v.optional(printValidator),
    assetStorageIds: v.optional(assetStorageIdsValidator),
    assetMeta: v.optional(assetMetaValidator)
  },
  returns: createdPreviewLinkValidator,
  handler: async (ctx, args) => {
    const now = Date.now();
    const crop = DEFAULT_PREVIEW_BUNDLE_CROP;
    const title = normalizeBundleTitle(args.title);
    const description = args.description?.trim() || "Wall Print Pro AI concept draft for seller review.";
    const print = args.print ?? DEFAULT_PREVIEW_BUNDLE_PRINT;
    assertValidPrint(print);

    const source = {
      kind: "ai_concept" as const,
      storageId: args.sourceStorageId,
      originalFileName: args.originalFileName,
      contentType: args.contentType,
      byteLength: args.byteLength,
      leadRequestId: args.leadRequestId,
      aiConceptDraftId: args.aiConceptDraftId,
      prompt: args.prompt
    };
    const idempotencyKey = makePreviewBundleIdempotencyKey({
      sellerSubject: "public-leads",
      source: {
        kind: "ai_concept",
        sourceId: logicalAiConceptSourceId(source),
        contentType: args.contentType,
        byteLength: args.byteLength
      },
      crop,
      print,
      generatorVersion: PREVIEW_GENERATOR_VERSION
    });
    const publicSlug = createPreviewBundlePublicSlug();
    const bundleId = await ctx.db.insert("previewBundles", {
      publicSlug,
      sellerSubject: "public-leads",
      createdVia: "lead",
      leadRequestId: args.leadRequestId,
      aiConceptDraftId: args.aiConceptDraftId,
      title,
      description,
      source,
      crop,
      print,
      generatorVersion: PREVIEW_GENERATOR_VERSION,
      idempotencyKey,
      status: args.assetStorageIds && args.assetMeta ? "ready" : "uploaded",
      ...(args.assetStorageIds ? { assetStorageIds: args.assetStorageIds } : {}),
      ...(args.assetMeta ? { assetMeta: args.assetMeta } : {}),
      ...(args.assetStorageIds && args.assetMeta ? { publicReadyAt: now } : {}),
      createdAt: now,
      updatedAt: now
    });

    if (!args.assetStorageIds || !args.assetMeta) {
      await scheduleBundleGenerationJob(ctx, bundleId, 1, now);
    }

    return {
      bundleId,
      publicSlug,
      publicUrl: toPublicUrl(publicSlug),
      status: args.assetStorageIds && args.assetMeta ? "ready" : "uploaded"
    };
  }
});

export const getGenerationInput = internalQuery({
  args: {
    bundleId: v.id("previewBundles"),
    attempt: v.optional(v.number())
  },
  returns: generationInputValidator,
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId);

    return serializeGenerationInput(bundle, args.attempt);
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

    if (!bundle || bundle.source.kind === "sample" || bundle.status !== "uploaded" || (bundle.job?.attempt ?? 1) !== args.attempt) {
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

export const recordGenerationCrash = internalMutation({
  args: {
    bundleId: v.id("previewBundles"),
    reason: v.string()
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const bundle = await ctx.db.get(args.bundleId);

    if (!bundle || bundle.source.kind === "sample" || !["uploaded", "generating"].includes(bundle.status)) {
      return null;
    }

    await markGenerationPermanentlyFailed(ctx, bundle, args.reason);

    return null;
  }
});

export const recoverStaleGenerationJobs = internalMutation({
  args: {},
  returns: v.object({
    retried: v.number(),
    failed: v.number(),
    ignored: v.number()
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const [uploadedBundles, generatingBundles] = await Promise.all([
      ctx.db
        .query("previewBundles")
        .withIndex("by_status_createdAt", (q: any) => q.eq("status", "uploaded"))
        .order("asc")
        .take(200),
      ctx.db
        .query("previewBundles")
        .withIndex("by_status_createdAt", (q: any) => q.eq("status", "generating"))
        .order("asc")
        .take(200)
    ]);
    let retried = 0;
    let failed = 0;
    let ignored = 0;

    for (const bundle of [...uploadedBundles, ...generatingBundles]) {
      const decision = selectStaleGenerationRecovery(bundle, now);

      if (decision.action === "retry") {
        await scheduleBundleGenerationJob(ctx, bundle._id, decision.attempt, now);
        retried += 1;
        continue;
      }

      if (decision.action === "fail") {
        await markGenerationPermanentlyFailed(ctx, bundle, decision.reason, now);
        failed += 1;
        continue;
      }

      ignored += 1;
    }

    return {
      retried,
      failed,
      ignored
    };
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
	      sourceKind: v.union(v.literal("upload"), v.literal("sample"), v.literal("ai_concept")),
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
	      sourceKind: bundle.source.kind,
	      status: bundle.status
	    };
  }
});
