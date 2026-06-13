import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { ConvexError, v } from "convex/values";

import {
  SELLER_PRICING_CURRENCY,
  makeSellerPricingState,
  normalizePricePerSquareFootCents
} from "../lib/pricing-estimator";
import { requireWallPrintProSeller } from "./sellerAuth";

export const sellerPricingStateValidator = v.object({
  currency: v.literal(SELLER_PRICING_CURRENCY),
  pricePerSquareFootCents: v.number(),
  updatedAt: v.union(v.number(), v.null())
});

function validateRateForMutation(pricePerSquareFootCents: number) {
  try {
    return normalizePricePerSquareFootCents(pricePerSquareFootCents);
  } catch {
    throw new ConvexError({
      code: "INVALID_RATE",
      message: "Price per square foot must be a non-negative USD cents value."
    });
  }
}

export async function readSellerPricingState(ctx: any, sellerSubject: string) {
  const setting = await ctx.db
    .query("sellerPricingSettings")
    .withIndex("by_seller_subject", (q: any) => q.eq("sellerSubject", sellerSubject))
    .first();

  if (!setting) {
    return makeSellerPricingState();
  }

  return makeSellerPricingState(setting.pricePerSquareFootCents, setting.updatedAt);
}

export const getForSeller = query({
  args: {},
  returns: sellerPricingStateValidator,
  handler: async (ctx) => {
    const seller = await requireWallPrintProSeller(ctx);
    return await readSellerPricingState(ctx, seller.subject);
  }
});

export const updateForSeller = mutation({
  args: {
    pricePerSquareFootCents: v.number()
  },
  returns: sellerPricingStateValidator,
  handler: async (ctx, args) => {
    const seller = await requireWallPrintProSeller(ctx);
    const pricePerSquareFootCents = validateRateForMutation(args.pricePerSquareFootCents);
    const now = Date.now();
    const existingSettings = await ctx.db
      .query("sellerPricingSettings")
      .withIndex("by_seller_subject", (q) => q.eq("sellerSubject", seller.subject))
      .collect();
    const [existing, ...duplicates] = existingSettings;
    const nextState = {
      sellerSubject: seller.subject,
      currency: SELLER_PRICING_CURRENCY,
      pricePerSquareFootCents,
      updatedAt: now
    };

    if (existing) {
      await ctx.db.patch(existing._id, nextState);
    } else {
      await ctx.db.insert("sellerPricingSettings", {
        ...nextState,
        createdAt: now
      });
    }

    if (duplicates.length > 0) {
      await Promise.all(duplicates.map((duplicate) => ctx.db.delete(duplicate._id)));
    }

    return makeSellerPricingState(pricePerSquareFootCents, now);
  }
});
