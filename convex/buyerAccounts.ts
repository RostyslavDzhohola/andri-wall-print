import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { ConvexError, v } from "convex/values";

import { formatPreviewBundlePrintDimensions, normalizePreviewBundlePrintDisplay } from "../lib/preview-bundle-contract";
import { getSellerEmail, getSellerSubject } from "../lib/seller-admin";
import {
  previewConfirmationAreaBasisValidator,
  printValidator
} from "./validators";

const claimSourceValidator = v.union(v.literal("public_preview"), v.literal("confirmation"));

const buyerDashboardConfirmationValidator = v.object({
  id: v.string(),
  selectedArtworkTitle: v.string(),
  selectedPrintLabel: v.string(),
  selectedWidthMeters: v.number(),
  selectedHeightMeters: v.number(),
  areaBasis: previewConfirmationAreaBasisValidator,
  buyerNote: v.optional(v.string()),
  createdAt: v.number()
});

const buyerDashboardPreviewValidator = v.object({
  id: v.string(),
  publicSlug: v.string(),
  title: v.string(),
  description: v.string(),
  status: v.string(),
  print: printValidator,
  sourceKind: v.union(v.literal("upload"), v.literal("sample")),
  createdVia: v.union(v.literal("seller"), v.literal("builder")),
  sourceLabel: v.string(),
  publicUrl: v.string(),
  posterUrl: v.optional(v.string()),
  confirmation: v.optional(buyerDashboardConfirmationValidator),
  savedAt: v.number(),
  updatedAt: v.number()
});

const buyerDashboardValidator = v.object({
  buyer: v.object({
    subject: v.string(),
    email: v.optional(v.string())
  }),
  items: v.array(buyerDashboardPreviewValidator)
});

type AuthCtx = {
  auth: {
    getUserIdentity: () => Promise<{
      subject?: string | null;
      tokenIdentifier?: string | null;
      email?: string | null;
      preferredEmailAddress?: string | null;
    } | null>;
  };
};

type BuyerIdentity = {
  subject: string;
  email?: string;
};

type BuyerClaimRecord = {
  _id: string;
  buyerSubject: string;
  buyerEmail?: string;
  previewBundleId: string;
  publicSlug: string;
  confirmationId?: string;
  source: "public_preview" | "confirmation";
  createdAt: number;
  updatedAt: number;
};

type PreviewBundleRecord = {
  _id: string;
  publicSlug: string;
  title: string;
  description: string;
  status: string;
  print: {
    aspectRatio: string;
    widthMeters: number;
    heightMeters: number;
    label: string;
  };
  source: {
    kind: "upload" | "sample";
  };
  createdVia?: "seller" | "builder";
};

type PreviewConfirmationRecord = {
  _id: string;
  previewBundleId: string;
  publicSlug: string;
  selectedArtworkTitle: string;
  selectedPrintLabel: string;
  selectedWidthMeters: number;
  selectedHeightMeters: number;
  areaBasis: {
    kind: "selected_dimensions";
    unit: "square_foot" | "square_meter";
    value: number;
  };
  buyerNote?: string;
  createdAt: number;
};

async function requireBuyerIdentity(ctx: AuthCtx): Promise<BuyerIdentity> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new ConvexError({
      code: "UNAUTHENTICATED",
      message: "Sign in to save Wall Print Pro previews."
    });
  }

  const subject = getSellerSubject(identity);

  if (!subject) {
    throw new ConvexError({
      code: "INVALID_IDENTITY",
      message: "This account is missing a stable sign-in identity."
    });
  }

  return {
    subject,
    email: getSellerEmail(identity) ?? undefined
  };
}

async function upsertBuyerProfile(ctx: any, buyer: BuyerIdentity, now: number) {
  const existing = await ctx.db
    .query("buyerProfiles")
    .withIndex("by_buyer_subject", (q: any) => q.eq("buyerSubject", buyer.subject))
    .first();

  if (existing) {
    if (buyer.email && buyer.email !== existing.buyerEmail) {
      await ctx.db.patch(existing._id, {
        buyerEmail: buyer.email,
        updatedAt: now
      });
    }

    return existing._id;
  }

  return await ctx.db.insert("buyerProfiles", {
    buyerSubject: buyer.subject,
    buyerEmail: buyer.email,
    createdAt: now,
    updatedAt: now
  });
}

function toPublicUrl(publicSlug: string) {
  return `/preview/${publicSlug}`;
}

function sourceLabel(bundle: PreviewBundleRecord) {
  if (bundle.createdVia === "builder" && bundle.source.kind === "upload") {
    return "Uploaded through invite";
  }

  if (bundle.createdVia === "builder") {
    return "Saved from invite";
  }

  if (bundle.source.kind === "upload") {
    return "Uploaded artwork";
  }

  return "Shared by Wall Print Pro";
}

