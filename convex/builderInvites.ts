import { internal as generatedInternal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";

import { AR_SAMPLES } from "../lib/ar-sample";
import {
  BUILDER_INVITE_MAX_GENERATIONS,
  BUILDER_INVITE_MAX_UPLOAD_STARTS,
  builderInviteStatusMessage,
  canGenerateWithBuilderInvite,
  canStartUploadWithBuilderInvite,
  createBuilderInviteToken,
  getBuilderInviteAccess,
  getDefaultBuilderInviteExpiresAt,
  hashBuilderInviteToken,
  isBuilderInviteTokenShape
} from "../lib/builder-invite-contract";
import {
  DEFAULT_PREVIEW_BUNDLE_CROP,
  PREVIEW_GENERATOR_VERSION,
  createPreviewBundlePublicSlug,
  makePreviewBundleIdempotencyKey,
  normalizeBundleTitle
} from "../lib/preview-bundle-contract";
import { requireWallPrintProSeller } from "./sellerAuth";
import { normalizeUploadSourceFingerprint, validateStoredPreviewUpload } from "./uploadValidation";
import { assertValidPrint, previewBundleCropValidator, printValidator } from "./validators";

const internal = generatedInternal;

const inviteStatusValidator = v.union(v.literal("valid"), v.literal("expired"), v.literal("revoked"), v.literal("not_found"));

const publicInviteValidationValidator = v.object({
  status: inviteStatusValidator,
  message: v.string(),
  expiresAt: v.union(v.number(), v.null()),
  remainingGenerations: v.number(),
  remainingUploadStarts: v.number()
});

const sellerInviteValidator = v.object({
  id: v.string(),
  status: inviteStatusValidator,
  expiresAt: v.number(),
  maxGenerations: v.number(),
  generatedCount: v.number(),
  remainingGenerations: v.number(),
  maxUploadStarts: v.number(),
  uploadStartedCount: v.number(),
  remainingUploadStarts: v.number(),
  revokedAt: v.optional(v.number()),
  createdAt: v.number(),
  updatedAt: v.number()
});

const createdInviteValidator = v.object({
  id: v.string(),
  token: v.string(),
  path: v.string(),
  expiresAt: v.number(),
  maxGenerations: v.number(),
  maxUploadStarts: v.number()
});

const generatedLinkValidator = v.object({
  bundleId: v.string(),
  publicSlug: v.string(),
  publicUrl: v.string(),
  status: v.string()
});

function publicUrl(publicSlug: string) {
  return `/preview/${publicSlug}`;
}

function builderPath(token: string) {
  return `/invite/${token}`;
}

function throwConvexCode(code: string, message: string): never {
  throw new ConvexError({
    code,
    message
  });
}

async function findInviteByToken(ctx: any, token: string) {
  if (!isBuilderInviteTokenShape(token)) {
    return null;
  }

  const tokenHash = await hashBuilderInviteToken(token);

  return await ctx.db
    .query("builderInvites")
    .withIndex("by_token_hash", (q: any) => q.eq("tokenHash", tokenHash))
    .first();
}

async function requireInviteForGeneration(ctx: any, token: string) {
  const invite = await findInviteByToken(ctx, token);
  const access = canGenerateWithBuilderInvite(invite);

  if (!access.ok) {
    throwConvexCode(access.code.toUpperCase(), access.message);
  }

  return invite;
}

async function requireInviteForUploadStart(ctx: any, token: string) {
  const invite = await findInviteByToken(ctx, token);
  const access = canStartUploadWithBuilderInvite(invite);

  if (!access.ok) {
    throwConvexCode(access.code.toUpperCase(), access.message);
  }

  return invite;
}

function serializeSellerInvite(invite: any) {
  const access = getBuilderInviteAccess(invite);

  return {
    id: invite._id,
    status: access.status,
    expiresAt: invite.expiresAt,
    maxGenerations: invite.maxGenerations,
    generatedCount: invite.generatedCount,
    remainingGenerations: access.remainingGenerations,
    maxUploadStarts: invite.maxUploadStarts,
    uploadStartedCount: invite.uploadStartedCount,
    remainingUploadStarts: access.remainingUploadStarts,
    revokedAt: invite.revokedAt,
    createdAt: invite.createdAt,
    updatedAt: invite.updatedAt
  };
}

export const createInvite = mutation({
  args: {
    expiresAt: v.optional(v.number())
  },
  returns: createdInviteValidator,
  handler: async (ctx, args) => {
    const seller = await requireWallPrintProSeller(ctx);
    const now = Date.now();
    const expiresAt = args.expiresAt ?? getDefaultBuilderInviteExpiresAt(now);

    if (!Number.isFinite(expiresAt) || expiresAt <= now) {
      throwConvexCode("INVALID_EXPIRY", "Demo upload link expiry must be in the future.");
    }

    const token = createBuilderInviteToken();
    const tokenHash = await hashBuilderInviteToken(token);
    const id = await ctx.db.insert("builderInvites", {
      sellerSubject: seller.subject,
      tokenHash,
      expiresAt,
      maxGenerations: BUILDER_INVITE_MAX_GENERATIONS,
      generatedCount: 0,
      maxUploadStarts: BUILDER_INVITE_MAX_UPLOAD_STARTS,
      uploadStartedCount: 0,
      createdAt: now,
      updatedAt: now
    });

    return {
      id,
      token,
      path: builderPath(token),
      expiresAt,
      maxGenerations: BUILDER_INVITE_MAX_GENERATIONS,
      maxUploadStarts: BUILDER_INVITE_MAX_UPLOAD_STARTS
    };
  }
});

export const listForSeller = query({
  args: {},
  returns: v.array(sellerInviteValidator),
  handler: async (ctx) => {
    const seller = await requireWallPrintProSeller(ctx);
    const invites = await ctx.db
      .query("builderInvites")
      .withIndex("by_seller_createdAt", (q) => q.eq("sellerSubject", seller.subject))
      .order("desc")
      .take(20);

    return invites.map(serializeSellerInvite);
  }
});

export const revokeInvite = mutation({
  args: {
    inviteId: v.id("builderInvites")
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const seller = await requireWallPrintProSeller(ctx);
    const invite = await ctx.db.get(args.inviteId);

    if (!invite || invite.sellerSubject !== seller.subject) {
      throwConvexCode("NOT_FOUND", "Demo upload link was not found for this admin workspace.");
    }

    if (!invite.revokedAt) {
      await ctx.db.patch(args.inviteId, {
        revokedAt: Date.now(),
        updatedAt: Date.now()
      });
    }

    return null;
  }
});

export const validateInvite = query({
  args: {
    token: v.string()
  },
  returns: publicInviteValidationValidator,
  handler: async (ctx, args) => {
    const invite = await findInviteByToken(ctx, args.token);
    const access = getBuilderInviteAccess(invite);

    return {
      status: access.status,
      message: builderInviteStatusMessage(access.status),
      expiresAt: access.expiresAt,
      remainingGenerations: access.remainingGenerations,
      remainingUploadStarts: access.remainingUploadStarts
    };
  }
});

export const generateBuilderUploadUrl = mutation({
  args: {
    token: v.string()
  },
  returns: v.string(),
  handler: async (ctx, args) => {
    const invite = await requireInviteForUploadStart(ctx, args.token);

    await ctx.db.patch(invite._id, {
      uploadStartedCount: invite.uploadStartedCount + 1,
      updatedAt: Date.now()
    });

    return await ctx.storage.generateUploadUrl();
  }
});

export const createBundleFromSample = mutation({
  args: {
    token: v.string(),
    sampleId: v.string()
  },
  returns: generatedLinkValidator,
  handler: async (ctx, args) => {
    const invite = await requireInviteForGeneration(ctx, args.token);
    const sample = AR_SAMPLES.find((candidate) => candidate.id === args.sampleId);

    if (!sample) {
      throwConvexCode("INVALID_SAMPLE", "Selected saved artwork does not exist.");
    }

    assertValidPrint(sample.print);

    const now = Date.now();
    const generationNumber = invite.generatedCount + 1;
    const title = normalizeBundleTitle(sample.title);
    const publicSlug = createPreviewBundlePublicSlug();
    const idempotencyKey = makePreviewBundleIdempotencyKey({
      sellerSubject: invite.sellerSubject,
      source: {
        kind: "sample",
        sourceId: `${invite._id}:${sample.id}:${generationNumber}:${now}`
      },
      crop: DEFAULT_PREVIEW_BUNDLE_CROP,
      print: sample.print,
      generatorVersion: PREVIEW_GENERATOR_VERSION
    });

    const bundleId = await ctx.db.insert("previewBundles", {
      publicSlug,
      sellerSubject: invite.sellerSubject,
      builderInviteId: invite._id,
      createdVia: "builder" as const,
      title,
      description: sample.description,
      source: {
        kind: "sample" as const,
        sampleId: sample.id
      },
      crop: DEFAULT_PREVIEW_BUNDLE_CROP,
      print: sample.print,
      generatorVersion: PREVIEW_GENERATOR_VERSION,
      idempotencyKey,
      status: "ready" as const,
      assetUrls: sample.assets,
      publicReadyAt: now,
      createdAt: now,
      updatedAt: now
    });

    await ctx.db.patch(invite._id, {
      generatedCount: generationNumber,
      updatedAt: now
    });

    return {
      bundleId,
      publicSlug,
      publicUrl: publicUrl(publicSlug),
      status: "ready"
    };
  }
});

export const createBundleFromUpload = mutation({
  args: {
    token: v.string(),
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
  returns: generatedLinkValidator,
  handler: async (ctx, args) => {
    const invite = await requireInviteForGeneration(ctx, args.token);
    const requestedFingerprint = normalizeUploadSourceFingerprint(args.sourceFingerprint);
    const storedUpload = await validateStoredPreviewUpload(ctx, {
      sourceStorageId: args.sourceStorageId,
      contentType: args.contentType,
      byteLength: args.byteLength,
      sourceFingerprint: requestedFingerprint
    });

    assertValidPrint(args.print);

    const now = Date.now();
    const generationNumber = invite.generatedCount + 1;
    const crop = args.crop ?? DEFAULT_PREVIEW_BUNDLE_CROP;
    const title = normalizeBundleTitle(args.title);
    const description = args.description?.trim() || "Wall Print Pro wall preview demo link.";
    const publicSlug = createPreviewBundlePublicSlug();
    const idempotencyKey = makePreviewBundleIdempotencyKey({
      sellerSubject: invite.sellerSubject,
      source: {
        kind: "upload",
        sourceId: `${invite._id}:${storedUpload.sourceFingerprint}:${generationNumber}:${now}`,
        contentType: storedUpload.contentType,
        byteLength: storedUpload.byteLength,
        originalFileName: args.originalFileName
      },
      crop,
      print: args.print,
      generatorVersion: PREVIEW_GENERATOR_VERSION
    });

    const bundleId = await ctx.db.insert("previewBundles", {
      publicSlug,
      sellerSubject: invite.sellerSubject,
      builderInviteId: invite._id,
      createdVia: "builder" as const,
      title,
      description,
      source: {
        kind: "upload" as const,
        storageId: args.sourceStorageId,
        originalFileName: args.originalFileName,
        contentType: storedUpload.contentType,
        byteLength: storedUpload.byteLength,
        sourceFingerprint: storedUpload.sourceFingerprint
      },
      crop,
      print: args.print,
      generatorVersion: PREVIEW_GENERATOR_VERSION,
      idempotencyKey,
      status: "uploaded" as const,
      job: {
        attempt: 1,
        scheduledAt: now
      },
      createdAt: now,
      updatedAt: now
    });

    await ctx.db.patch(invite._id, {
      generatedCount: generationNumber,
      updatedAt: now
    });
    await ctx.scheduler.runAfter(0, internal.bundleGeneration.generateBundleAssets, { bundleId });

    return {
      bundleId,
      publicSlug,
      publicUrl: publicUrl(publicSlug),
      status: "uploaded"
    };
  }
});
