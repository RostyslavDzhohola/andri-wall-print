import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  completeModeration,
  enqueueReadyAiConcept,
  getPublishedBySlug,
  listPublished,
  recordModerationFailure
} from "@/convex/gallery";

type Row = Record<string, any> & { _id: string };

const originalEnv = { ...process.env };

function makeReadySeed(consented = true) {
  const assetStorageIds = { poster: "poster_1", glb: "glb_1", usdz: "usdz_1" };
  const assetMeta = {
    poster: { fileName: "concept.png", contentType: "image/png", byteLength: 10 },
    glb: { fileName: "concept.glb", contentType: "model/gltf-binary", byteLength: 20 },
    usdz: { fileName: "concept.usdz", contentType: "model/vnd.usdz+zip", byteLength: 30 }
  };

  return {
    aiConceptDrafts: [
      {
        _id: "draft_1",
        leadRequestId: "lead_private_1",
        prompt: "private raw prompt",
        providerMetadata: "private provider data",
        status: "ready",
        generatedImageStorageId: "poster_1",
        generatedImageMeta: { fileName: "concept.png", contentType: "image/png", byteLength: 10 },
        assetStorageIds,
        assetMeta,
        previewBundleId: "bundle_1",
        ...(consented
          ? {
              galleryPublicationConsent: true,
              galleryConsentVersion: "2026-08-05",
              galleryConsentRecordedAt: 100
            }
          : {})
      }
    ],
    previewBundles: [
      {
        _id: "bundle_1",
        aiConceptDraftId: "draft_1",
        publicSlug: "safe-public-slug",
        status: "ready",
        print: { aspectRatio: "1:1", widthMeters: 1, heightMeters: 1, label: "1 m square" },
        assetStorageIds,
        assetMeta
      }
    ]
  };
}

function createFakeCtx(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = {
    galleryEntries: [],
    aiConceptDrafts: [],
    previewBundles: [],
    ...seed
  };
  const scheduled: Array<{ delay: number; fn: unknown; args: any }> = [];
  let nextId = 1;

  const find = (id: string) => Object.values(tables).flat().find((row) => row._id === id) ?? null;

  const ctx = {
    db: {
      query(tableName: string) {
        const filters: Array<{ field: string; value: unknown }> = [];
        let descending = false;
        const chain = {
          withIndex(_name: string, build: (q: any) => unknown) {
            const q = {
              eq(field: string, value: unknown) {
                filters.push({ field, value });
                return q;
              }
            };
            build(q);
            return chain;
          },
          order(direction: string) {
            descending = direction === "desc";
            return chain;
          },
          async unique() {
            const matches = (tables[tableName] ?? []).filter((row) =>
              filters.every((filter) => row[filter.field] === filter.value)
            );
            if (matches.length > 1) throw new Error("Expected unique row");
            return matches[0] ?? null;
          },
          async paginate({ numItems }: { numItems: number; cursor: string | null }) {
            const rows = (tables[tableName] ?? [])
              .filter((row) => filters.every((filter) => row[filter.field] === filter.value))
              .sort((a, b) => (descending ? b.createdAt - a.createdAt : a.createdAt - b.createdAt));
            return { page: rows.slice(0, numItems), continueCursor: null, isDone: true };
          }
        };
        return chain;
      },
      async get(id: string) {
        return find(id);
      },
      async insert(tableName: string, value: Record<string, unknown>) {
        const id = `${tableName}_${nextId++}`;
        tables[tableName] ??= [];
        tables[tableName].push({ _id: id, ...value });
        return id;
      },
      async patch(id: string, value: Record<string, unknown>) {
        const row = find(id);
        if (!row) throw new Error(`Missing ${id}`);
        Object.assign(row, value);
      }
    },
    scheduler: {
      async runAfter(delay: number, fn: unknown, args: any) {
        scheduled.push({ delay, fn, args });
      }
    },
    storage: {
      async getUrl(id: string) {
        return `https://storage.example/${id}`;
      }
    }
  };

  return { ctx, tables, scheduled };
}

