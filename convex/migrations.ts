import { internalMutationGeneric as internalMutation } from "convex/server";
import { v } from "convex/values";

const SELLER_PRICING_SETTINGS_BATCH_SIZE = 100;

/**
 * Run repeatedly until `complete` is true, then remove the empty table in a
 * follow-up schema push. Convex cannot remove a table that still has rows.
 */
export const wipeSellerPricingSettings = internalMutation({
  args: {},
  returns: v.object({
    deleted: v.number(),
    complete: v.boolean()
  }),
  handler: async (ctx) => {
    const settings = await ctx.db.query("sellerPricingSettings").take(SELLER_PRICING_SETTINGS_BATCH_SIZE);

    for (const setting of settings) {
      await ctx.db.delete(setting._id);
    }

    return {
      deleted: settings.length,
      complete: settings.length < SELLER_PRICING_SETTINGS_BATCH_SIZE
    };
  }
});
