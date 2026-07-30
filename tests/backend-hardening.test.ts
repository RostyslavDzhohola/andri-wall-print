import { afterEach, describe, expect, it, vi } from "vitest";

import {
  FUNNEL_VISIT_DAILY_CAP,
  LEADS_DAILY_CAP,
  LEAD_INSERTS_PER_CONTACT_PER_DAY,
  UPLOAD_FINGERPRINT_DAILY_CAP,
  UPLOAD_URL_DAILY_CAP
} from "@/convex/dailyCaps";
import {
  GLOBAL_CONCEPT_GENERATION_DAILY_CAP,
  generateLeadUploadUrlHandler,
  getChicagoGenerationDayKey,
  logReservedVisitHandler,
  reserveConceptGenerationGate,
  startConceptGenerationHandler,
  submitLeadRequestHandler
} from "@/convex/leadRequests";
import {
  createHomepageUploadBundleHandler,
  generateHomepageUploadUrlHandler
} from "@/convex/previewBundles";
import {
  LEAD_AI_RATE_LIMIT_PER_DAY,
  makeLeadRateLimitBucket,
  makeLeadRateLimitKey,
  normalizeLeadRequestInput
} from "@/lib/lead-request-contract";

const NOW = Date.parse("2026-07-04T17:30:00.000Z");
const DAY_KEY = getChicagoGenerationDayKey(NOW);
const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);
const originalEnv = { ...process.env };

type Row = Record<string, any> & { _id: string };

