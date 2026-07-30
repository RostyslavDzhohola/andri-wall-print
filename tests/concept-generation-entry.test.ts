import { afterEach, describe, expect, it, vi } from "vitest";

import { generateConceptDraftHandler, mapOpenAiFailureToAiDraftFailure } from "@/convex/aiConcepts";
import {
  AI_DRAFT_GENERATING_STALE_MS,
  AI_DRAFT_QUEUED_STALE_MS,
  GLOBAL_CONCEPT_GENERATION_DAILY_CAP,
  finalizeAiDraftFailure,
  getChicagoGenerationDayKey,
  getConceptGenerationStatus,
  logReservedVisitHandler,
  recordAiDraftGeneratedImage,
  recoverStaleAiConceptDrafts,
  selectConceptGenerationGate,
  selectStaleAiDraftRecovery,
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
          const filters: Array<{ field: string; value: unknown }> = [];

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
            order() {
              return this;
            },
            async first() {
              return (
                tables[tableName]?.find((row) => filters.every((filter) => row[filter.field] === filter.value)) ??
                null
              );
            },
            async take(limit: number) {
              return (tables[tableName] ?? [])
                .filter((row) => filters.every((filter) => row[filter.field] === filter.value))
                .slice(0, limit);
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
      },
      storage: {
        async getUrl(storageId: string) {
          return `https://storage.test/${storageId}`;
        }
      }
    }
  };
}

