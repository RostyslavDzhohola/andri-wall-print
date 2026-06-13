import { describe, expect, it } from "vitest";

import { validateStoredPreviewUpload } from "@/convex/uploadValidation";

const PNG_SHA = "a".repeat(64);

function ctxWithStoredUpload(metadata: { contentType?: string; size: number; sha256: string } | null) {
  return {
    db: {
      system: {
        get: async () => metadata
      }
    }
  };
}

describe("stored preview upload validation", () => {
  it("uses stored Convex metadata for content type, size, and fingerprint", async () => {
    await expect(
      validateStoredPreviewUpload(ctxWithStoredUpload({ contentType: "image/png", size: 1200, sha256: PNG_SHA }), {
        sourceStorageId: "storage_123",
        contentType: "image/png",
        byteLength: 1200,
        sourceFingerprint: PNG_SHA
      })
    ).resolves.toEqual({
      contentType: "image/png",
      byteLength: 1200,
      sourceFingerprint: PNG_SHA
    });
  });

  it("rejects client metadata that does not match the stored file", async () => {
    await expect(
      validateStoredPreviewUpload(ctxWithStoredUpload({ contentType: "image/png", size: 1200, sha256: PNG_SHA }), {
        sourceStorageId: "storage_123",
        contentType: "image/png",
        byteLength: 999,
        sourceFingerprint: PNG_SHA
      })
    ).rejects.toThrow("Uploaded artwork metadata did not match the stored file. Choose the file again.");
  });

  it("rejects stored files that are not prepared PNG textures", async () => {
    await expect(
      validateStoredPreviewUpload(ctxWithStoredUpload({ contentType: "image/jpeg", size: 1200, sha256: PNG_SHA }), {
        sourceStorageId: "storage_123",
        contentType: "image/jpeg",
        byteLength: 1200,
        sourceFingerprint: PNG_SHA
      })
    ).rejects.toThrow("Prepared upload must be a PNG image before AR generation.");
  });

  it("rejects fingerprint mismatches", async () => {
    await expect(
      validateStoredPreviewUpload(ctxWithStoredUpload({ contentType: "image/png", size: 1200, sha256: PNG_SHA }), {
        sourceStorageId: "storage_123",
        contentType: "image/png",
        byteLength: 1200,
        sourceFingerprint: "b".repeat(64)
      })
    ).rejects.toThrow("Uploaded artwork fingerprint did not match the stored file. Choose the file again.");
  });
});
