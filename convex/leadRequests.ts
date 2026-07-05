import { internalMutationGeneric as internalMutation, internalQueryGeneric as internalQuery, mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { internal as generatedInternal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";

import {
  AI_CONCEPT_DRAFT_STATUSES,
  LEAD_CONTACT_METHODS,
  LEAD_AI_RATE_LIMIT_PER_DAY,
  LEAD_REQUEST_STATUSES,
  isValidLeadEmail,
  isLeadRequestStatus,
  makeLeadRateLimitBucket,
  normalizeLeadRequestInput,
  type AiConceptDraftStatus,
  type NormalizedLeadContact
} from "../lib/lead-request-contract";
import { formatPreviewBundlePrintDimensions } from "../lib/preview-bundle-contract";
import { normalizeReservedSessionId } from "../lib/reserved-session-id";
import { requireWallPrintProSeller } from "./sellerAuth";
import { assetMetaValidator, assetStorageIdsValidator, printValidator } from "./validators";

const internal = generatedInternal as any;

// Client-adjustable launch throttle for public AI concept generation.
export const GLOBAL_CONCEPT_GENERATION_DAILY_CAP = 50;

export const CONCEPT_GENERATION_GATE_CODES = [
  "INVALID_EMAIL",
  "CONTACT_RATE_LIMITED",
  "GLOBAL_DAILY_CAP_REACHED",
  "QUEUED"
] as const;

export type ConceptGenerationGateCode = (typeof CONCEPT_GENERATION_GATE_CODES)[number];

type ConceptGenerationGateDecision =
  | {
      ok: true;
      code: "QUEUED";
      dayKey: string;
      message: string;
    }
  | {
      ok: false;
      code: Exclude<ConceptGenerationGateCode, "QUEUED">;
      dayKey: string;
      message: string;
    };

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
  code: v.optional(v.string()),
  publicPreviewUrl: v.optional(v.string()),
  message: v.string()
});

const startedConceptGenerationValidator = v.object({
  ok: v.boolean(),
  code: v.string(),
  leadRequestId: v.optional(v.string()),
  status: v.optional(v.string()),
  aiDraftStatus: v.optional(v.string()),
  message: v.string()
});

