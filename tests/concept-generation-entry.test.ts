import { afterEach, describe, expect, it, vi } from "vitest";

import { mapOpenAiFailureToAiDraftFailure } from "@/convex/aiConcepts";
import {
  GLOBAL_CONCEPT_GENERATION_DAILY_CAP,
  getChicagoGenerationDayKey,
  logReservedVisitHandler,
  selectConceptGenerationGate,
  startConceptGenerationHandler
} from "@/convex/leadRequests";
import { RESERVED_SESSION_ID_MAX_LENGTH } from "@/lib/reserved-session-id";
import {
  LEAD_AI_RATE_LIMIT_PER_DAY,
  makeLeadRateLimitBucket,
  makeLeadRateLimitKey
} from "@/lib/lead-request-contract";

const NOW = Date.parse("2026-07-04T17:30:00.000Z");
const originalEnv = { ...process.env };

type Row = Record<string, any> & { _id: string };

function createFakeCtx(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {
    leadRequests: [],
    aiConceptDrafts: [],
    leadRateLimits: [],
    globalGenerationCap: [],
    funnelEvents: [],
    ...seed
  };
  const scheduled: Array<{ delay: number; fn: unknown; args: unknown }> = [];
  let nextId = 1;

  function findById(id: string) {
    for (const rows of Object.values(tables)) {
      const found = rows.find((row) => row._id === id);

      if (found) {
        return found;
      }
    }

    return null;
  }

  return {
    tables,
    scheduled,
    ctx: {
      db: {
        query(tableName: string) {
          let filters: Array<{ field: string; value: unknown }> = [];

          return {
            withIndex(_indexName: string, build: (q: any) => any) {
              const queryBuilder = {
                eq(field: string, value: unknown) {
                  filters.push({ field, value });
                  return queryBuilder;
                }
              };
              build(queryBuilder);

              return this;
            },
            async first() {
              return (
                tables[tableName]?.find((row) => filters.every((filter) => row[filter.field] === filter.value)) ??
                null
              );
            }
          };
        },
        async insert(tableName: string, doc: Record<string, unknown>) {
          const id = `${tableName}_${nextId++}`;
          tables[tableName] ??= [];
          tables[tableName].push({ _id: id, ...doc });

          return id;
        },
        async patch(id: string, patch: Record<string, unknown>) {
          const row = findById(id);

          if (!row) {
            throw new Error(`Missing fake row ${id}`);
          }

          Object.assign(row, patch);
        },
        async get(id: string) {
          return findById(id);
        }
      },
      scheduler: {
        async runAfter(delay: number, fn: unknown, args: unknown) {
          scheduled.push({ delay, fn, args });
        }
      }
    }
  };
}

