import { describe, expect, it } from "vitest";

import { RETENTION_CUTOFFS, selectExpiredRows } from "@/convex/retention";

describe("operational data retention", () => {
  it("selects only the expired prefix from creation-ordered rows", () => {
    const rows = [
      { id: "oldest", updatedAt: 10 },
      { id: "expired", updatedAt: 99 },
      { id: "fresh", updatedAt: 100 },
      { id: "later-but-old-field", updatedAt: 20 }
    ];

    expect(selectExpiredRows(rows, "updatedAt", 100)).toEqual(rows.slice(0, 2));
  });

  it("stops at the first newer row instead of scanning later rows", () => {
    const rows = [
      { id: "expired", createdAt: 1 },
      { id: "fresh", createdAt: 101 },
      { id: "would-be-expired", createdAt: 2 }
    ];

    expect(selectExpiredRows(rows, "createdAt", 100)).toEqual([rows[0]]);
  });

  it("keeps the configured retention windows stable", () => {
    expect(RETENTION_CUTOFFS).toEqual({
      funnelEvents: 90 * 24 * 60 * 60 * 1000,
      leadRateLimits: 7 * 24 * 60 * 60 * 1000,
      globalGenerationCap: 7 * 24 * 60 * 60 * 1000
    });
  });
});
