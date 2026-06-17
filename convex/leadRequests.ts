import { internalMutationGeneric as internalMutation, internalQueryGeneric as internalQuery, mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { internal as generatedInternal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";

import {
  AI_CONCEPT_DRAFT_STATUSES,
  LEAD_AI_RATE_LIMIT_PER_DAY,
  LEAD_REQUEST_STATUSES,
  isLeadRequestStatus,
  makeLeadRateLimitBucket,
  normalizeLeadRequestInput,
  type AiConceptDraftStatus
} from "../lib/lead-request-contract";
import { formatPreviewBundlePrintDimensions } from "../lib/preview-bundle-contract";
import { requireWallPrintProSeller } from "./sellerAuth";
import { printValidator } from "./validators";

const internal = generatedInternal as any;

const leadUploadValidator = v.object({
  storageId: v.id("_storage"),
  originalFileName: v.string(),
  contentType: v.string(),
  byteLength: v.number(),
  sourceFingerprint: v.optional(v.string())
});

const submittedLeadValidator = v.object({
  leadRequestId: v.string(),
  status: v.string(),
  aiDraftStatus: v.optional(v.string()),
  publicPreviewUrl: v.optional(v.string()),
  message: v.string()
});

const aiDraftGenerationValidator = v.union(
  v.null(),
  v.object({
    draftId: v.id("aiConceptDrafts"),
    leadRequestId: v.id("leadRequests"),
    prompt: v.string(),
    businessName: v.optional(v.string()),
    wallDescription: v.optional(v.string()),
    contactName: v.string(),
    print: v.optional(printValidator)
  })
);

const sellerLeadValidator = v.object({
  id: v.string(),
  contactName: v.string(),
  contactEmail: v.string(),
  contactPhone: v.optional(v.string()),
  businessName: v.optional(v.string()),
  wallDescription: v.optional(v.string()),
  conceptPrompt: v.optional(v.string()),
  intent: v.string(),
  reserveInterest: v.boolean(),
  status: v.string(),
  aiDraftStatus: v.optional(v.string()),
  aiFailureReason: v.optional(v.string()),
  printLabel: v.optional(v.string()),
  publicPreviewUrl: v.optional(v.string()),
  createdAt: v.number(),
  updatedAt: v.number()
});

function toPublicUrl(publicSlug: string) {
  return `/preview/${publicSlug}`;
}

function aiConceptsEnabled() {
  const value = process.env.WALL_PRINT_PRO_AI_CONCEPTS_ENABLED;

  return (value === "1" || value === "true") && Boolean(process.env.OPENAI_API_KEY);
}

async function reserveAiRateLimit(ctx: any, contactKey: string, now: number) {
  const bucket = makeLeadRateLimitBucket(now);
  const existing = await ctx.db
    .query("leadRateLimits")
    .withIndex("by_contact_bucket", (q: any) => q.eq("contactKey", contactKey).eq("bucket", bucket))
    .first();

  if (existing && existing.count >= LEAD_AI_RATE_LIMIT_PER_DAY) {
    return false;
  }

  if (existing) {
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
      updatedAt: now
    });
    return true;
  }

  await ctx.db.insert("leadRateLimits", {
    contactKey,
    bucket,
    count: 1,
    firstRequestAt: now,
    updatedAt: now
  });
  return true;
}

async function serializeSellerLead(ctx: any, lead: any) {
  const draft = lead.aiConceptDraftId ? await ctx.db.get(lead.aiConceptDraftId) : null;

  return {
    id: lead._id,
    contactName: lead.contactName,
    contactEmail: lead.contactEmail,
    contactPhone: lead.contactPhone,
    businessName: lead.businessName,
    wallDescription: lead.wallDescription,
    conceptPrompt: lead.conceptPrompt,
    intent: lead.intent,
    reserveInterest: lead.reserveInterest,
    status: lead.status,
    aiDraftStatus: draft?.status,
    aiFailureReason: draft?.failureReason ?? draft?.refusalReason,
    printLabel: lead.print ? formatPreviewBundlePrintDimensions(lead.print) : undefined,
    publicPreviewUrl: lead.publicPreviewSlug ? toPublicUrl(lead.publicPreviewSlug) : undefined,
    createdAt: lead.createdAt,
    updatedAt: lead.updatedAt
  };
}

export const generateLeadUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  }
});

