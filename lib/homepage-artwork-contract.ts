import { z } from "zod";

import {
  normalizeBundleTitle,
  normalizePreviewBundlePrintDisplay,
  PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES,
  validatePreviewBundlePrintSize,
  validatePreviewBundleUpload
} from "./preview-bundle-contract";

const homepagePrintSchema = z
  .object({
    aspectRatio: z.string().trim().min(1).max(32),
    widthMeters: z.number().finite(),
    heightMeters: z.number().finite(),
    label: z.string().max(80)
  })
  .strict();

const homepageCreateInputSchema = z
  .object({
    sourceStorageId: z.string().trim().min(1).max(200),
    originalFileName: z.string().trim().min(1).max(255),
    contentType: z.literal("image/png"),
    byteLength: z.number().int().positive().max(PREVIEW_BUNDLE_MAX_GENERATOR_TEXTURE_BYTES),
    sourceFingerprint: z.string().regex(/^[a-f0-9]{64}$/i),
    title: z.string().trim().min(1).max(160),
    print: homepagePrintSchema
  })
  .strict();

const homepageArtworkPostSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("upload_url") }).strict(),
  z.object({ action: z.literal("create"), input: homepageCreateInputSchema }).strict()
]);

export type HomepageArtworkPostBody = z.infer<typeof homepageArtworkPostSchema>;

export function parseHomepageArtworkPostBody(value: unknown): HomepageArtworkPostBody | null {
  const parsed = homepageArtworkPostSchema.safeParse(value);

  if (!parsed.success) {
    return null;
  }

  if (parsed.data.action === "upload_url") {
    return parsed.data;
  }

  const uploadValidation = validatePreviewBundleUpload(parsed.data.input);
  const printValidation = validatePreviewBundlePrintSize(parsed.data.input.print);

  if (!uploadValidation.ok || !printValidation.ok) {
    return null;
  }

  return {
    action: "create",
    input: {
      ...parsed.data.input,
      title: normalizeBundleTitle(parsed.data.input.title),
      print: normalizePreviewBundlePrintDisplay(parsed.data.input.print)
    }
  };
}