function createFakeCtx(input?: {
  seed?: Record<string, Row[]>;
  storageMetadata?: Record<string, { contentType?: string; size: number; sha256?: string } | null>;
}) {
  const tables: Record<string, Row[]> = {
    previewBundles: [],
    leadRequests: [],
    aiConceptDrafts: [],
    leadRateLimits: [],
    globalGenerationCap: [],
    funnelEvents: [],
    ...input?.seed
  };
  const generatedUploadUrls: string[] = [];
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

  const ctx = {
    db: {
      system: {
        async get(_tableName: string, storageId: string) {
          return input?.storageMetadata?.[storageId] ?? null;
        }
      },
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
          async first() {
            return (
              tables[tableName]?.find((row) =>
                filters.every((filter) => row[filter.field] === filter.value)
              ) ?? null
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
    storage: {
      async generateUploadUrl() {
        const url = `https://upload.test/${generatedUploadUrls.length + 1}`;
        generatedUploadUrls.push(url);
        return url;
      }
    },
    scheduler: {
      async runAfter(delay: number, fn: unknown, args: unknown) {
        scheduled.push({ delay, fn, args });
        return `scheduled_${scheduled.length}`;
      }
    }
  };

  return { ctx, tables, generatedUploadUrls, scheduled };
}

function validPrint(index = 0) {
  const widthMeters = 1 + index / 10;

  return {
    aspectRatio: `${widthMeters}:1`,
    widthMeters,
    heightMeters: 1,
    label: `${widthMeters}m x 1m`
  };
}

function homepageArgs(storageId: string, sourceFingerprint: string, printIndex = 0) {
  return {
    sourceStorageId: storageId,
    originalFileName: `${storageId}.png`,
    contentType: "image/png",
    byteLength: 1200,
    sourceFingerprint,
    title: "Homepage artwork",
    print: validPrint(printIndex)
  };
}

describe("backend quota hardening", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("leaves the other AI counter untouched when either generation cap is reached", async () => {
    const normalized = normalizeLeadRequestInput({
      contactName: "Buyer",
      contactEmail: "Buyer+tag@gmail.com",
      conceptPrompt: "Chicago mural"
    });
    const aiKey = makeLeadRateLimitKey(normalized.normalizedContactEmail);
    const bucket = makeLeadRateLimitBucket(NOW);
    const globalFull = createFakeCtx({
      seed: {
        globalGenerationCap: [
          {
            _id: "global_full",
            dayKey: DAY_KEY,
            count: GLOBAL_CONCEPT_GENERATION_DAILY_CAP,
            createdAt: NOW,
            updatedAt: NOW
          }
        ]
      }
    });

    await expect(reserveConceptGenerationGate(globalFull.ctx, normalized, NOW)).resolves.toMatchObject({
      ok: false,
      code: "GLOBAL_DAILY_CAP_REACHED"
    });
    expect(globalFull.tables.leadRateLimits).toHaveLength(0);

    const contactFull = createFakeCtx({
      seed: {
        leadRateLimits: [
          {
            _id: "contact_full",
            contactKey: aiKey,
            bucket,
            count: LEAD_AI_RATE_LIMIT_PER_DAY,
            firstRequestAt: NOW,
            updatedAt: NOW
          }
        ]
      }
    });

    await expect(reserveConceptGenerationGate(contactFull.ctx, normalized, NOW)).resolves.toMatchObject({
      ok: false,
      code: "CONTACT_RATE_LIMITED"
    });
    expect(contactFull.tables.globalGenerationCap).toHaveLength(0);
    expect(contactFull.tables.leadRateLimits[0].count).toBe(LEAD_AI_RATE_LIMIT_PER_DAY);
  });

  it("shares the upload URL cap and never generates a URL after the cap", async () => {
    const fake = createFakeCtx({
      seed: {
        globalGenerationCap: [
          {
            _id: "upload_urls_full",
            dayKey: `uploadUrls:${DAY_KEY}`,
            count: UPLOAD_URL_DAILY_CAP,
            createdAt: NOW,
            updatedAt: NOW
          }
        ]
      }
    });
    vi.spyOn(Date, "now").mockReturnValue(NOW);

    await expect(generateHomepageUploadUrlHandler(fake.ctx)).rejects.toMatchObject({
      data: { code: "UPLOAD_CAP_REACHED" }
    });
    await expect(generateLeadUploadUrlHandler(fake.ctx)).rejects.toMatchObject({
      data: { code: "UPLOAD_CAP_REACHED" }
    });
    expect(fake.generatedUploadUrls).toHaveLength(0);
    expect(fake.tables.globalGenerationCap).toHaveLength(1);
    expect(fake.tables.globalGenerationCap[0].count).toBe(UPLOAD_URL_DAILY_CAP);
  });

  it("keeps homepage dedupe quota-free", async () => {
    const fake = createFakeCtx({
      storageMetadata: {
        storage_a: { contentType: "image/png", size: 1200, sha256: SHA_A }
      }
    });
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    const args = homepageArgs("storage_a", SHA_A);

    const first = await createHomepageUploadBundleHandler(fake.ctx, args);
    const second = await createHomepageUploadBundleHandler(fake.ctx, args);

    expect(second).toEqual(first);
    expect(fake.tables.previewBundles).toHaveLength(1);
    expect(
      fake.tables.globalGenerationCap.find((row) => row.dayKey === `uploads:${DAY_KEY}`)
    ).toMatchObject({ count: 1 });
    expect(
      fake.tables.leadRateLimits.find((row) => row.contactKey === `fp:${SHA_A}`)
    ).toMatchObject({ count: 1 });
  });

  it("rejects a sixth bundle for one fingerprint while allowing a different fingerprint", async () => {
    const fake = createFakeCtx({
      storageMetadata: {
        storage_a: { contentType: "image/png", size: 1200, sha256: SHA_A },
        storage_b: { contentType: "image/png", size: 1200, sha256: SHA_B }
      }
    });
    vi.spyOn(Date, "now").mockReturnValue(NOW);

    for (let index = 0; index < UPLOAD_FINGERPRINT_DAILY_CAP; index += 1) {
      await createHomepageUploadBundleHandler(fake.ctx, homepageArgs("storage_a", SHA_A, index));
    }

    await expect(
      createHomepageUploadBundleHandler(
        fake.ctx,
        homepageArgs("storage_a", SHA_A, UPLOAD_FINGERPRINT_DAILY_CAP)
      )
    ).rejects.toMatchObject({
      data: { code: "UPLOAD_CAP_REACHED" }
    });
    expect(fake.tables.previewBundles).toHaveLength(UPLOAD_FINGERPRINT_DAILY_CAP);

    await expect(
      createHomepageUploadBundleHandler(
        fake.ctx,
        homepageArgs("storage_b", SHA_B, UPLOAD_FINGERPRINT_DAILY_CAP)
      )
    ).resolves.toMatchObject({ status: "uploaded" });
    expect(fake.tables.previewBundles).toHaveLength(UPLOAD_FINGERPRINT_DAILY_CAP + 1);
  });

  it("rejects the eleventh lead for the same folded contact before insert", async () => {
    const fake = createFakeCtx();
    vi.spyOn(Date, "now").mockReturnValue(NOW);

    for (let index = 0; index < LEAD_INSERTS_PER_CONTACT_PER_DAY; index += 1) {
      await submitLeadRequestHandler(fake.ctx, {
        contactName: `Buyer ${index}`,
        contactEmail: index % 2 === 0 ? "First.Last+promo@gmail.com" : "firstlast@gmail.com"
      });
    }

    await expect(
      submitLeadRequestHandler(fake.ctx, {
        contactName: "Buyer 11",
        contactEmail: "first.last+another@gmail.com"
      })
    ).rejects.toMatchObject({
      data: { code: "LEAD_LIMIT_REACHED" }
    });
    expect(fake.tables.leadRequests).toHaveLength(LEAD_INSERTS_PER_CONTACT_PER_DAY);
    expect(
      fake.tables.globalGenerationCap.find((row) => row.dayKey === `leads:${DAY_KEY}`)
    ).toMatchObject({ count: LEAD_INSERTS_PER_CONTACT_PER_DAY });
  });

  it("returns a normal reserved-visit result without inserting after the funnel cap", async () => {
    const fake = createFakeCtx({
      seed: {
        globalGenerationCap: [
          {
            _id: "funnel_full",
            dayKey: `funnel:${DAY_KEY}`,
            count: FUNNEL_VISIT_DAILY_CAP,
            createdAt: NOW,
            updatedAt: NOW
          }
        ]
      }
    });
    vi.spyOn(Date, "now").mockReturnValue(NOW);

    await expect(
      logReservedVisitHandler(fake.ctx, { sessionId: "cs_live_TEST_123" })
    ).resolves.toEqual({
      ok: true,
      sessionId: "cs_live_TEST_123"
    });
    expect(fake.tables.funnelEvents).toHaveLength(0);
  });

  it("persists verified upload metadata on a submitted lead", async () => {
    const fake = createFakeCtx({
      storageMetadata: {
        storage_lead: { contentType: "image/png", size: 1200, sha256: SHA_A }
      }
    });
    vi.spyOn(Date, "now").mockReturnValue(NOW);

    await submitLeadRequestHandler(fake.ctx, {
      contactName: "Buyer",
      contactEmail: "buyer@example.com",
      upload: {
        storageId: "storage_lead",
        originalFileName: "artwork.png",
        contentType: "image/png",
        byteLength: 1200
      }
    });

    expect(fake.tables.leadRequests[0].upload).toEqual({
      storageId: "storage_lead",
      originalFileName: "artwork.png",
      contentType: "image/png",
      byteLength: 1200,
      sourceFingerprint: SHA_A
    });
  });

  it("throws on invalid print metadata before either lead insert path writes", async () => {
    const invalidPrint = {
      aspectRatio: "1:1",
      widthMeters: 99,
      heightMeters: 1,
      label: "invalid"
    };
    const submitFake = createFakeCtx();
    vi.spyOn(Date, "now").mockReturnValue(NOW);

    await expect(
      submitLeadRequestHandler(submitFake.ctx, {
        contactName: "Buyer",
        contactEmail: "buyer@example.com",
        print: invalidPrint
      })
    ).rejects.toThrow("print.widthMeters");
    expect(submitFake.tables.leadRequests).toHaveLength(0);
    expect(submitFake.tables.globalGenerationCap).toHaveLength(0);

    const conceptFake = createFakeCtx();
    await expect(
      startConceptGenerationHandler(conceptFake.ctx, {
        contactEmail: "buyer@example.com",
        conceptPrompt: "Chicago mural",
        print: invalidPrint
      })
    ).rejects.toThrow("print.widthMeters");
    expect(conceptFake.tables.leadRequests).toHaveLength(0);
    expect(conceptFake.tables.globalGenerationCap).toHaveLength(0);
  });

  it("returns a lead-limit failure from concept start without inserting", async () => {
    const folded = makeLeadRateLimitKey("buyer@example.com").slice("ai:".length);
    const fake = createFakeCtx({
      seed: {
        leadRateLimits: [
          {
            _id: "lead_full",
            contactKey: `lead:${folded}`,
            bucket: DAY_KEY,
            count: LEAD_INSERTS_PER_CONTACT_PER_DAY,
            firstRequestAt: NOW,
            updatedAt: NOW
          }
        ],
        globalGenerationCap: [
          {
            _id: "leads_not_full",
            dayKey: `leads:${DAY_KEY}`,
            count: LEADS_DAILY_CAP - 1,
            createdAt: NOW,
            updatedAt: NOW
          }
        ]
      }
    });
    vi.spyOn(Date, "now").mockReturnValue(NOW);

    await expect(
      startConceptGenerationHandler(fake.ctx, {
        contactEmail: "buyer@example.com",
        conceptPrompt: "Chicago mural"
      })
    ).resolves.toEqual({
      ok: false,
      code: "LEAD_LIMIT_REACHED",
      message: expect.stringContaining("Call us")
    });
    expect(fake.tables.leadRequests).toHaveLength(0);
    expect(fake.tables.globalGenerationCap[0].count).toBe(LEADS_DAILY_CAP - 1);
  });
});