describe("community gallery catalog", () => {
  beforeEach(() => {
    process.env.WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED = "1";
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("does not backfill legacy drafts without consent", async () => {
    const fake = createFakeCtx(makeReadySeed(false));

    await (enqueueReadyAiConcept as any)._handler(fake.ctx, { draftId: "draft_1" });

    expect(fake.tables.galleryEntries).toHaveLength(0);
    expect(fake.scheduled).toHaveLength(0);
  });

  it("creates one pending entry per consented AR-ready draft and enqueues moderation idempotently", async () => {
    const fake = createFakeCtx(makeReadySeed(true));

    const first = await (enqueueReadyAiConcept as any)._handler(fake.ctx, { draftId: "draft_1" });
    const second = await (enqueueReadyAiConcept as any)._handler(fake.ctx, { draftId: "draft_1" });

    expect(second).toBe(first);
    expect(fake.tables.galleryEntries).toHaveLength(1);
    expect(fake.tables.galleryEntries[0]).toMatchObject({
      aiConceptDraftId: "draft_1",
      previewBundleId: "bundle_1",
      publicSlug: expect.stringMatching(/^g-[a-f0-9]{48}$/),
      status: "pending",
      moderationOutcome: "pending",
      consentVersion: "2026-08-05"
    });
    expect(fake.tables.galleryEntries[0].publicSlug).not.toBe("safe-public-slug");
    expect(fake.tables.galleryEntries[0].assetMeta).toMatchObject({
      poster: { fileName: "community-ai-concept.png" },
      glb: { fileName: "community-ai-concept.glb" },
      usdz: { fileName: "community-ai-concept.usdz" }
    });
    expect(fake.scheduled).toHaveLength(1);
    expect(fake.scheduled[0]).toMatchObject({ delay: 0, args: { entryId: first, attempt: 1 } });
  });

  it("publishes only an unflagged result and exposes no private fields", async () => {
    const fake = createFakeCtx(makeReadySeed(true));
    const entryId = await (enqueueReadyAiConcept as any)._handler(fake.ctx, { draftId: "draft_1" });

    await (completeModeration as any)._handler(fake.ctx, {
      entryId,
      attempt: 1,
      flagged: false,
      flaggedCategories: []
    });
    const result = await (listPublished as any)._handler(fake.ctx, {});
    const serialized = JSON.stringify(result);

    expect(result.page).toHaveLength(1);
    expect(result.page[0]).toMatchObject({
      id: fake.tables.galleryEntries[0].publicSlug,
      sourceKind: "community_ai",
      title: "Community AI concept"
    });
    for (const privateValue of ["private raw prompt", "private provider data", "lead_private_1", "draft_1", "bundle_1", "safe-public-slug"]) {
      expect(serialized).not.toContain(privateValue);
    }
  });

  it("holds flagged results and immediately excludes hidden entries", async () => {
    const flagged = createFakeCtx(makeReadySeed(true));
    const flaggedId = await (enqueueReadyAiConcept as any)._handler(flagged.ctx, { draftId: "draft_1" });
    await (completeModeration as any)._handler(flagged.ctx, {
      entryId: flaggedId,
      attempt: 1,
      flagged: true,
      flaggedCategories: ["violence"]
    });
    expect(flagged.tables.galleryEntries[0]).toMatchObject({ status: "held", moderationOutcome: "flagged" });
    await expect((listPublished as any)._handler(flagged.ctx, {})).resolves.toMatchObject({ page: [] });

    const hidden = createFakeCtx(makeReadySeed(true));
    const hiddenId = await (enqueueReadyAiConcept as any)._handler(hidden.ctx, { draftId: "draft_1" });
    await (completeModeration as any)._handler(hidden.ctx, {
      entryId: hiddenId,
      attempt: 1,
      flagged: false,
      flaggedCategories: []
    });
    await hidden.ctx.db.patch(hiddenId, { status: "hidden", hiddenAt: 999 });
    await expect(
      (getPublishedBySlug as any)._handler(hidden.ctx, { slug: hidden.tables.galleryEntries[0].publicSlug })
    ).resolves.toBeNull();
  });

  it("retries moderation after five and thirty minutes, then holds the entry", async () => {
    const fake = createFakeCtx(makeReadySeed(true));
    const entryId = await (enqueueReadyAiConcept as any)._handler(fake.ctx, { draftId: "draft_1" });
    fake.scheduled.length = 0;

    await (recordModerationFailure as any)._handler(fake.ctx, { entryId, attempt: 1 });
    await (recordModerationFailure as any)._handler(fake.ctx, { entryId, attempt: 2 });
    await (recordModerationFailure as any)._handler(fake.ctx, { entryId, attempt: 3 });

    expect(fake.scheduled.map((job) => job.delay)).toEqual([5 * 60_000, 30 * 60_000]);
    expect(fake.tables.galleryEntries[0]).toMatchObject({
      status: "held",
      moderationOutcome: "error",
      moderationAttempts: 3
    });
  });

  it("fails public reads closed when the kill switch is disabled", async () => {
    const fake = createFakeCtx(makeReadySeed(true));
    process.env.WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED = "0";

    await expect((listPublished as any)._handler(fake.ctx, {})).resolves.toEqual({
      page: [],
      continueCursor: null,
      isDone: true
    });
    await expect(
      (getPublishedBySlug as any)._handler(fake.ctx, { slug: "safe-public-slug" })
    ).resolves.toBeNull();
  });

  it("holds an in-flight moderation instead of publishing after the kill switch is disabled", async () => {
    const fake = createFakeCtx(makeReadySeed(true));
    const entryId = await (enqueueReadyAiConcept as any)._handler(fake.ctx, { draftId: "draft_1" });
    process.env.WALL_PRINT_PRO_COMMUNITY_GALLERY_ENABLED = "0";

    await (completeModeration as any)._handler(fake.ctx, {
      entryId,
      attempt: 1,
      flagged: false,
      flaggedCategories: []
    });

    expect(fake.tables.galleryEntries[0]).toMatchObject({ status: "held", moderationOutcome: "error" });
    expect(fake.tables.galleryEntries[0]).not.toHaveProperty("publishedAt");
  });
});
