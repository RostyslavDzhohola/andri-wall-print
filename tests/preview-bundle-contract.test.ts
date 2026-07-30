import { describe, expect, it } from "vitest";

import { isWallPrintProSellerIdentity } from "@/lib/seller-admin";
import {
  DEFAULT_PREVIEW_BUNDLE_CROP,
  DEFAULT_PREVIEW_BUNDLE_PRINT,
  PREVIEW_GENERATOR_VERSION,
  createPreviewBundlePublicSlug,
  formatPreviewBundlePrintArea,
  formatPreviewBundlePrintDimensions,
  hashStableString64,
  makePreviewBundlePrintFromDimensions,
  makePreviewBundlePrintFromCentimeters,
  makePreviewBundleIdempotencyKey,
  normalizeBundleTitle,
  validatePreviewBundlePrintDimensions,
  validatePreviewBundlePrintSize,
  validatePreviewBundleUpload,
  validatePreviewSourceUpload
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
    expect(makePreviewBundleIdempotencyKey(input)).toMatch(/^ts-flat-plane-v2:/);
	  });

  it("pins the persisted 64-bit hash vectors", () => {
    expect(hashStableString64("")).toBe("33niihzj4ux45");
    expect(hashStableString64("a")).toBe("2o0ongoiv4rrg");
    expect(hashStableString64("hello")).toBe("2hvyo96lq8v0r");
    expect(hashStableString64("Wall Print Pro")).toBe("ortc15qui2qh");
  });

	  it("keeps AI concept source keys distinct from uploads and samples", () => {
	    const base = {
	      sellerSubject: "public-leads",
	      crop: DEFAULT_PREVIEW_BUNDLE_CROP,
	      print: DEFAULT_PREVIEW_BUNDLE_PRINT,
	      generatorVersion: PREVIEW_GENERATOR_VERSION
	    };

	    const aiKey = makePreviewBundleIdempotencyKey({
	      ...base,
	      source: {
	        kind: "ai_concept" as const,
	        sourceId: "ai:lead_123:draft_123:1200",
	        contentType: "image/png",
	        byteLength: 1200
	      }
	    });

	    expect(aiKey).not.toBe(
	      makePreviewBundleIdempotencyKey({
	        ...base,
	        source: {
	          kind: "upload" as const,
	          sourceId: "sha256:abc",
	          contentType: "image/png",
	          byteLength: 1200
	        }
	      })
	    );
	    expect(aiKey).not.toBe(
	      makePreviewBundleIdempotencyKey({
	        ...base,
	        source: {
	          kind: "sample" as const,
	          sourceId: "chicago-final-1"
	        }
	      })
	    );
	  });

  it("accepts JPEG, PNG, and WebP as source uploads", () => {
    for (const contentType of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validatePreviewSourceUpload({ contentType, byteLength: 1200 })).toEqual({
        ok: true,
        reason: null
      });
    }

    expect(validatePreviewSourceUpload({ contentType: "image/gif", byteLength: 1200 })).toEqual({
      ok: false,
      reason: "Upload must be a JPEG, PNG, or WebP image."
    });
  });

  it("keeps generator input restricted to prepared PNG textures", () => {
    expect(validatePreviewBundleUpload({ contentType: "image/jpeg", byteLength: 1200 })).toEqual({
      ok: false,
      reason: "Prepared upload must be a PNG image before AR generation."
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
      label: "1.5 ft x 3 ft"
    });
    expect(makePreviewBundlePrintFromCentimeters(Number.NaN, 90)).toBe(DEFAULT_PREVIEW_BUNDLE_PRINT);
  });

  it("builds print metadata from inch dimensions and exposes area basis", () => {
    const print = makePreviewBundlePrintFromDimensions({ width: 60, height: 50, unit: "in" });

    expect(print).toEqual({
      aspectRatio: "152.4:127",
      widthMeters: 1.524,
      heightMeters: 1.27,
      label: "5 ft x 4.2 ft"
    });
    expect(formatPreviewBundlePrintDimensions(print)).toBe("5 ft x 4.2 ft");
    expect(formatPreviewBundlePrintArea(print)).toBe("20.8 sq ft");
  });

  it("rejects print dimensions outside the supported AR size bounds", () => {
    expect(validatePreviewBundlePrintDimensions({ width: 11, height: 40, unit: "in" })).toEqual({
      ok: false,
      print: null,
      reason: "Width must be between 12 and 120 in (30 and 305 cm)."
    });

    expect(validatePreviewBundlePrintSize({ widthMeters: 3.5, heightMeters: 1 })).toEqual({
      ok: false,
      reason: "print.widthMeters must be between 0.3 and 3.05 meters."
    });
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
