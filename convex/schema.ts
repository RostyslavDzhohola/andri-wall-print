import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

import {
  assetMetaValidator,
  assetStorageIdsValidator,
  assetUrlsValidator,
  previewBundleCropValidator,
  previewBundleSourceValidator,
  previewBundleStatusValidator,
  previewConfirmationAreaBasisValidator,
  printValidator
} from "./validators";

export default defineSchema({
  arPreviews: defineTable({
    slug: v.string(),
    title: v.string(),
    description: v.string(),
    print: printValidator,
    assetStorageIds: assetStorageIdsValidator,
    assetMeta: assetMetaValidator,
    sourcePdfName: v.optional(v.string()),
    status: v.union(v.literal("ready"), v.literal("unavailable")),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_slug", ["slug"]),
  previewBundles: defineTable({
    publicSlug: v.string(),
    sellerSubject: v.string(),
    sellerEmail: v.optional(v.string()),
    builderInviteId: v.optional(v.string()),
    leadRequestId: v.optional(v.id("leadRequests")),
    aiConceptDraftId: v.optional(v.id("aiConceptDrafts")),
    createdVia: v.optional(v.union(v.literal("seller"), v.literal("builder"), v.literal("lead"))),
    title: v.string(),
    description: v.string(),
    source: previewBundleSourceValidator,
    crop: previewBundleCropValidator,
    print: printValidator,
    generatorVersion: v.string(),
    idempotencyKey: v.string(),
    status: previewBundleStatusValidator,
    rejectionReason: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    assetStorageIds: v.optional(assetStorageIdsValidator),
    assetUrls: v.optional(assetUrlsValidator),
    assetMeta: v.optional(assetMetaValidator),
    job: v.optional(
      v.object({
        attempt: v.number(),
        scheduledAt: v.number(),
        scheduledFunctionId: v.optional(v.string()),
        startedAt: v.optional(v.number()),
        completedAt: v.optional(v.number()),
        error: v.optional(v.string())
      })
    ),
    revokedAt: v.optional(v.number()),
    publicReadyAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_public_slug", ["publicSlug"])
    .index("by_seller_createdAt", ["sellerSubject", "createdAt"])
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_idempotency_key", ["idempotencyKey"]),
  previewConfirmations: defineTable({
    previewBundleId: v.id("previewBundles"),
    publicSlug: v.string(),
    selectedArtworkTitle: v.string(),
    selectedPrintLabel: v.string(),
    selectedWidthMeters: v.number(),
    selectedHeightMeters: v.number(),
    areaBasis: previewConfirmationAreaBasisValidator,
    buyerNote: v.optional(v.string()),
    createdAt: v.number()
  })
    .index("by_preview_bundle_createdAt", ["previewBundleId", "createdAt"])
    .index("by_public_slug_createdAt", ["publicSlug", "createdAt"]),
  galleryEntries: defineTable({
    aiConceptDraftId: v.id("aiConceptDrafts"),
    previewBundleId: v.id("previewBundles"),
    publicSlug: v.string(),
    title: v.string(),
    description: v.string(),
    print: printValidator,
    assetStorageIds: assetStorageIdsValidator,
    assetMeta: assetMetaValidator,
    consentVersion: v.string(),
    consentRecordedAt: v.number(),
    moderationModel: v.string(),
    moderationOutcome: v.union(
      v.literal("pending"),
      v.literal("passed"),
      v.literal("flagged"),
      v.literal("error")
    ),
    moderationAttempts: v.number(),
    flaggedCategories: v.optional(v.array(v.string())),
    moderatedAt: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("published"), v.literal("held"), v.literal("hidden")),
    publishedAt: v.optional(v.number()),
    hiddenAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_ai_concept_draft", ["aiConceptDraftId"])
    .index("by_public_slug", ["publicSlug"])
    .index("by_status_createdAt", ["status", "createdAt"]),
  leadRequests: defineTable({
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    normalizedContactEmail: v.string(),
    normalizedContactPhone: v.optional(v.string()),
    preferredContactMethod: v.optional(v.union(v.literal("email"), v.literal("phone"), v.literal("either"))),
    projectType: v.optional(v.string()),
    businessName: v.optional(v.string()),
    wallDescription: v.optional(v.string()),
    conceptPrompt: v.optional(v.string()),
    intent: v.union(v.literal("contact"), v.literal("concept"), v.literal("reserve")),
    reserveInterest: v.boolean(),
    upload: v.optional(
      v.object({
        storageId: v.id("_storage"),
        originalFileName: v.string(),
        contentType: v.string(),
        byteLength: v.number(),
        sourceFingerprint: v.optional(v.string())
      })
    ),
    print: v.optional(printValidator),
    status: v.union(v.literal("new"), v.literal("reviewing"), v.literal("contacted"), v.literal("won"), v.literal("lost"), v.literal("archived")),
    aiConceptDraftId: v.optional(v.id("aiConceptDrafts")),
    previewBundleId: v.optional(v.id("previewBundles")),
    publicPreviewSlug: v.optional(v.string()),
    galleryPublicationConsent: v.optional(v.boolean()),
    galleryConsentVersion: v.optional(v.string()),
    galleryConsentRecordedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_status_createdAt", ["status", "createdAt"])
    .index("by_createdAt", ["createdAt"])
    .index("by_normalized_email_createdAt", ["normalizedContactEmail", "createdAt"]),
  aiConceptDrafts: defineTable({
    leadRequestId: v.id("leadRequests"),
    prompt: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("generating"),
      v.literal("ready"),
      v.literal("composite_only"),
      v.literal("failed"),
      v.literal("rejected"),
      v.literal("rate_limited"),
      v.literal("disabled")
    ),
    model: v.optional(v.string()),
    provider: v.literal("openai"),
    generatedImageStorageId: v.optional(v.id("_storage")),
    generatedImageMeta: v.optional(
      v.object({
        fileName: v.string(),
        contentType: v.string(),
        byteLength: v.number()
      })
    ),
    assetStorageIds: v.optional(assetStorageIdsValidator),
    assetMeta: v.optional(assetMetaValidator),
    previewBundleId: v.optional(v.id("previewBundles")),
    publicPreviewSlug: v.optional(v.string()),
    galleryPublicationConsent: v.optional(v.boolean()),
    galleryConsentVersion: v.optional(v.string()),
    galleryConsentRecordedAt: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    refusalReason: v.optional(v.string()),
    providerMetadata: v.optional(v.string()),
    providerFailureCode: v.optional(v.string()),
    recoveryAttempts: v.optional(v.number()),
    requestedAt: v.number(),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    updatedAt: v.number()
  })
    .index("by_lead_request", ["leadRequestId"])
    .index("by_status_requestedAt", ["status", "requestedAt"]),
  leadRateLimits: defineTable({
    contactKey: v.string(),
    bucket: v.string(),
    count: v.number(),
    firstRequestAt: v.number(),
    updatedAt: v.number()
  }).index("by_contact_bucket", ["contactKey", "bucket"]),
  globalGenerationCap: defineTable({
    dayKey: v.string(),
    count: v.number(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_day_key", ["dayKey"]),
  funnelEvents: defineTable({
    leadRequestId: v.optional(v.id("leadRequests")),
    sessionId: v.optional(v.string()),
    kind: v.string(),
    code: v.string(),
    createdAt: v.number()
  })
    .index("by_lead_createdAt", ["leadRequestId", "createdAt"])
    .index("by_kind_createdAt", ["kind", "createdAt"])
});