describe("concept generation gate", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  function enableAiConcepts() {
    process.env.WALL_PRINT_PRO_AI_CONCEPTS_ENABLED = "1";
    process.env.OPENAI_API_KEY = "test-openai-key";
  }

  function disableAiConcepts() {
    process.env.WALL_PRINT_PRO_AI_CONCEPTS_ENABLED = "0";
    delete process.env.OPENAI_API_KEY;
  }

  it("rejects no or invalid email without reserving quota", () => {
    expect(
      selectConceptGenerationGate({
        contactEmail: "",
        contactRequestCount: 0,
        globalRequestCount: 0,
        now: NOW
      })
    ).toMatchObject({
      ok: false,
      code: "INVALID_EMAIL"
    });

    expect(
      selectConceptGenerationGate({
        contactEmail: "not-an-email",
        contactRequestCount: 0,
        globalRequestCount: 0,
        now: NOW
      })
    ).toMatchObject({
      ok: false,
      code: "INVALID_EMAIL"
    });
  });

  it("returns a friendly contact-limit result", async () => {
    enableAiConcepts();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const fake = createFakeCtx({
      leadRateLimits: [
        {
          _id: "leadRateLimits_existing",
          contactKey: makeLeadRateLimitKey("buyer@example.com"),
          bucket: makeLeadRateLimitBucket(NOW),
          count: LEAD_AI_RATE_LIMIT_PER_DAY,
          firstRequestAt: NOW - 1_000,
          updatedAt: NOW - 1_000
        }
      ]
    });

    const result = await startConceptGenerationHandler(fake.ctx, {
      contactEmail: "buyer@example.com",
      conceptPrompt: "Chicago skyline mural"
    });

    expect(result).toMatchObject({
      ok: false,
      code: "CONTACT_RATE_LIMITED",
      aiDraftStatus: "rate_limited",
      message: expect.stringContaining("Try again tomorrow")
    });
    expect(fake.scheduled).toHaveLength(0);
    expect(fake.tables.globalGenerationCap).not.toContainEqual(
      expect.objectContaining({ dayKey: getChicagoGenerationDayKey(NOW) })
    );
    expect(fake.tables.funnelEvents[0]).toMatchObject({
      kind: "concept_generation_contact_rate_limited",
      code: "CONTACT_RATE_LIMITED"
    });
  });

  it("returns a friendly global capacity result without incrementing past the cap", async () => {
    enableAiConcepts();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const dayKey = getChicagoGenerationDayKey(NOW);
    const fake = createFakeCtx({
      globalGenerationCap: [
        {
          _id: "globalGenerationCap_existing",
          dayKey,
          count: GLOBAL_CONCEPT_GENERATION_DAILY_CAP,
          createdAt: NOW - 1_000,
          updatedAt: NOW - 1_000
        }
      ]
    });

    const result = await startConceptGenerationHandler(fake.ctx, {
      contactEmail: "buyer@example.com",
      conceptPrompt: "Chicago skyline mural"
    });

    expect(result).toMatchObject({
      ok: false,
      code: "GLOBAL_DAILY_CAP_REACHED",
      aiDraftStatus: "rate_limited",
      message: expect.stringContaining("at capacity today")
    });
    expect(fake.tables.globalGenerationCap[0].count).toBe(GLOBAL_CONCEPT_GENERATION_DAILY_CAP);
    expect(fake.tables.leadRateLimits).not.toContainEqual(
      expect.objectContaining({ contactKey: makeLeadRateLimitKey("buyer@example.com") })
    );
    expect(fake.scheduled).toHaveLength(0);
    expect(fake.tables.funnelEvents[0]).toMatchObject({
      kind: "concept_generation_global_cap_hit",
      code: "GLOBAL_DAILY_CAP_REACHED"
    });
  });

  it("records the lead and funnel event, reserves caps, and schedules generation on success", async () => {
    enableAiConcepts();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const fake = createFakeCtx();

    const result = await startConceptGenerationHandler(fake.ctx, {
      contactEmail: "BUYER@EXAMPLE.COM",
      contactName: "Buyer",
      businessName: "Studio",
      conceptPrompt: "Chicago skyline mural"
    });

    expect(result).toMatchObject({
      ok: true,
      code: "QUEUED",
      status: "new",
      aiDraftStatus: "queued"
    });
    expect(fake.tables.leadRequests[0]).toMatchObject({
      contactName: "Buyer",
      contactEmail: "buyer@example.com",
      normalizedContactEmail: "buyer@example.com",
      conceptPrompt: "Chicago skyline mural",
      intent: "concept",
      status: "new"
    });
    expect(
      fake.tables.globalGenerationCap.find((row) => row.dayKey === getChicagoGenerationDayKey(NOW))
    ).toMatchObject({
      dayKey: getChicagoGenerationDayKey(NOW),
      count: 1
    });
    expect(fake.tables.aiConceptDrafts[0]).toMatchObject({
      leadRequestId: fake.tables.leadRequests[0]._id,
      status: "queued",
      provider: "openai"
    });
    expect(fake.tables.funnelEvents[0]).toMatchObject({
      leadRequestId: fake.tables.leadRequests[0]._id,
      kind: "concept_generation_queued",
      code: "QUEUED"
    });
    expect(fake.scheduled).toHaveLength(1);
    expect(fake.scheduled[0]).toMatchObject({
      delay: 0,
      args: {
        draftId: fake.tables.aiConceptDrafts[0]._id
      }
    });
  });

  it("records a reserved page visit as a session-only funnel event", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const fake = createFakeCtx();

    const result = await logReservedVisitHandler(fake.ctx, {
      sessionId: "cs_live_TEST_123"
    });

    expect(result).toEqual({
      ok: true,
      sessionId: "cs_live_TEST_123"
    });
    expect(fake.tables.funnelEvents).toHaveLength(1);
    expect(fake.tables.funnelEvents[0]).toMatchObject({
      sessionId: "cs_live_TEST_123",
      kind: "reserved_visit",
      code: "RESERVED_VISIT",
      createdAt: NOW
    });
    expect(fake.tables.funnelEvents[0]).not.toHaveProperty("leadRequestId");
  });

  it("rejects invalid reserved session ids and truncates oversized safe ids", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const invalid = createFakeCtx();

    await expect(
      logReservedVisitHandler(invalid.ctx, {
        sessionId: "cs_live_bad-hyphen"
      })
    ).rejects.toMatchObject({
      data: {
        code: "INVALID_RESERVED_SESSION_ID"
      }
    });
    expect(invalid.tables.funnelEvents).toHaveLength(0);

    const oversized = createFakeCtx();
    const longSessionId = "A".repeat(RESERVED_SESSION_ID_MAX_LENGTH + 45);
    const result = await logReservedVisitHandler(oversized.ctx, {
      sessionId: longSessionId
    });

    expect(result.sessionId).toHaveLength(RESERVED_SESSION_ID_MAX_LENGTH);
    expect(oversized.tables.funnelEvents[0]).toMatchObject({
      sessionId: "A".repeat(RESERVED_SESSION_ID_MAX_LENGTH),
      kind: "reserved_visit",
      code: "RESERVED_VISIT"
    });
  });

  it("saves the lead and a disabled funnel event without quota, draft, or scheduler side effects when disabled", async () => {
    disableAiConcepts();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const fake = createFakeCtx();

    const result = await startConceptGenerationHandler(fake.ctx, {
      contactEmail: "buyer@example.com",
      contactName: "Buyer",
      conceptPrompt: "Chicago skyline mural"
    });

    expect(result).toMatchObject({
      ok: false,
      code: "GENERATION_UNAVAILABLE",
      status: "new",
      message: "AI concept drafting is temporarily unavailable."
    });
    // The lead email is captured even when generation is disabled.
    expect(fake.tables.leadRequests).toHaveLength(1);
    expect((result as { leadRequestId?: string }).leadRequestId).toBe(fake.tables.leadRequests[0]._id);
    expect(fake.tables.funnelEvents).toEqual([
      expect.objectContaining({
        leadRequestId: fake.tables.leadRequests[0]._id,
        kind: "concept_generation_disabled",
        code: "GENERATION_UNAVAILABLE"
      })
    ]);
    // Lead-insert quota is consumed, but generation quota is not.
    expect(fake.tables.leadRateLimits).not.toContainEqual(
      expect.objectContaining({ contactKey: makeLeadRateLimitKey("buyer@example.com") })
    );
    expect(fake.tables.globalGenerationCap).not.toContainEqual(
      expect.objectContaining({ dayKey: getChicagoGenerationDayKey(NOW) })
    );
    expect(fake.tables.aiConceptDrafts).toHaveLength(0);
    expect(fake.scheduled).toHaveLength(0);
  });

  it("propagates provider failure codes into draft failure metadata", () => {
    expect(
      mapOpenAiFailureToAiDraftFailure({
        ok: false,
        code: "refused",
        reason: "Safety refusal",
        metadata: "{\"safe\":true}"
      })
    ).toEqual({
      status: "rejected",
      reason: "Safety refusal",
      providerFailureCode: "refused",
      providerMetadata: "{\"safe\":true}"
    });

    expect(
      mapOpenAiFailureToAiDraftFailure({
        ok: false,
        code: "timeout",
        reason: "Timed out"
      })
    ).toEqual({
      status: "failed",
      reason: "Timed out",
      providerFailureCode: "timeout"
    });
  });

  it("keys the global cap to the America/Chicago calendar day", () => {
    expect(getChicagoGenerationDayKey(Date.parse("2026-01-02T05:59:59.000Z"))).toBe("2026-01-01");
    expect(getChicagoGenerationDayKey(Date.parse("2026-01-02T06:00:00.000Z"))).toBe("2026-01-02");
    expect(getChicagoGenerationDayKey(Date.parse("2026-07-04T04:59:59.000Z"))).toBe("2026-07-03");
    expect(getChicagoGenerationDayKey(Date.parse("2026-07-04T05:00:00.000Z"))).toBe("2026-07-04");
  });

  it("handles the 2026 Chicago DST spring-forward boundary with arithmetic offsets", () => {
    expect(getChicagoGenerationDayKey(Date.parse("2026-03-08T05:59:59.000Z"))).toBe("2026-03-07");
    expect(getChicagoGenerationDayKey(Date.parse("2026-03-08T06:00:00.000Z"))).toBe("2026-03-08");
    expect(getChicagoGenerationDayKey(Date.parse("2026-03-08T07:59:59.000Z"))).toBe("2026-03-08");
    expect(getChicagoGenerationDayKey(Date.parse("2026-03-08T08:00:00.000Z"))).toBe("2026-03-08");
    expect(getChicagoGenerationDayKey(Date.parse("2026-03-09T04:59:59.000Z"))).toBe("2026-03-08");
    expect(getChicagoGenerationDayKey(Date.parse("2026-03-09T05:00:00.000Z"))).toBe("2026-03-09");
  });

  it("handles the 2026 Chicago DST fall-back boundary with arithmetic offsets", () => {
    expect(getChicagoGenerationDayKey(Date.parse("2026-11-01T04:59:59.000Z"))).toBe("2026-10-31");
    expect(getChicagoGenerationDayKey(Date.parse("2026-11-01T05:00:00.000Z"))).toBe("2026-11-01");
    expect(getChicagoGenerationDayKey(Date.parse("2026-11-01T06:59:59.000Z"))).toBe("2026-11-01");
    expect(getChicagoGenerationDayKey(Date.parse("2026-11-01T07:00:00.000Z"))).toBe("2026-11-01");
    expect(getChicagoGenerationDayKey(Date.parse("2026-11-02T05:59:59.000Z"))).toBe("2026-11-01");
    expect(getChicagoGenerationDayKey(Date.parse("2026-11-02T06:00:00.000Z"))).toBe("2026-11-02");
  });
});