function serializeBuyerConfirmation(confirmation: PreviewConfirmationRecord | null | undefined) {
  if (!confirmation) {
    return undefined;
  }

  return {
    id: confirmation._id,
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

export function serializeBuyerDashboardPreview(input: {
  buyerSubject: string;
  claim: BuyerClaimRecord;
  bundle: PreviewBundleRecord;
  posterUrl?: string | null;
  confirmation?: PreviewConfirmationRecord | null;
}) {
  if (input.claim.buyerSubject !== input.buyerSubject) {
    return null;
  }

  return {
    id: input.claim._id,
    publicSlug: input.bundle.publicSlug,
    title: input.bundle.title,
    description: input.bundle.description,
    status: input.bundle.status,
    print: normalizePreviewBundlePrintDisplay(input.bundle.print),
    sourceKind: input.bundle.source.kind,
    createdVia: input.bundle.createdVia ?? "seller",
    sourceLabel: sourceLabel(input.bundle),
    publicUrl: toPublicUrl(input.bundle.publicSlug),
    ...(input.posterUrl ? { posterUrl: input.posterUrl } : {}),
    ...(input.confirmation ? { confirmation: serializeBuyerConfirmation(input.confirmation) } : {}),
    savedAt: input.claim.createdAt,
    updatedAt: input.claim.updatedAt
  };
}

async function readPosterUrl(ctx: any, bundle: any) {
  if (bundle.assetUrls?.poster) {
    return bundle.assetUrls.poster;
  }

  if (bundle.assetStorageIds?.poster) {
    return (await ctx.storage.getUrl(bundle.assetStorageIds.poster)) ?? undefined;
  }

  return undefined;
}

async function readClaimConfirmation(ctx: any, claim: BuyerClaimRecord) {
  if (!claim.confirmationId) {
    return null;
  }

  const confirmation = await ctx.db.get(claim.confirmationId as never);

  if (!confirmation || confirmation.previewBundleId !== claim.previewBundleId || confirmation.publicSlug !== claim.publicSlug) {
    return null;
  }

  return confirmation;
}

export const getDashboard = query({
  args: {},
  returns: buyerDashboardValidator,
  handler: async (ctx) => {
    const buyer = await requireBuyerIdentity(ctx);
    const claims = await ctx.db
      .query("buyerPreviewClaims")
      .withIndex("by_buyer_createdAt", (q) => q.eq("buyerSubject", buyer.subject))
      .order("desc")
      .take(100);
    const items = [];

    for (const claim of claims) {
      const bundle = await ctx.db.get(claim.previewBundleId);

      if (!bundle) {
        continue;
      }

      const item = serializeBuyerDashboardPreview({
        buyerSubject: buyer.subject,
        claim,
        bundle,
        posterUrl: await readPosterUrl(ctx, bundle),
        confirmation: await readClaimConfirmation(ctx, claim)
      });

      if (item) {
        items.push(item);
      }
    }

    return {
      buyer,
      items
    };
  }
});

export const claimPublicPreview = mutation({
  args: {
    publicSlug: v.string(),
    confirmationId: v.optional(v.id("previewConfirmations"))
  },
  returns: buyerDashboardPreviewValidator,
  handler: async (ctx, args) => {
    const buyer = await requireBuyerIdentity(ctx);
    const publicSlug = args.publicSlug.trim();

    if (!publicSlug) {
      throw new ConvexError({
        code: "INVALID_PREVIEW",
        message: "This preview could not be saved."
      });
    }

    const bundle = await ctx.db
      .query("previewBundles")
      .withIndex("by_public_slug", (q) => q.eq("publicSlug", publicSlug))
      .first();

    if (!bundle || ["failed", "rejected", "revoked"].includes(bundle.status)) {
      throw new ConvexError({
        code: "PREVIEW_UNAVAILABLE",
        message: "This preview is not available to save."
      });
    }

    let confirmation: PreviewConfirmationRecord | null = null;

    if (args.confirmationId) {
      const candidate = await ctx.db.get(args.confirmationId);

      if (!candidate || candidate.previewBundleId !== bundle._id || candidate.publicSlug !== bundle.publicSlug) {
        throw new ConvexError({
          code: "CONFIRMATION_MISMATCH",
          message: "This confirmed choice does not belong to the preview."
        });
      }

      confirmation = candidate;
    }

    const now = Date.now();
    await upsertBuyerProfile(ctx, buyer, now);

    const existing = await ctx.db
      .query("buyerPreviewClaims")
      .withIndex("by_buyer_public_slug", (q: any) => q.eq("buyerSubject", buyer.subject).eq("publicSlug", bundle.publicSlug))
      .first();
    const source = args.confirmationId ? "confirmation" : "public_preview";
    let claim: BuyerClaimRecord;

    if (existing) {
      await ctx.db.patch(existing._id, {
        buyerEmail: buyer.email,
        ...(args.confirmationId ? { confirmationId: args.confirmationId } : {}),
        source: args.confirmationId ? "confirmation" : existing.source,
        updatedAt: now
      });

      claim = {
        ...existing,
        buyerEmail: buyer.email,
        confirmationId: args.confirmationId ?? existing.confirmationId,
        source: args.confirmationId ? "confirmation" : existing.source,
        updatedAt: now
      };
    } else {
      const claimId = await ctx.db.insert("buyerPreviewClaims", {
        buyerSubject: buyer.subject,
        buyerEmail: buyer.email,
        previewBundleId: bundle._id,
        publicSlug: bundle.publicSlug,
        ...(args.confirmationId ? { confirmationId: args.confirmationId } : {}),
        source,
        createdAt: now,
        updatedAt: now
      });

      claim = {
        _id: claimId,
        buyerSubject: buyer.subject,
        buyerEmail: buyer.email,
        previewBundleId: bundle._id,
        publicSlug: bundle.publicSlug,
        confirmationId: args.confirmationId,
        source,
        createdAt: now,
        updatedAt: now
      };
    }

    const item = serializeBuyerDashboardPreview({
      buyerSubject: buyer.subject,
      claim,
      bundle,
      posterUrl: await readPosterUrl(ctx, bundle),
      confirmation
    });

    if (!item) {
      throw new ConvexError({
        code: "CLAIM_OWNER_MISMATCH",
        message: "This preview could not be saved."
      });
    }

    return item;
  }
});
