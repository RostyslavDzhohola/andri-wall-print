import { internalMutationGeneric as internalMutation } from "convex/server";
import { v } from "convex/values";

const DAY_MS = 24 * 60 * 60 * 1000;
const RETENTION_BATCH_SIZE = 200;

export const RETENTION_CUTOFFS = {
  funnelEvents: 90 * DAY_MS,
  leadRateLimits: 7 * DAY_MS,
  globalGenerationCap: 7 * DAY_MS
} as const;

export function selectExpiredRows<Row extends Record<string, unknown>, Field extends keyof Row>(
  rows: readonly Row[],
  field: Field,
  cutoffMs: number,
  options: { stopAtFirstLive?: boolean } = {}
) {
  const expired: Row[] = [];

  for (const row of rows) {
    const timestamp = row[field];

    if (typeof timestamp !== "number" || timestamp >= cutoffMs) {
      if (options.stopAtFirstLive) {
        break;
      }

      continue;
    }

    expired.push(row);
  }

  return expired;
}

export const pruneOldOperationalData = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = Date.now();
    const funnelEvents = await ctx.db.query("funnelEvents").order("asc").take(RETENTION_BATCH_SIZE);

    for (const row of selectExpiredRows(
      funnelEvents,
      "createdAt",
      now - RETENTION_CUTOFFS.funnelEvents,
      { stopAtFirstLive: true }
    )) {
      await ctx.db.delete(row._id);
    }

    const leadRateLimits = await ctx.db.query("leadRateLimits").order("asc").take(RETENTION_BATCH_SIZE);

    for (const row of selectExpiredRows(leadRateLimits, "updatedAt", now - RETENTION_CUTOFFS.leadRateLimits)) {
      await ctx.db.delete(row._id);
    }

    const globalGenerationCap = await ctx.db.query("globalGenerationCap").order("asc").take(RETENTION_BATCH_SIZE);

    for (const row of selectExpiredRows(
      globalGenerationCap,
      "updatedAt",
      now - RETENTION_CUTOFFS.globalGenerationCap
    )) {
      await ctx.db.delete(row._id);
    }

    return null;
  }
});
