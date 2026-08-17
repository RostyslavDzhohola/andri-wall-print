import { internalMutationGeneric as internalMutation, internalQueryGeneric as internalQuery, mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { internal as generatedInternal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { ConvexError, v } from "convex/values";

import {
  LEAD_CONTACT_METHODS,
  LEAD_AI_RATE_LIMIT_PER_DAY,
  canFinalizeAiDraft,
  foldLeadContactEmail,
  getChicagoGenerationDayKey,
  isValidLeadEmail,
  makeLeadRateLimitKey,
  makeLeadRateLimitBucket,
  normalizeLeadRequestInput,
  type AiConceptDraftStatus,
  type NormalizedLeadContact
} from "../lib/lead-request-contract";
import { makeConceptDraftTitle } from "../lib/lead-request-presentation";
import {
  COMMUNITY_GALLERY_CONSENT_REQUIRED_MESSAGE,
  COMMUNITY_GALLERY_CONSENT_VERSION,
  isEnabledEnvironmentValue
} from "../lib/community-gallery";
import { normalizeReservedSessionId } from "../lib/reserved-session-id";
import {
  FUNNEL_VISIT_DAILY_CAP,
  LEADS_DAILY_CAP,
  LEAD_INSERTS_PER_CONTACT_PER_DAY,
  UPLOAD_URL_DAILY_CAP,
  getContactBucketCount,
  getDailyCapCount,
  reserveContactBucket,
  reserveDailyCap
} from "./dailyCaps";
import { validateStoredPreviewUpload } from "./uploadValidation";
import { assertValidPrint, assetMetaValidator, assetStorageIdsValidator, printValidator } from "./validators";

const internal = generatedInternal;

// Client-adjustable launch throttle for public AI concept generation.
export const GLOBAL_CONCEPT_GENERATION_DAILY_CAP = 50;
export const AI_DRAFT_QUEUED_STALE_MS = 120_000;
export const AI_DRAFT_GENERATING_STALE_MS = 600_000;
export const LEAD_LIMIT_MESSAGE = "We've received several requests from you today. Call us to talk it through.";
const UPLOAD_CAP_MESSAGE = "Wall previews are at capacity today. Please call us or try again tomorrow.";
const AI_DRAFT_STALLED_REASON = "Concept generation stalled. Please try again.";

export { getChicagoGenerationDayKey };

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
    print: v.optional(printValidator)
  })
);

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

type AiDraftRecoveryRecord = {
  status: string;
  requestedAt: number;
  startedAt?: number;
  updatedAt: number;
  recoveryAttempts?: number;
};

export type StaleAiDraftRecoveryDecision =
  | { action: "ignore" }
  | { action: "requeue"; recoveryAttempts: number }
  | { action: "fail"; reason: string };

export function selectStaleAiDraftRecovery(
  draft: AiDraftRecoveryRecord,
  now = Date.now()
): StaleAiDraftRecoveryDecision {
  if (draft.status === "queued") {
    const queuedSince = Math.max(draft.requestedAt, draft.updatedAt ?? 0);

    if (now - queuedSince < AI_DRAFT_QUEUED_STALE_MS) {
      return { action: "ignore" };
    }

    if ((draft.recoveryAttempts ?? 0) >= 1) {
      return {
        action: "fail",
        reason: AI_DRAFT_STALLED_REASON
      };
    }

    return {
      action: "requeue",
      recoveryAttempts: (draft.recoveryAttempts ?? 0) + 1
    };
  }

  if (draft.status === "generating") {
    const generatingSince = draft.startedAt ?? draft.updatedAt;

    if (now - generatingSince < AI_DRAFT_GENERATING_STALE_MS) {
      return { action: "ignore" };
    }

    return {
      action: "fail",
      reason: AI_DRAFT_STALLED_REASON
    };
  }

  return { action: "ignore" };
}

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

function communityGalleryEnabled() {
  return isEnabledEnvironmentValue(process.env.WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED);
}

function makeGalleryConsentEvidence(input: {
  consent: boolean | undefined;
  now: number;
  willGenerateAiConcept: boolean;
}) {
  if (!input.willGenerateAiConcept || !communityGalleryEnabled() || input.consent !== true) {
    return undefined;
  }

  return {
    galleryPublicationConsent: true as const,
    galleryConsentVersion: COMMUNITY_GALLERY_CONSENT_VERSION,
    galleryConsentRecordedAt: input.now
  };
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
    message: "Request saved. We'll review it and text you to schedule your estimate."
  };
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

