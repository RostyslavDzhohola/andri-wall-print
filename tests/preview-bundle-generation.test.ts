import { describe, expect, it } from "vitest";

import {
  GENERATION_GENERATING_STALE_MS,
  GENERATION_UPLOADED_STALE_MS,
  selectStaleGenerationRecovery,
  serializeGenerationInput
} from "@/convex/previewBundles";
import { DEFAULT_PREVIEW_BUNDLE_PRINT, PREVIEW_GENERATOR_VERSION } from "@/lib/preview-bundle-contract";

const NOW = 1_800_000_000_000;

function uploadBundle(overrides: Record<string, unknown> = {}): any {
  return {
    _id: "bundle_123",
    publicSlug: "p-abc123",
    title: "Client proof",
    status: "uploaded",
    source: {
      kind: "upload",
      storageId: "storage_123",
      originalFileName: "client-art.png",
      contentType: "image/png",
      byteLength: 123_456,
      sourceFingerprint: "source-fingerprint"
    },
    print: DEFAULT_PREVIEW_BUNDLE_PRINT,
    generatorVersion: PREVIEW_GENERATOR_VERSION,
    job: {
      attempt: 1,
      scheduledAt: NOW
    },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides
  };
}

function aiConceptBundle(overrides: Record<string, unknown> = {}): any {
  return uploadBundle({
    source: {
      kind: "ai_concept",
      storageId: "storage_ai_123",
      originalFileName: "concept.png",
      contentType: "image/png",
      byteLength: 99_000,
      leadRequestId: "lead_123",
      aiConceptDraftId: "draft_123",
      prompt: "A skyline wall graphic"
    },
    ...overrides
  });
}

describe("preview bundle generation jobs", () => {
  it("serializes uploaded bundle generation input without internal source fields", () => {
    const input = serializeGenerationInput(uploadBundle());

    expect(input).toEqual({
      bundleId: "bundle_123",
      publicSlug: "p-abc123",
      title: "Client proof",
      print: DEFAULT_PREVIEW_BUNDLE_PRINT,
      source: {
        storageId: "storage_123",
        originalFileName: "client-art.png",
        contentType: "image/png",
        byteLength: 123_456
      },
      generatorVersion: PREVIEW_GENERATOR_VERSION,
      attempt: 1
    });
    expect(JSON.stringify(input)).not.toMatch(/kind|sourceFingerprint/);
  });

  it("serializes AI concept generation input without prompt or lead fields", () => {
    const input = serializeGenerationInput(aiConceptBundle());

    expect(input).toEqual({
      bundleId: "bundle_123",
      publicSlug: "p-abc123",
      title: "Client proof",
      print: DEFAULT_PREVIEW_BUNDLE_PRINT,
      source: {
        storageId: "storage_ai_123",
        originalFileName: "concept.png",
        contentType: "image/png",
        byteLength: 99_000
      },
      generatorVersion: PREVIEW_GENERATOR_VERSION,
      attempt: 1
    });
    expect(JSON.stringify(input)).not.toMatch(/prompt|leadRequestId|aiConceptDraftId/);
  });

  it("returns null for non-uploaded or sample bundle generation input", () => {
    for (const status of ["ready", "failed", "rejected", "revoked", "generating", "validating"]) {
      expect(serializeGenerationInput(uploadBundle({ status }))).toBeNull();
    }

    expect(
      serializeGenerationInput(
        uploadBundle({
          source: {
            kind: "sample",
            sampleId: "chicago-final-1"
          }
        })
      )
    ).toBeNull();
  });

  it("retries stale AI concept AR generation like uploaded artwork", () => {
    expect(
      selectStaleGenerationRecovery(
        aiConceptBundle({
          job: {
            attempt: 1,
            scheduledAt: NOW - GENERATION_UPLOADED_STALE_MS - 1
          }
        }),
        NOW
      )
    ).toEqual({ action: "retry", attempt: 2 });
  });

  it("ignores fresh uploaded jobs", () => {
    expect(
      selectStaleGenerationRecovery(
        uploadBundle({
          job: {
            attempt: 1,
            scheduledAt: NOW - GENERATION_UPLOADED_STALE_MS + 1
          }
        }),
        NOW
      )
    ).toEqual({ action: "ignore" });
  });

  it("retries old uploaded jobs", () => {
    expect(
      selectStaleGenerationRecovery(
        uploadBundle({
          job: {
            attempt: 1,
            scheduledAt: NOW - GENERATION_UPLOADED_STALE_MS - 1
          }
        }),
        NOW
      )
    ).toEqual({ action: "retry", attempt: 2 });
  });

  it("retries old generating jobs", () => {
    expect(
      selectStaleGenerationRecovery(
        uploadBundle({
          status: "generating",
          job: {
            attempt: 1,
            scheduledAt: NOW - GENERATION_GENERATING_STALE_MS - 5_000,
            startedAt: NOW - GENERATION_GENERATING_STALE_MS - 1
          }
        }),
        NOW
      )
    ).toEqual({ action: "retry", attempt: 2 });
  });

  it("fails stale jobs once attempt 3 has already been scheduled", () => {
    const decision = selectStaleGenerationRecovery(
      uploadBundle({
        job: {
          attempt: 3,
          scheduledAt: NOW - GENERATION_UPLOADED_STALE_MS - 1
        }
      }),
      NOW
    );

    expect(decision).toMatchObject({
      action: "fail",
      attempt: 3
    });
    expect(decision.action === "fail" ? decision.reason : "").toMatch(/3 attempts/);
  });
});