export const submitLeadRequest = mutation({
  args: {
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    businessName: v.optional(v.string()),
    wallDescription: v.optional(v.string()),
    conceptPrompt: v.optional(v.string()),
    intent: v.optional(v.union(v.literal("contact"), v.literal("concept"), v.literal("reserve"))),
    reserveInterest: v.optional(v.boolean()),
    upload: v.optional(leadUploadValidator),
    print: v.optional(printValidator)
  },
  returns: submittedLeadValidator,
  handler: async (ctx, args) => {
    const now = Date.now();
    let normalized;

    try {
      normalized = normalizeLeadRequestInput(args);
    } catch (error) {
      throw new ConvexError({
        code: "INVALID_LEAD_REQUEST",
        message: error instanceof Error ? error.message : "This request could not be saved."
      });
    }

    const leadRequestId = await ctx.db.insert("leadRequests", {
      ...normalized,
      ...(args.upload ? { upload: args.upload } : {}),
      ...(args.print ? { print: args.print } : {}),
      status: "new",
      createdAt: now,
      updatedAt: now
    });
    let draftStatus: AiConceptDraftStatus | undefined;

    if (normalized.conceptPrompt) {
      if (!aiConceptsEnabled()) {
        const aiConceptDraftId = await ctx.db.insert("aiConceptDrafts", {
          leadRequestId,
          prompt: normalized.conceptPrompt,
          status: "disabled",
          provider: "openai",
          failureReason: "AI concept drafting is not configured.",
          requestedAt: now,
          completedAt: now,
          updatedAt: now
        });
        await ctx.db.patch(leadRequestId, { aiConceptDraftId, updatedAt: now });
        draftStatus = "disabled";
      } else if (!(await reserveAiRateLimit(ctx, normalized.normalizedContactEmail, now))) {
        const aiConceptDraftId = await ctx.db.insert("aiConceptDrafts", {
          leadRequestId,
          prompt: normalized.conceptPrompt,
          status: "rate_limited",
          provider: "openai",
          failureReason: "AI concept draft limit reached for this contact today.",
          requestedAt: now,
          completedAt: now,
          updatedAt: now
        });
        await ctx.db.patch(leadRequestId, { aiConceptDraftId, updatedAt: now });
        draftStatus = "rate_limited";
      } else {
        const aiConceptDraftId = await ctx.db.insert("aiConceptDrafts", {
          leadRequestId,
          prompt: normalized.conceptPrompt,
          status: "queued",
          provider: "openai",
          requestedAt: now,
          updatedAt: now
        });
        await ctx.db.patch(leadRequestId, { aiConceptDraftId, updatedAt: now });
        await ctx.scheduler.runAfter(0, internal.aiConcepts.generateConceptDraft, { draftId: aiConceptDraftId });
        draftStatus = "queued";
      }
    }

    return {
      leadRequestId,
      status: "new",
      ...(draftStatus ? { aiDraftStatus: draftStatus } : {}),
      message: draftStatus === "queued" ? "Request saved. The concept draft is being prepared for seller review." : "Request saved for seller review."
    };
  }
});

export const listForSeller = query({
  args: {},
  returns: v.array(sellerLeadValidator),
  handler: async (ctx) => {
    await requireWallPrintProSeller(ctx);
    const leads = await ctx.db.query("leadRequests").withIndex("by_createdAt").order("desc").take(100);
    const serialized = [];

    for (const lead of leads) {
      serialized.push(await serializeSellerLead(ctx, lead));
    }

    return serialized;
  }
});

export const updateStatus = mutation({
  args: {
    leadRequestId: v.id("leadRequests"),
    status: v.union(...LEAD_REQUEST_STATUSES.map((status) => v.literal(status)))
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireWallPrintProSeller(ctx);

    if (!isLeadRequestStatus(args.status)) {
      throw new ConvexError({
        code: "INVALID_LEAD_STATUS",
        message: "Lead status is not supported."
      });
    }

    await ctx.db.patch(args.leadRequestId, {
      status: args.status,
      updatedAt: Date.now()
    });

    return null;
  }
});

export const getAiDraftForGeneration = internalQuery({
  args: {
    draftId: v.id("aiConceptDrafts")
  },
  returns: aiDraftGenerationValidator,
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);

    if (!draft || draft.status !== "queued") {
      return null;
    }

    const lead = await ctx.db.get(draft.leadRequestId);

    if (!lead) {
      return null;
    }

    return {
      draftId: draft._id,
      leadRequestId: lead._id,
      prompt: draft.prompt,
      businessName: lead.businessName,
      wallDescription: lead.wallDescription,
      contactName: lead.contactName,
      print: lead.print
    };
  }
});

export const markAiDraftGenerating = internalMutation({
  args: {
    draftId: v.id("aiConceptDrafts")
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);

    if (!draft || draft.status !== "queued") {
      return false;
    }

    const now = Date.now();
    await ctx.db.patch(args.draftId, {
      status: "generating",
      startedAt: now,
      updatedAt: now
    });
    return true;
  }
});

export const finalizeAiDraftFailure = internalMutation({
  args: {
    draftId: v.id("aiConceptDrafts"),
    status: v.union(v.literal("failed"), v.literal("rejected")),
    reason: v.string(),
    providerMetadata: v.optional(v.string()),
    model: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);

    if (!draft || !AI_CONCEPT_DRAFT_STATUSES.includes(draft.status)) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.draftId, {
      status: args.status,
      failureReason: args.status === "failed" ? args.reason : undefined,
      refusalReason: args.status === "rejected" ? args.reason : undefined,
      providerMetadata: args.providerMetadata,
      model: args.model,
      completedAt: now,
      updatedAt: now
    });
    await ctx.db.patch(draft.leadRequestId, {
      updatedAt: now
    });

    return null;
  }
});

export const finalizeAiDraftReady = internalMutation({
  args: {
    draftId: v.id("aiConceptDrafts"),
    generatedImageStorageId: v.id("_storage"),
    generatedImageMeta: v.object({
      fileName: v.string(),
      contentType: v.string(),
      byteLength: v.number()
    }),
    previewBundleId: v.id("previewBundles"),
    publicPreviewSlug: v.string(),
    providerMetadata: v.optional(v.string()),
    model: v.optional(v.string())
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);

    if (!draft) {
      return null;
    }

    const now = Date.now();
    await ctx.db.patch(args.draftId, {
      status: "ready",
      generatedImageStorageId: args.generatedImageStorageId,
      generatedImageMeta: args.generatedImageMeta,
      previewBundleId: args.previewBundleId,
      publicPreviewSlug: args.publicPreviewSlug,
      providerMetadata: args.providerMetadata,
      model: args.model,
      completedAt: now,
      updatedAt: now
    });
    await ctx.db.patch(draft.leadRequestId, {
      previewBundleId: args.previewBundleId,
      publicPreviewSlug: args.publicPreviewSlug,
      updatedAt: now
    });

    return null;
  }
});