export async function reserveConceptGenerationGate(ctx: any, normalized: NormalizedLeadContact, now: number) {
  const contactKey = makeLeadRateLimitKey(normalized.normalizedContactEmail);
  const bucket = makeLeadRateLimitBucket(now);
  const contactRequestCount = await getContactBucketCount(ctx, contactKey, bucket);
  const dayKey = getChicagoGenerationDayKey(now);
  const globalRequestCount = await getDailyCapCount(ctx, dayKey);
  const decision = selectConceptGenerationGate({
    contactEmail: normalized.contactEmail,
    contactRequestCount,
    globalRequestCount,
    now
  });

  if (!decision.ok) {
    return decision;
  }

  await reserveContactBucket(ctx, contactKey, bucket, LEAD_AI_RATE_LIMIT_PER_DAY, now);
  await reserveDailyCap(ctx, dayKey, GLOBAL_CONCEPT_GENERATION_DAILY_CAP, now);

  return decision;
}

export async function reserveLeadInsertGate(
  ctx: any,
  contact: { email?: string; phone?: string },
  now: number
) {
  const dayKey = getChicagoGenerationDayKey(now);
  const contactKey = contact.email
    ? `lead:${foldLeadContactEmail(contact.email)}`
    : contact.phone
      ? `lead:phone:${contact.phone}`
      : null;
  const contactCount = contactKey ? await getContactBucketCount(ctx, contactKey, dayKey) : 0;
  const globalDayKey = `leads:${dayKey}`;
  const globalCount = await getDailyCapCount(ctx, globalDayKey);

  if (
    (contactKey !== null && contactCount >= LEAD_INSERTS_PER_CONTACT_PER_DAY) ||
    globalCount >= LEADS_DAILY_CAP
  ) {
    return false;
  }

  if (contactKey) {
    await reserveContactBucket(ctx, contactKey, dayKey, LEAD_INSERTS_PER_CONTACT_PER_DAY, now);
  }
  await reserveDailyCap(ctx, globalDayKey, LEADS_DAILY_CAP, now);
  return true;
}

