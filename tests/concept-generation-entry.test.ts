import { afterEach, describe, expect, it, vi } from "vitest";

import { mapOpenAiFailureToAiDraftFailure } from "@/convex/aiConcepts";
import {
  GLOBAL_CONCEPT_GENERATION_DAILY_CAP,
  getChicagoGenerationDayKey,
  selectConceptGenerationGate,
  startConceptGenerationHandler
} from "@/convex/leadRequests";
import { LEAD_AI_RATE_LIMIT_PER_DAY, makeLeadRateLimitBucket } from "@/lib/lead-request-contract";

const NOW = Date.parse("2026-07-04T17:30:00.000Z");

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
    vi.restoreAllMocks();
  });

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
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const fake = createFakeCtx({
      leadRateLimits: [
        {
          _id: "leadRateLimits_existing",
          contactKey: "buyer@example.com",
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
    expect(fake.tables.globalGenerationCap).toHaveLength(0);
    expect(fake.tables.funnelEvents[0]).toMatchObject({
      kind: "concept_generation_contact_rate_limited",
      code: "CONTACT_RATE_LIMITED"
    });
  });

  it("returns a friendly global capacity result without incrementing past the cap", async () => {
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
    expect(fake.tables.leadRateLimits).toHaveLength(0);
    expect(fake.scheduled).toHaveLength(0);
    expect(fake.tables.funnelEvents[0]).toMatchObject({
      kind: "concept_generation_global_cap_hit",
      code: "GLOBAL_DAILY_CAP_REACHED"
    });
  });

  it("records the lead and funnel event, reserves caps, and schedules generation on success", async () => {
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
    expect(fake.tables.globalGenerationCap[0]).toMatchObject({
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
    expect(getChicagoGenerationDayKey(Date.parse("2026-07-04T04:59:59.000Z"))).toBe("2026-07-03");
    expect(getChicagoGenerationDayKey(Date.parse("2026-07-04T05:00:00.000Z"))).toBe("2026-07-04");
  });
});
