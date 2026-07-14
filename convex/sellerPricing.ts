import { mutationGeneric as mutation, queryGeneric as query } from "convex/server";
import { ConvexError, v } from "convex/values";

import {
  SELLER_PRICING_CURRENCY,
  makeSellerPricingState
} from "../lib/pricing-estimator";

const LAUNCH_PUBLIC_PRICING_SUBJECT = "public-leads";

export const sellerPricingStateValidator = v.object({
  currency: v.literal(SELLER_PRICING_CURRENCY),
  pricePerSquareFootCents: v.number(),
  updatedAt: v.union(v.number(), v.null())
});

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
    return await readSellerPricingState(ctx, LAUNCH_PUBLIC_PRICING_SUBJECT);
  }
});

export const updateForSeller = mutation({
  args: {
    pricePerSquareFootCents: v.number()
  },
  returns: sellerPricingStateValidator,
  handler: async () => {
    throw new ConvexError({
      code: "PRICING_ADMIN_DISABLED",
      message: "Seller pricing administration is disabled for launch."
    });
  }
});
