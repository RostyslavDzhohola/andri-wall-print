import { describe, expect, it } from "vitest";

import { isWallPrintProSellerIdentity } from "@/convex/sellerAuth";
import {
  DEFAULT_PREVIEW_BUNDLE_CROP,
  DEFAULT_PREVIEW_BUNDLE_PRINT,
  PREVIEW_GENERATOR_VERSION,
  createPreviewBundlePublicSlug,
  makePreviewBundlePrintFromCentimeters,
  makePreviewBundleIdempotencyKey,
  normalizeBundleTitle,
  validatePreviewBundleUpload
} from "@/lib/preview-bundle-contract";

describe("preview bundle contract", () => {
  it("keeps idempotency keys stable for equivalent bundle inputs", () => {
    const input = {
      sellerSubject: "user_123",
      source: {
        kind: "sample" as const,
        sourceId: "chicago-final-1"
      },
      crop: DEFAULT_PREVIEW_BUNDLE_CROP,
      print: DEFAULT_PREVIEW_BUNDLE_PRINT,
      generatorVersion: PREVIEW_GENERATOR_VERSION
    };

    expect(makePreviewBundleIdempotencyKey(input)).toBe(makePreviewBundleIdempotencyKey({ ...input }));
  });

  it("rejects non-PNG uploads in the current generator slice", () => {
    expect(validatePreviewBundleUpload({ contentType: "image/jpeg", byteLength: 1200 })).toEqual({
      ok: false,
      reason: "Upload must be a PNG image for the current wall preview workflow."
    });

    expect(validatePreviewBundleUpload({ contentType: "image/png", byteLength: 1200 })).toEqual({
      ok: true,
      reason: null
    });
  });

  it("normalizes titles and creates random public slugs", () => {
    expect(normalizeBundleTitle("  Client   Proof  ")).toBe("Client Proof");
    expect(createPreviewBundlePublicSlug(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]))).toBe(
      "p-000102030405060708090a0b"
    );
    expect(createPreviewBundlePublicSlug(new Uint8Array(12).fill(255))).toMatch(/^p-[a-f0-9]{24}$/);
  });

  it("builds print metadata from confirmed centimeter dimensions", () => {
    expect(makePreviewBundlePrintFromCentimeters(45, 90)).toEqual({
      aspectRatio: "45:90",
      widthMeters: 0.45,
      heightMeters: 0.9,
      label: "45 x 90 cm"
    });
    expect(makePreviewBundlePrintFromCentimeters(Number.NaN, 90)).toBe(DEFAULT_PREVIEW_BUNDLE_PRINT);
  });

  it("allowlists admins by Clerk subject or email", () => {
    expect(
      isWallPrintProSellerIdentity(
        { subject: "user_123", email: "admin@example.com" },
        {
          WALL_PRINT_PRO_SELLER_USER_IDS: "user_123",
          WALL_PRINT_PRO_SELLER_EMAILS: ""
        }
      )
    ).toBe(true);

    expect(
      isWallPrintProSellerIdentity(
        { subject: "user_456", email: "admin@example.com" },
        {
          WALL_PRINT_PRO_SELLER_USER_IDS: "",
          WALL_PRINT_PRO_SELLER_EMAILS: "admin@example.com"
        }
      )
    ).toBe(true);

    expect(
      isWallPrintProSellerIdentity(
        { subject: "user_456", email: "lead@example.com" },
        {
          WALL_PRINT_PRO_SELLER_USER_IDS: "user_123",
          WALL_PRINT_PRO_SELLER_EMAILS: "admin@example.com"
        }
      )
    ).toBe(false);
  });

  it("allows an admin email from a comma-separated admin allowlist", () => {
    expect(
      isWallPrintProSellerIdentity(
        { subject: "user_789", email: "admin2@example.com" },
        {
          WALL_PRINT_PRO_SELLER_USER_IDS: "",
          WALL_PRINT_PRO_SELLER_EMAILS: "admin1@example.com,admin2@example.com"
        }
      )
    ).toBe(true);
  });
});