function makeTestPng() {
  const ascii = (value: string) =>
    Uint8Array.from(Array.from(value, (character) => character.charCodeAt(0)));
  const u32be = (value: number) =>
    Uint8Array.from([(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff]);
  const parts = [
    Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    u32be(13),
    ascii("IHDR"),
    u32be(128),
    u32be(128),
    Uint8Array.from([8, 6, 0, 0, 0]),
    u32be(0),
    u32be(0),
    ascii("IEND"),
    u32be(0)
  ];
  const output = new Uint8Array(parts.reduce((length, part) => length + part.byteLength, 0));
  let offset = 0;

  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }

  return output;
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

  it("uses a neutral contact fallback and never exposes an email in concept status titles", async () => {
    enableAiConcepts();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const fake = createFakeCtx();

    await startConceptGenerationHandler(fake.ctx, {
      contactEmail: "private-buyer@example.com",
      conceptPrompt: "Chicago skyline mural"
    });

    expect(fake.tables.leadRequests[0].contactName).toBe("Concept lead");

    const status = await (getConceptGenerationStatus as any)._handler(fake.ctx, {
      leadRequestId: fake.tables.leadRequests[0]._id as never
    });

    expect(status).toMatchObject({
      ok: true,
      title: "Wall print concept draft"
    });
    expect(JSON.stringify(status)).not.toContain("private-buyer@example.com");
  });

  it("builds neutral generated filenames, AR asset titles, and bundle titles", async () => {
    const storedBlobs: Blob[] = [];
    const mutationArgs: Array<Record<string, any>> = [];
    const imageBytes = makeTestPng();
    const ctx = {
      async runQuery() {
        return {
          draftId: "draft_1",
          leadRequestId: "lead_1",
          prompt: "Chicago skyline mural"
        };
      },
      async runMutation(_fn: unknown, args: Record<string, any>) {
        mutationArgs.push(args);

        if (mutationArgs.length === 1) {
          return true;
        }

        if (args.aiConceptDraftId) {
          return {
            bundleId: "bundle_1",
            publicSlug: "neutral-preview",
            publicUrl: "/preview/neutral-preview",
            status: "ready"
          };
        }

        return null;
      },
      storage: {
        async store(blob: Blob) {
          storedBlobs.push(blob);
          return `storage_${storedBlobs.length}`;
        }
      }
    };

    await generateConceptDraftHandler(
      ctx,
      { draftId: "draft_1" as never },
      async () => ({
        ok: true,
        bytes: imageBytes,
        contentType: "image/png",
        model: "test-model",
        quality: "auto",
        size: "auto",
        metadata: "{}"
      })
    );

    const bundleArgs = mutationArgs.find((args) => args.aiConceptDraftId);
    const generatedImageArgs = mutationArgs.find((args) => args.generatedImageMeta && !args.assetStorageIds);
    const glb = storedBlobs.find((blob) => blob.type === "model/gltf-binary");

    expect(bundleArgs).toMatchObject({
      title: "Wall print concept draft",
      originalFileName: "wall-print-concept-draft.png"
    });
    expect(generatedImageArgs?.generatedImageMeta.fileName).toBe("wall-print-concept-draft.png");
    expect(glb).toBeDefined();

    const glbText = Buffer.from(await (glb as Blob).arrayBuffer()).toString("utf8");
    expect(glbText).toContain("Wall print concept draft");
    expect(glbText).not.toContain("@");
  });

  it("records unexpected post-claim generation crashes as failed", async () => {
    const mutationArgs: Array<Record<string, any>> = [];
    const ctx = {
      async runQuery() {
        return {
          draftId: "draft_1",
          leadRequestId: "lead_1",
          prompt: "Chicago skyline mural"
        };
      },
      async runMutation(_fn: unknown, args: Record<string, any>) {
        mutationArgs.push(args);
        return mutationArgs.length === 1 ? true : null;
      }
    };

    await generateConceptDraftHandler(
      ctx,
      { draftId: "draft_1" as never },
      async () => {
        throw new Error("provider transport crashed");
      }
    );

    expect(mutationArgs.at(-1)).toMatchObject({
      draftId: "draft_1",
      status: "failed",
      reason: "provider transport crashed"
    });
  });

  it("falls back to composite_only when the public bundle cannot be created", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const imageBytes = makeTestPng();
    const mutationArgs: Array<Record<string, any>> = [];
    let storageCount = 0;
    const ctx = {
      async runQuery() {
        return {
          draftId: "draft_1",
          leadRequestId: "lead_1",
          prompt: "Chicago skyline mural",
          businessName: "Studio"
        };
      },
      async runMutation(_fn: unknown, args: Record<string, any>) {
        mutationArgs.push(args);

        if (mutationArgs.length === 1) {
          return true;
        }

        if (args.aiConceptDraftId) {
          throw new Error("bundle insert failed");
        }

        return null;
      },
      storage: {
        async store() {
          storageCount += 1;
          return `storage_${storageCount}`;
        }
      }
    };

    await generateConceptDraftHandler(
      ctx,
      { draftId: "draft_1" as never },
      async () => ({
        ok: true,
        bytes: imageBytes,
        contentType: "image/png",
        model: "test-model",
        quality: "auto",
        size: "auto",
        metadata: "{}"
      })
    );

    expect(mutationArgs.at(-1)).toMatchObject({
      draftId: "draft_1",
      reason: "Public preview page could not be created for this draft."
    });
    expect(mutationArgs.at(-1)).not.toHaveProperty("assetStorageIds");
  });

  it("does not overwrite a ready draft with a later failure", async () => {
    const fake = createFakeCtx({
      leadRequests: [{ _id: "lead_1", updatedAt: NOW }],
      aiConceptDrafts: [
        {
          _id: "draft_1",
          leadRequestId: "lead_1",
          status: "ready",
          completedAt: NOW - 1_000,
          updatedAt: NOW - 1_000
        }
      ]
    });

    await (finalizeAiDraftFailure as any)._handler(fake.ctx, {
      draftId: "draft_1" as never,
      status: "failed",
      reason: "late failure"
    });

    expect(fake.tables.aiConceptDrafts[0]).toMatchObject({
      status: "ready",
      completedAt: NOW - 1_000
    });
    expect(fake.tables.aiConceptDrafts[0]).not.toHaveProperty("failureReason");
  });

  it("does not record a generated image on a failed draft", async () => {
    const fake = createFakeCtx({
      leadRequests: [{ _id: "lead_1", updatedAt: NOW }],
      aiConceptDrafts: [
        {
          _id: "draft_1",
          leadRequestId: "lead_1",
          status: "failed",
          failureReason: "provider failed",
          updatedAt: NOW
        }
      ]
    });

    await (recordAiDraftGeneratedImage as any)._handler(fake.ctx, {
      draftId: "draft_1" as never,
      generatedImageStorageId: "storage_1" as never,
      generatedImageMeta: {
        fileName: "late.png",
        contentType: "image/png",
        byteLength: 123
      }
    });

    expect(fake.tables.aiConceptDrafts[0]).not.toHaveProperty("generatedImageStorageId");
    expect(fake.tables.aiConceptDrafts[0]).not.toHaveProperty("generatedImageMeta");
  });

  it("selects stale AI draft recovery without retrying generating work", () => {
    expect(
      selectStaleAiDraftRecovery(
        {
          status: "queued",
          requestedAt: NOW - AI_DRAFT_QUEUED_STALE_MS + 1,
          updatedAt: NOW - AI_DRAFT_QUEUED_STALE_MS + 1
        },
        NOW
      )
    ).toEqual({ action: "ignore" });
    expect(
      selectStaleAiDraftRecovery(
        {
          status: "queued",
          requestedAt: NOW - AI_DRAFT_QUEUED_STALE_MS,
          updatedAt: NOW - AI_DRAFT_QUEUED_STALE_MS
        },
        NOW
      )
    ).toEqual({ action: "requeue", recoveryAttempts: 1 });
    expect(
      selectStaleAiDraftRecovery(
        {
          status: "queued",
          requestedAt: NOW - AI_DRAFT_QUEUED_STALE_MS,
          updatedAt: NOW - AI_DRAFT_QUEUED_STALE_MS,
          recoveryAttempts: 1
        },
        NOW
      )
    ).toEqual({
      action: "fail",
      reason: "Concept generation stalled. Please try again."
    });
    expect(
      selectStaleAiDraftRecovery(
        {
          status: "generating",
          requestedAt: NOW - AI_DRAFT_GENERATING_STALE_MS,
          startedAt: NOW - AI_DRAFT_GENERATING_STALE_MS,
          updatedAt: NOW - 1
        },
        NOW
      )
    ).toEqual({
      action: "fail",
      reason: "Concept generation stalled. Please try again."
    });
    expect(
      selectStaleAiDraftRecovery(
        {
          status: "ready",
          requestedAt: NOW - AI_DRAFT_GENERATING_STALE_MS,
          updatedAt: NOW - AI_DRAFT_GENERATING_STALE_MS
        },
        NOW
      )
    ).toEqual({ action: "ignore" });
  });

  it("requeues stale queued drafts once and fails stale generating drafts", async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const fake = createFakeCtx({
      leadRequests: [
        { _id: "lead_queued", updatedAt: NOW - AI_DRAFT_QUEUED_STALE_MS },
        { _id: "lead_generating", updatedAt: NOW - AI_DRAFT_GENERATING_STALE_MS }
      ],
      aiConceptDrafts: [
        {
          _id: "draft_queued",
          leadRequestId: "lead_queued",
          status: "queued",
          requestedAt: NOW - AI_DRAFT_QUEUED_STALE_MS,
          updatedAt: NOW - AI_DRAFT_QUEUED_STALE_MS
        },
        {
          _id: "draft_generating",
          leadRequestId: "lead_generating",
          status: "generating",
          requestedAt: NOW - AI_DRAFT_GENERATING_STALE_MS,
          startedAt: NOW - AI_DRAFT_GENERATING_STALE_MS,
          updatedAt: NOW - AI_DRAFT_GENERATING_STALE_MS
        }
      ]
    });

    const result = await (recoverStaleAiConceptDrafts as any)._handler(fake.ctx, {});

    expect(result).toEqual({
      requeued: 1,
      failed: 1,
      ignored: 0
    });
    expect(fake.tables.aiConceptDrafts[0]).toMatchObject({
      status: "queued",
      recoveryAttempts: 1,
      updatedAt: NOW
    });
    expect(fake.scheduled).toEqual([
      expect.objectContaining({
        delay: 0,
        args: { draftId: "draft_queued" }
      })
    ]);
    expect(fake.tables.aiConceptDrafts[1]).toMatchObject({
      status: "failed",
      failureReason: "Concept generation stalled. Please try again.",
      completedAt: NOW,
      updatedAt: NOW
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
