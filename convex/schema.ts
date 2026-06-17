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
  builderInvites: defineTable({
    sellerSubject: v.string(),
    tokenHash: v.string(),
    expiresAt: v.number(),
    maxGenerations: v.number(),
    generatedCount: v.number(),
    maxUploadStarts: v.number(),
    uploadStartedCount: v.number(),
    revokedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_token_hash", ["tokenHash"])
    .index("by_seller_createdAt", ["sellerSubject", "createdAt"]),
  sellerPricingSettings: defineTable({
    sellerSubject: v.string(),
    currency: v.literal("USD"),
    pricePerSquareFootCents: v.number(),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_seller_subject", ["sellerSubject"]),
  previewBundles: defineTable({
    publicSlug: v.string(),
    sellerSubject: v.string(),
    sellerEmail: v.optional(v.string()),
    builderInviteId: v.optional(v.id("builderInvites")),
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
  buyerProfiles: defineTable({
    buyerSubject: v.string(),
    buyerEmail: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  }).index("by_buyer_subject", ["buyerSubject"]),
  buyerPreviewClaims: defineTable({
    buyerSubject: v.string(),
    buyerEmail: v.optional(v.string()),
    previewBundleId: v.id("previewBundles"),
    publicSlug: v.string(),
    confirmationId: v.optional(v.id("previewConfirmations")),
    source: v.union(v.literal("public_preview"), v.literal("confirmation")),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_buyer_createdAt", ["buyerSubject", "createdAt"])
    .index("by_buyer_public_slug", ["buyerSubject", "publicSlug"])
    .index("by_preview_bundle", ["previewBundleId"]),
  leadRequests: defineTable({
    contactName: v.string(),
    contactEmail: v.string(),
    contactPhone: v.optional(v.string()),
    normalizedContactEmail: v.string(),
    normalizedContactPhone: v.optional(v.string()),
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
    previewBundleId: v.optional(v.id("previewBundles")),
    publicPreviewSlug: v.optional(v.string()),
    failureReason: v.optional(v.string()),
    refusalReason: v.optional(v.string()),
    providerMetadata: v.optional(v.string()),
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
  }).index("by_contact_bucket", ["contactKey", "bucket"])
});