const reservedVisitLogValidator = v.object({
  ok: v.literal(true),
  sessionId: v.string()
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
  contactEmail: v.optional(v.string()),
  contactPhone: v.optional(v.string()),
  preferredContactMethod: v.optional(v.string()),
  projectType: v.optional(v.string()),
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

const conceptStatusValidator = v.union(
  v.object({
    ok: v.literal(false),
    code: v.string(),
    message: v.string()
  }),
  v.object({
    ok: v.literal(true),
    leadRequestId: v.string(),
    draftId: v.string(),
    status: v.union(v.literal("queued"), v.literal("generating"), v.literal("ready"), v.literal("composite_only"), v.literal("failed")),
    message: v.string(),
    title: v.string(),
    description: v.string(),
    print: v.optional(printValidator),
    assets: v.optional(
      v.object({
        poster: v.union(v.string(), v.null()),
        glb: v.optional(v.union(v.string(), v.null())),
        usdz: v.optional(v.union(v.string(), v.null()))
      })
    ),
    publicPreviewUrl: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    providerFailureCode: v.optional(v.string())
  })
);

function toPublicUrl(publicSlug: string) {
  return `/preview/${publicSlug}`;
}

type PublicConceptStatus = "queued" | "generating" | "ready" | "composite_only" | "failed";

function mapPublicConceptStatus(status: string): PublicConceptStatus {
  if (status === "queued" || status === "generating" || status === "ready" || status === "composite_only") {
    return status;
  }

  return "failed";
}

function publicConceptStatusMessage(status: PublicConceptStatus, reason?: string) {
  if (status === "queued") {
    return "Request saved. The concept draft is queued.";
  }

  if (status === "generating") {
    return "Creating artwork and preparing the AR wall preview.";
  }

  if (status === "ready") {
    return "Artwork preview is ready for wall placement.";
  }

  if (status === "composite_only") {
    return "Your poster preview is ready, but wall placement needs manual follow-up.";
  }

  return reason || "Artwork generation failed.";
}

async function getDraftAssetUrls(ctx: any, draft: any) {
  const posterStorageId = draft.assetStorageIds?.poster ?? draft.generatedImageStorageId;

  if (!posterStorageId) {
    return undefined;
  }

  if (draft.status === "ready" && draft.assetStorageIds) {
    const [poster, glb, usdz] = await Promise.all([
      ctx.storage.getUrl(draft.assetStorageIds.poster),
      ctx.storage.getUrl(draft.assetStorageIds.glb),
      ctx.storage.getUrl(draft.assetStorageIds.usdz)
    ]);

    return {
      poster,
      glb,
      usdz
    };
  }

  const poster = await ctx.storage.getUrl(posterStorageId);

  return {
    poster
  };
}

function aiConceptsEnabled() {
  const value = process.env.WALL_PRINT_PRO_AI_CONCEPTS_ENABLED;

  return (value === "1" || value === "true") && Boolean(process.env.OPENAI_API_KEY);
}

export function getChicagoGenerationDayKey(now: number) {
  const utcYear = new Date(now).getUTCFullYear();
  const dstStart = getChicagoDstStartUtcMs(utcYear);
  const dstEnd = getChicagoDstEndUtcMs(utcYear);
  const utcOffsetHours = now >= dstStart && now < dstEnd ? -5 : -6;
  const chicagoDate = new Date(now + utcOffsetHours * 60 * 60 * 1_000);
  const year = chicagoDate.getUTCFullYear();
  const month = String(chicagoDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(chicagoDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getChicagoDstStartUtcMs(year: number) {
  const secondSunday = getNthSundayOfMonth(year, 2, 2);

  return Date.UTC(year, 2, secondSunday, 8, 0, 0, 0);
}

function getChicagoDstEndUtcMs(year: number) {
  const firstSunday = getNthSundayOfMonth(year, 10, 1);

  return Date.UTC(year, 10, firstSunday, 7, 0, 0, 0);
}

function getNthSundayOfMonth(year: number, monthIndex: number, nth: number) {
  const firstDayOfMonth = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const firstSunday = 1 + ((7 - firstDayOfMonth) % 7);

  return firstSunday + (nth - 1) * 7;
}

export function selectConceptGenerationGate(input: {
  contactEmail?: string;
  contactRequestCount: number;
  globalRequestCount: number;
  now?: number;
  globalDailyCap?: number;
}): ConceptGenerationGateDecision {
  const now = input.now ?? Date.now();
  const dayKey = getChicagoGenerationDayKey(now);
  const email = input.contactEmail?.trim() ?? "";

  if (!email || !isValidLeadEmail(email)) {
    return {
      ok: false,
      code: "INVALID_EMAIL",
      dayKey,
      message: "Enter a valid email address to generate a concept draft."
    };
  }

  if (input.contactRequestCount >= LEAD_AI_RATE_LIMIT_PER_DAY) {
    return {
      ok: false,
      code: "CONTACT_RATE_LIMITED",
      dayKey,
      message: "You have reached today's AI concept draft limit. Try again tomorrow."
    };
  }

  if (input.globalRequestCount >= (input.globalDailyCap ?? GLOBAL_CONCEPT_GENERATION_DAILY_CAP)) {
    return {
      ok: false,
      code: "GLOBAL_DAILY_CAP_REACHED",
      dayKey,
      message: "AI concept drafting is at capacity today. Try again tomorrow."
    };
  }

  return {
    ok: true,
    code: "QUEUED",
    dayKey,
    message: "Request saved. The concept draft is being prepared for seller review."
  };
}

async function getAiRateLimitCount(ctx: any, contactKey: string, now: number) {
  const bucket = makeLeadRateLimitBucket(now);
  const existing = await ctx.db
    .query("leadRateLimits")
    .withIndex("by_contact_bucket", (q: any) => q.eq("contactKey", contactKey).eq("bucket", bucket))
    .first();

  return existing?.count ?? 0;
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

async function getGlobalGenerationCapCounter(ctx: any, dayKey: string) {
  return await ctx.db
    .query("globalGenerationCap")
    .withIndex("by_day_key", (q: any) => q.eq("dayKey", dayKey))
    .first();
}

async function reserveGlobalGenerationCap(ctx: any, dayKey: string, now: number) {
  const existing = await getGlobalGenerationCapCounter(ctx, dayKey);

  if (existing && existing.count >= GLOBAL_CONCEPT_GENERATION_DAILY_CAP) {
    return false;
  }

  if (existing) {
    await ctx.db.patch(existing._id, {
      count: existing.count + 1,
      updatedAt: now
    });
    return true;
  }

  await ctx.db.insert("globalGenerationCap", {
    dayKey,
    count: 1,
    createdAt: now,
    updatedAt: now
  });
  return true;
}

type FunnelEventInput = {
  leadRequestId?: Id<"leadRequests">;
  sessionId?: string;
  kind: string;
  code: string;
  createdAt: number;
};

async function insertFunnelEvent(ctx: any, input: FunnelEventInput) {
  await ctx.db.insert("funnelEvents", input);
}

async function reserveConceptGenerationGate(ctx: any, normalized: NormalizedLeadContact, now: number) {
  const contactKey = normalized.normalizedContactEmail;
  const contactRequestCount = await getAiRateLimitCount(ctx, contactKey, now);
  const dayKey = getChicagoGenerationDayKey(now);
  const globalCounter = await getGlobalGenerationCapCounter(ctx, dayKey);
  const decision = selectConceptGenerationGate({
    contactEmail: normalized.contactEmail,
    contactRequestCount,
    globalRequestCount: globalCounter?.count ?? 0,
    now
  });

  if (!decision.ok) {
    return decision;
  }

  const contactReserved = await reserveAiRateLimit(ctx, contactKey, now);

  if (!contactReserved) {
    return {
      ok: false,
      code: "CONTACT_RATE_LIMITED" as const,
      dayKey,
      message: "You have reached today's AI concept draft limit. Try again tomorrow."
    };
  }

  const globalReserved = await reserveGlobalGenerationCap(ctx, dayKey, now);

  if (!globalReserved) {
    return {
      ok: false,
      code: "GLOBAL_DAILY_CAP_REACHED" as const,
      dayKey,
      message: "AI concept drafting is at capacity today. Try again tomorrow."
    };
  }

  return decision;
}

async function recordRateLimitedDraft(
  ctx: any,
  input: {
    leadRequestId: Id<"leadRequests">;
    prompt: string;
    code: "CONTACT_RATE_LIMITED" | "GLOBAL_DAILY_CAP_REACHED";
    message: string;
    now: number;
  }
) {
  const aiConceptDraftId = await ctx.db.insert("aiConceptDrafts", {
    leadRequestId: input.leadRequestId,
    prompt: input.prompt,
    status: "rate_limited",
    provider: "openai",
    failureReason:
      input.code === "CONTACT_RATE_LIMITED"
        ? "AI concept draft limit reached for this contact today."
        : "AI concept draft daily capacity reached.",
    requestedAt: input.now,
    completedAt: input.now,
    updatedAt: input.now
  });
  await ctx.db.patch(input.leadRequestId, { aiConceptDraftId, updatedAt: input.now });
  await insertFunnelEvent(ctx, {
    leadRequestId: input.leadRequestId,
    kind: input.code === "CONTACT_RATE_LIMITED" ? "concept_generation_contact_rate_limited" : "concept_generation_global_cap_hit",
    code: input.code,
    createdAt: input.now
  });

  return {
    ok: false,
    code: input.code,
    aiDraftStatus: "rate_limited" as const,
    message: input.message
  };
}

async function queueConceptDraftForLead(
  ctx: any,
  input: {
    leadRequestId: Id<"leadRequests">;
    normalized: NormalizedLeadContact;
    print?: unknown;
    now: number;
  }
) {
  if (!input.normalized.conceptPrompt) {
    return null;
  }

  const gate = await reserveConceptGenerationGate(ctx, input.normalized, input.now);

  if (!gate.ok && gate.code === "INVALID_EMAIL") {
    await insertFunnelEvent(ctx, {
      leadRequestId: input.leadRequestId,
      kind: "concept_generation_invalid_email",
      code: gate.code,
      createdAt: input.now
    });
    return {
      ok: false,
      code: gate.code,
      message: gate.message
    };
  }

  if (!gate.ok && gate.code !== "INVALID_EMAIL") {
    return await recordRateLimitedDraft(ctx, {
      leadRequestId: input.leadRequestId,
      prompt: input.normalized.conceptPrompt,
      code: gate.code,
      message: gate.message,
      now: input.now
    });
  }

  const aiConceptDraftId = await ctx.db.insert("aiConceptDrafts", {
    leadRequestId: input.leadRequestId,
    prompt: input.normalized.conceptPrompt,
    status: "queued",
    provider: "openai",
    requestedAt: input.now,
    updatedAt: input.now
  });
  await ctx.db.patch(input.leadRequestId, { aiConceptDraftId, updatedAt: input.now });
  await insertFunnelEvent(ctx, {
    leadRequestId: input.leadRequestId,
    kind: "concept_generation_queued",
    code: gate.code,
    createdAt: input.now
  });
  await ctx.scheduler.runAfter(0, internal.aiConcepts.generateConceptDraft, { draftId: aiConceptDraftId });

  return {
    ok: true,
    code: gate.code,
    aiDraftStatus: "queued" as const,
    message: gate.message
  };
}

async function serializeSellerLead(ctx: any, lead: any) {
  const draft = lead.aiConceptDraftId ? await ctx.db.get(lead.aiConceptDraftId) : null;

  return {
    id: lead._id,
    contactName: lead.contactName,
    contactEmail: lead.contactEmail,
    contactPhone: lead.contactPhone,
    preferredContactMethod: lead.preferredContactMethod,
    projectType: lead.projectType,
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

export async function startConceptGenerationHandler(ctx: any, args: {
  contactName?: string;
  contactEmail: string;
  contactPhone?: string;
  preferredContactMethod?: string;
  projectType?: string;
  businessName?: string;
  wallDescription?: string;
  conceptPrompt: string;
  print?: unknown;
}) {
  const now = Date.now();
  let normalized;

  if (!args.contactEmail || !isValidLeadEmail(args.contactEmail)) {
    return {
      ok: false,
      code: "INVALID_EMAIL",
      message: "Enter a valid email address to generate a concept draft."
    };
  }

  try {
    normalized = normalizeLeadRequestInput({
      ...args,
      contactName: args.contactName || args.contactEmail,
      preferredContactMethod: "email",
      intent: "concept",
      reserveInterest: false
    });
  } catch (error) {
    return {
      ok: false,
      code: error instanceof Error && /email/i.test(error.message) ? "INVALID_EMAIL" : "INVALID_GENERATION_REQUEST",
      message: error instanceof Error ? error.message : "This concept request could not be saved."
    };
  }

  if (!normalized.normalizedContactEmail || !isValidLeadEmail(normalized.normalizedContactEmail)) {
    return {
      ok: false,
      code: "INVALID_EMAIL",
      message: "Enter a valid email address to generate a concept draft."
    };
  }

  if (!aiConceptsEnabled()) {
    return {
      ok: false,
      code: "GENERATION_UNAVAILABLE",
      message: "AI concept drafting is temporarily unavailable."
    };
  }

  const leadRequestId = await ctx.db.insert("leadRequests", {
    ...normalized,
    ...(args.print ? { print: args.print } : {}),
    status: "new",
    createdAt: now,
    updatedAt: now
  });
  const queued = await queueConceptDraftForLead(ctx, {
    leadRequestId,
    normalized,
    print: args.print,
    now
  });

  if (!queued) {
    return {
      ok: false,
      code: "INVALID_GENERATION_REQUEST",
      leadRequestId,
      status: "new",
      message: "Describe the wall print idea first."
    };
  }

  return {
    ok: queued.ok,
    code: queued.code,
    leadRequestId,
    status: "new",
    ...(queued.aiDraftStatus ? { aiDraftStatus: queued.aiDraftStatus } : {}),
    message: queued.message
  };
}

export const startConceptGeneration = mutation({
  args: {
    contactName: v.optional(v.string()),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    preferredContactMethod: v.optional(v.union(...LEAD_CONTACT_METHODS.map((method) => v.literal(method)))),
    projectType: v.optional(v.string()),
    businessName: v.optional(v.string()),
    wallDescription: v.optional(v.string()),
    conceptPrompt: v.string(),
    print: v.optional(printValidator)
  },
  returns: startedConceptGenerationValidator,
  handler: async (ctx, args) => {
    return await startConceptGenerationHandler(ctx, args);
  }
});

export async function logReservedVisitHandler(ctx: any, args: { sessionId: string }) {
  const sessionId = normalizeReservedSessionId(args.sessionId);

  if (!sessionId) {
    throw new ConvexError({
      code: "INVALID_RESERVED_SESSION_ID",
      message: "Reserved session id is invalid."
    });
  }

  const now = Date.now();
  await insertFunnelEvent(ctx, {
    sessionId,
    kind: "reserved_visit",
    code: "RESERVED_VISIT",
    createdAt: now
  });

  return {
    ok: true as const,
    sessionId
  };
}

export const logReservedVisit = mutation({
  args: {
    sessionId: v.string()
  },
  returns: reservedVisitLogValidator,
  handler: async (ctx, args) => {
    return await logReservedVisitHandler(ctx, args);
  }
});

export const submitLeadRequest = mutation({
  args: {
    contactName: v.string(),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    preferredContactMethod: v.optional(v.union(...LEAD_CONTACT_METHODS.map((method) => v.literal(method)))),
    projectType: v.optional(v.string()),
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
    let code: string | undefined;
    let message = "Request saved for seller review.";

    if (normalized.conceptPrompt) {
      if (!normalized.normalizedContactEmail || !isValidLeadEmail(normalized.normalizedContactEmail)) {
        const outcome = await queueConceptDraftForLead(ctx, {
          leadRequestId,
          normalized,
          print: args.print,
          now
        });
        code = outcome?.code;
        message = outcome?.message ?? "Request saved. Add an email address to generate a concept draft.";
      } else if (!aiConceptsEnabled()) {
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
        await insertFunnelEvent(ctx, {
          leadRequestId,
          kind: "concept_generation_disabled",
          code: "DISABLED",
          createdAt: now
        });
        code = "DISABLED";
        message = "Request saved for seller review.";
      } else {
        const outcome = await queueConceptDraftForLead(ctx, {
          leadRequestId,
          normalized,
          print: args.print,
          now
        });
        draftStatus = outcome?.aiDraftStatus;
        code = outcome?.code;
        message = outcome?.message ?? message;
      }
    }

    return {
      leadRequestId,
      status: "new",
      ...(draftStatus ? { aiDraftStatus: draftStatus } : {}),
      ...(code ? { code } : {}),
      message
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

export const getConceptGenerationStatus = query({
  args: {
    leadRequestId: v.id("leadRequests")
  },
  returns: conceptStatusValidator,
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadRequestId);

    if (!lead || !lead.aiConceptDraftId) {
      return {
        ok: false as const,
        code: "NOT_FOUND",
        message: "This concept request was not found."
      };
    }

    const draft = await ctx.db.get(lead.aiConceptDraftId);

    if (!draft) {
      return {
        ok: false as const,
        code: "NOT_FOUND",
        message: "This concept request was not found."
      };
    }

    const status = mapPublicConceptStatus(draft.status);
    const reason = draft.failureReason ?? draft.refusalReason;
    const assets = await getDraftAssetUrls(ctx, draft);

    return {
      ok: true as const,
      leadRequestId: lead._id,
      draftId: draft._id,
      status,
      message: publicConceptStatusMessage(status, reason),
      title: `${lead.contactName} concept draft`,
      description: "Concept draft generated from a client request. Seller review required before artwork is final.",
      ...(lead.print ? { print: lead.print } : {}),
      ...(assets ? { assets } : {}),
      ...(draft.publicPreviewSlug ? { publicPreviewUrl: toPublicUrl(draft.publicPreviewSlug) } : {}),
      ...(reason ? { failureReason: reason } : {}),
      ...(draft.providerFailureCode ? { providerFailureCode: draft.providerFailureCode } : {})
    };
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
    providerFailureCode: v.optional(v.string()),
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
      providerFailureCode: args.providerFailureCode,
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

export const recordAiDraftGeneratedImage = internalMutation({
  args: {
    draftId: v.id("aiConceptDrafts"),
    generatedImageStorageId: v.id("_storage"),
    generatedImageMeta: v.object({
      fileName: v.string(),
      contentType: v.string(),
      byteLength: v.number()
    }),
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
      generatedImageStorageId: args.generatedImageStorageId,
      generatedImageMeta: args.generatedImageMeta,
      providerMetadata: args.providerMetadata,
      model: args.model,
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
    assetStorageIds: assetStorageIdsValidator,
    assetMeta: assetMetaValidator,
    previewBundleId: v.optional(v.id("previewBundles")),
    publicPreviewSlug: v.optional(v.string()),
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
      assetStorageIds: args.assetStorageIds,
      assetMeta: args.assetMeta,
      previewBundleId: args.previewBundleId,
      publicPreviewSlug: args.publicPreviewSlug,
      failureReason: undefined,
      refusalReason: undefined,
      providerMetadata: args.providerMetadata,
      model: args.model,
      completedAt: now,
      updatedAt: now
    });
    await ctx.db.patch(draft.leadRequestId, {
      ...(args.previewBundleId ? { previewBundleId: args.previewBundleId } : {}),
      ...(args.publicPreviewSlug ? { publicPreviewSlug: args.publicPreviewSlug } : {}),
      updatedAt: now
    });

    return null;
  }
});

export const finalizeAiDraftCompositeOnly = internalMutation({
  args: {
    draftId: v.id("aiConceptDrafts"),
    generatedImageStorageId: v.id("_storage"),
    generatedImageMeta: v.object({
      fileName: v.string(),
      contentType: v.string(),
      byteLength: v.number()
    }),
    reason: v.string(),
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
      status: "composite_only",
      generatedImageStorageId: args.generatedImageStorageId,
      generatedImageMeta: args.generatedImageMeta,
      assetStorageIds: undefined,
      assetMeta: undefined,
      failureReason: args.reason,
      refusalReason: undefined,
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