async function recordRateLimitedDraft(
  ctx: any,
  input: {
    leadRequestId: Id<"leadRequests">;
    prompt: string;
    code: "CONTACT_RATE_LIMITED" | "GLOBAL_DAILY_CAP_REACHED";
    message: string;
    now: number;
    galleryConsentEvidence?: ReturnType<typeof makeGalleryConsentEvidence>;
  }
) {
  const aiConceptDraftId = await ctx.db.insert("aiConceptDrafts", {
    leadRequestId: input.leadRequestId,
    prompt: input.prompt,
    status: "rate_limited",
    provider: "openai",
    ...input.galleryConsentEvidence,
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
    galleryConsentEvidence?: ReturnType<typeof makeGalleryConsentEvidence>;
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
      now: input.now,
      galleryConsentEvidence: input.galleryConsentEvidence
    });
  }

  const aiConceptDraftId = await ctx.db.insert("aiConceptDrafts", {
    leadRequestId: input.leadRequestId,
    prompt: input.normalized.conceptPrompt,
    status: "queued",
    provider: "openai",
    ...input.galleryConsentEvidence,
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

export async function generateLeadUploadUrlHandler(ctx: any) {
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

export const generateLeadUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await generateLeadUploadUrlHandler(ctx);
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
  galleryPublicationConsent?: boolean;
  print?: unknown;
}) {
  const now = Date.now();
  let normalized: ReturnType<typeof normalizeLeadRequestInput>;

  if (communityGalleryEnabled() && args.galleryPublicationConsent !== true) {
    return {
      ok: false,
      code: "CONSENT_REQUIRED",
      message: COMMUNITY_GALLERY_CONSENT_REQUIRED_MESSAGE
    };
  }

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
      contactName: args.contactName || "Concept lead",
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

  const galleryConsentEvidence = makeGalleryConsentEvidence({
    consent: args.galleryPublicationConsent,
    now,
    willGenerateAiConcept: Boolean(normalized.conceptPrompt)
  });

  if (args.print) {
    assertValidPrint(args.print as Parameters<typeof assertValidPrint>[0]);
  }

  const leadReserved = await reserveLeadInsertGate(
    ctx,
    {
      email: normalized.normalizedContactEmail,
      phone: normalized.normalizedContactPhone
    },
    now
  );

  if (!leadReserved) {
    return {
      ok: false,
      code: "LEAD_LIMIT_REACHED",
      message: LEAD_LIMIT_MESSAGE
    };
  }

  const leadRequestId = await ctx.db.insert("leadRequests", {
    ...normalized,
    ...galleryConsentEvidence,
    ...(args.print ? { print: args.print } : {}),
    status: "new",
    createdAt: now,
    updatedAt: now
  });

  // Capture the lead even when generation is disabled: the email is the point of
  // the funnel. No quota consumption, no draft, no scheduling on this path.
  if (!aiConceptsEnabled()) {
    await insertFunnelEvent(ctx, {
      leadRequestId,
      kind: "concept_generation_disabled",
      code: "GENERATION_UNAVAILABLE",
      createdAt: now
    });

    return {
      ok: false,
      code: "GENERATION_UNAVAILABLE",
      leadRequestId,
      status: "new",
      message: "AI concept drafting is temporarily unavailable."
    };
  }

  const queued = await queueConceptDraftForLead(ctx, {
    leadRequestId,
    normalized,
    print: args.print,
    now,
    galleryConsentEvidence
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
    galleryPublicationConsent: v.optional(v.boolean()),
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
  const dayKey = `funnel:${getChicagoGenerationDayKey(now)}`;
  const reserved = await reserveDailyCap(ctx, dayKey, FUNNEL_VISIT_DAILY_CAP, now);

  if (!reserved) {
    return {
      ok: true as const,
      sessionId
    };
  }

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

type SubmitLeadRequestArgs = {
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  preferredContactMethod?: string;
  projectType?: string;
  businessName?: string;
  wallDescription?: string;
  conceptPrompt?: string;
  galleryPublicationConsent?: boolean;
  intent?: string;
  reserveInterest?: boolean;
  upload?: {
    storageId: string;
    originalFileName: string;
    contentType: string;
    byteLength: number;
    sourceFingerprint?: string;
  };
  print?: unknown;
};

export async function submitLeadRequestHandler(ctx: any, args: SubmitLeadRequestArgs) {
  const now = Date.now();
  let normalized: ReturnType<typeof normalizeLeadRequestInput>;

  try {
    normalized = normalizeLeadRequestInput(args);
  } catch (error) {
    throw new ConvexError({
      code: "INVALID_LEAD_REQUEST",
      message: error instanceof Error ? error.message : "This request could not be saved."
    });
  }

  if (args.upload && normalized.conceptPrompt) {
    const { conceptPrompt, ...nonGenerationRequest } = normalized;
    normalized = {
      ...nonGenerationRequest,
      wallDescription: normalized.wallDescription ?? conceptPrompt
    };
  }

  const willGenerateAiConcept = Boolean(normalized.conceptPrompt);

  if (willGenerateAiConcept && communityGalleryEnabled() && args.galleryPublicationConsent !== true) {
    throw new ConvexError({
      code: "CONSENT_REQUIRED",
      message: COMMUNITY_GALLERY_CONSENT_REQUIRED_MESSAGE
    });
  }

  const galleryConsentEvidence = makeGalleryConsentEvidence({
    consent: args.galleryPublicationConsent,
    now,
    willGenerateAiConcept
  });

  if (args.print) {
    assertValidPrint(args.print as Parameters<typeof assertValidPrint>[0]);
  }

  const verifiedUpload = args.upload
    ? await validateStoredPreviewUpload(ctx, {
        sourceStorageId: args.upload.storageId,
        contentType: args.upload.contentType,
        byteLength: args.upload.byteLength,
        sourceFingerprint: args.upload.sourceFingerprint
      })
    : undefined;
  const leadReserved = await reserveLeadInsertGate(
    ctx,
    {
      email: normalized.normalizedContactEmail,
      phone: normalized.normalizedContactPhone
    },
    now
  );

  if (!leadReserved) {
    throw new ConvexError({
      code: "LEAD_LIMIT_REACHED",
      message: LEAD_LIMIT_MESSAGE
    });
  }

  const leadRequestId = await ctx.db.insert("leadRequests", {
    ...normalized,
    ...galleryConsentEvidence,
    ...(args.upload && verifiedUpload
      ? {
          upload: {
            storageId: args.upload.storageId,
            originalFileName: args.upload.originalFileName,
            contentType: verifiedUpload.contentType,
            byteLength: verifiedUpload.byteLength,
            sourceFingerprint: verifiedUpload.sourceFingerprint
          }
        }
      : {}),
    ...(args.print ? { print: args.print } : {}),
    status: "new",
    createdAt: now,
    updatedAt: now
  });
  let draftStatus: AiConceptDraftStatus | undefined;
  let code: string | undefined;
  let message = "Request saved. We'll review it and text you to schedule your estimate.";

  if (normalized.conceptPrompt) {
    if (!normalized.normalizedContactEmail || !isValidLeadEmail(normalized.normalizedContactEmail)) {
      const outcome = await queueConceptDraftForLead(ctx, {
        leadRequestId,
        normalized,
        print: args.print,
        now,
        galleryConsentEvidence
      });
      code = outcome?.code;
      message = outcome?.message ?? "Request saved. Add an email address to generate a concept draft.";
    } else if (!aiConceptsEnabled()) {
      const aiConceptDraftId = await ctx.db.insert("aiConceptDrafts", {
        leadRequestId,
        prompt: normalized.conceptPrompt,
        status: "disabled",
        provider: "openai",
        ...galleryConsentEvidence,
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
      message = "Request saved. We'll review it and text you to schedule your estimate.";
    } else {
      const outcome = await queueConceptDraftForLead(ctx, {
        leadRequestId,
        normalized,
        print: args.print,
        now,
        galleryConsentEvidence
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
    galleryPublicationConsent: v.optional(v.boolean()),
    intent: v.optional(v.union(v.literal("contact"), v.literal("concept"), v.literal("reserve"))),
    reserveInterest: v.optional(v.boolean()),
    upload: v.optional(leadUploadValidator),
    print: v.optional(printValidator)
  },
  returns: submittedLeadValidator,
  handler: async (ctx, args) => {
    return await submitLeadRequestHandler(ctx, args);
  }
});

export const getConceptGenerationStatus = query({
  args: {
    leadRequestId: v.id("leadRequests")
  },
  returns: conceptStatusValidator,
  handler: async (ctx, args) => {
    const lead = await ctx.db.get(args.leadRequestId);

    if (!lead?.aiConceptDraftId) {
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
      title: makeConceptDraftTitle(),
      description: "Concept draft generated from a client request. Seller review required before artwork is final.",
      ...(lead.print ? { print: lead.print } : {}),
      ...(assets ? { assets } : {}),
      ...(draft.publicPreviewSlug ? { publicPreviewUrl: toPublicUrl(draft.publicPreviewSlug) } : {}),
      ...(reason ? { failureReason: reason } : {}),
      ...(draft.providerFailureCode ? { providerFailureCode: draft.providerFailureCode } : {})
    };
  }
});

export const getAiDraftForGeneration = internalQuery({
  args: {
    draftId: v.id("aiConceptDrafts")
  },
  returns: aiDraftGenerationValidator,
  handler: async (ctx, args) => {
    const draft = await ctx.db.get(args.draftId);

    if (draft?.status !== "queued") {
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

    if (draft?.status !== "queued") {
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

    if (!draft || !canFinalizeAiDraft(draft.status, args.status)) {
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

    if (!draft || !canFinalizeAiDraft(draft.status, "ready")) {
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

    if (!draft || !canFinalizeAiDraft(draft.status, "ready")) {
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

    if (communityGalleryEnabled() && draft.galleryPublicationConsent === true) {
      await ctx.scheduler.runAfter(0, internal.gallery.enqueueReadyAiConcept, {
        draftId: draft._id
      });
    }

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

    if (!draft || !canFinalizeAiDraft(draft.status, "composite_only")) {
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

export const recoverStaleAiConceptDrafts = internalMutation({
  args: {},
  returns: v.object({
    requeued: v.number(),
    failed: v.number(),
    ignored: v.number()
  }),
  handler: async (ctx) => {
    const now = Date.now();
    const [queuedDrafts, generatingDrafts] = await Promise.all([
      ctx.db
        .query("aiConceptDrafts")
        .withIndex("by_status_requestedAt", (q: any) => q.eq("status", "queued"))
        .order("asc")
        .take(100),
      ctx.db
        .query("aiConceptDrafts")
        .withIndex("by_status_requestedAt", (q: any) => q.eq("status", "generating"))
        .order("asc")
        .take(100)
    ]);
    let requeued = 0;
    let failed = 0;
    let ignored = 0;

    for (const draft of [...queuedDrafts, ...generatingDrafts]) {
      const decision = selectStaleAiDraftRecovery(draft, now);

      if (decision.action === "requeue") {
        await ctx.db.patch(draft._id, {
          recoveryAttempts: decision.recoveryAttempts,
          updatedAt: now
        });
        await ctx.scheduler.runAfter(0, internal.aiConcepts.generateConceptDraft, {
          draftId: draft._id
        });
        requeued += 1;
        continue;
      }

      if (decision.action === "fail") {
        await ctx.db.patch(draft._id, {
          status: "failed",
          failureReason: decision.reason,
          refusalReason: undefined,
          completedAt: now,
          updatedAt: now
        });
        await ctx.db.patch(draft.leadRequestId, {
          updatedAt: now
        });
        failed += 1;
        continue;
      }

      ignored += 1;
    }

    return {
      requeued,
      failed,
      ignored
    };
  }
});
