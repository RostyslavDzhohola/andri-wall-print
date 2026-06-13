import { ConvexError } from "convex/values";

import { validatePreviewBundleUpload } from "../lib/preview-bundle-contract";

type StoredPreviewUploadInput = {
  sourceStorageId: string;
  contentType: string;
  byteLength: number;
  sourceFingerprint?: string | null;
};

export function normalizeUploadSourceFingerprint(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();

  if (!normalized) {
    return null;
  }

  if (!/^[a-f0-9]{64}$/.test(normalized)) {
    throw new ConvexError({
      code: "INVALID_UPLOAD",
      message: "Upload fingerprint could not be verified."
    });
  }

  return normalized;
}

function throwInvalidUpload(message: string): never {
  throw new ConvexError({
    code: "INVALID_UPLOAD",
    message
  });
}

export async function validateStoredPreviewUpload(ctx: any, input: StoredPreviewUploadInput) {
  const metadata = await ctx.db.system.get("_storage", input.sourceStorageId);

  if (!metadata) {
    throwInvalidUpload("Uploaded artwork was not found. Choose the file again.");
  }

  const contentType = metadata.contentType ?? "";
  const byteLength = metadata.size;
  const validation = validatePreviewBundleUpload({
    contentType,
    byteLength
  });

  if (!validation.ok) {
    throwInvalidUpload(validation.reason ?? "Upload is not supported.");
  }

  if (input.contentType !== contentType || input.byteLength !== byteLength) {
    throwInvalidUpload("Uploaded artwork metadata did not match the stored file. Choose the file again.");
  }

  const sourceFingerprint = normalizeUploadSourceFingerprint(input.sourceFingerprint);
  const storedFingerprint = normalizeUploadSourceFingerprint(metadata.sha256);

  if (!storedFingerprint) {
    throwInvalidUpload("Uploaded artwork fingerprint could not be verified. Choose the file again.");
  }

  if (sourceFingerprint && storedFingerprint !== sourceFingerprint) {
    throwInvalidUpload("Uploaded artwork fingerprint did not match the stored file. Choose the file again.");
  }

  return {
    contentType,
    byteLength,
    sourceFingerprint: storedFingerprint
  };
}
