import { describe, expect, it } from "vitest";

import { RETENTION_CUTOFFS, selectExpiredRows } from "@/convex/retention";

describe("operational data retention", () => {
  it("selects expired updatedAt rows even when they follow a live row", () => {
    const rows = [
      { id: "oldest", updatedAt: 10 },
      { id: "expired", updatedAt: 99 },
      { id: "fresh", updatedAt: 100 },
      { id: "later-but-old-field", updatedAt: 20 }
    ];

    expect(selectExpiredRows(rows, "updatedAt", 100)).toEqual([rows[0], rows[1], rows[3]]);
  });

  it("can stop at the first live row when the expiry field matches creation order", () => {
    const rows = [
      { id: "expired", createdAt: 1 },
      { id: "fresh", createdAt: 101 },
      { id: "would-be-expired", createdAt: 2 }
    ];

    expect(
      selectExpiredRows(rows, "createdAt", 100, { stopAtFirstLive: true })
    ).toEqual([rows[0]]);
  });

  it("keeps the configured retention windows stable", () => {
    expect(RETENTION_CUTOFFS).toEqual({
      funnelEvents: 90 * 24 * 60 * 60 * 1000,
      leadRateLimits: 7 * 24 * 60 * 60 * 1000,
      globalGenerationCap: 7 * 24 * 60 * 60 * 1000
    });
  });
});
