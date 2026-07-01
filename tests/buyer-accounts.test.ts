import { describe, expect, it } from "vitest";

import { serializeBuyerDashboardPreview } from "@/convex/buyerAccounts";
import { getAccountDashboardPath } from "@/lib/account-routing";
import { isWallPrintProSellerIdentity } from "@/lib/seller-admin";

describe("buyer account contracts", () => {
  it("keeps dashboard previews scoped to the buyer subject", () => {
    const claim = {
      _id: "claim_123",
      buyerSubject: "buyer_1",
      publicSlug: "p-client-proof",
      previewBundleId: "bundle_123",
      source: "public_preview" as const,
      createdAt: 1710000000000,
      updatedAt: 1710000000000
    };
    const bundle = {
      _id: "bundle_123",
      publicSlug: "p-client-proof",
      title: "Client Proof",
      description: "Client proof",
      status: "ready",
      print: {
        aspectRatio: "6:5",
        widthMeters: 1.524,
        heightMeters: 1.27,
        label: "152 x 127 cm"
      },
      source: { kind: "sample" as const },
      createdVia: "seller" as const,
      pricing: {
        pricePerSquareFootCents: 4200,
        estimateCents: 87500
      }
    };

    expect(
      serializeBuyerDashboardPreview({
        buyerSubject: "buyer_2",
        claim,
        bundle
      })
    ).toBeNull();
  });

  it("serializes claimed previews without seller pricing fields", () => {
    const serialized = serializeBuyerDashboardPreview({
      buyerSubject: "buyer_1",
      claim: {
        _id: "claim_123",
        buyerSubject: "buyer_1",
        buyerEmail: "buyer@example.com",
        publicSlug: "p-client-proof",
        previewBundleId: "bundle_123",
        confirmationId: "confirmation_123",
        source: "confirmation",
        createdAt: 1710000000000,
        updatedAt: 1710000100000
      },
      bundle: {
        _id: "bundle_123",
        publicSlug: "p-client-proof",
        title: "Client Proof",
        description: "Client proof",
        status: "ready",
        print: {
          aspectRatio: "6:5",
          widthMeters: 1.524,
          heightMeters: 1.27,
          label: "152 x 127 cm"
        },
        source: { kind: "upload" },
        createdVia: "builder"
      },
      posterUrl: "https://example.com/poster.png",
      confirmation: {
        _id: "confirmation_123",
        previewBundleId: "bundle_123",
        publicSlug: "p-client-proof",
        selectedArtworkTitle: "Client Proof",
        selectedPrintLabel: "152 x 127 cm",
        selectedWidthMeters: 1.524,
        selectedHeightMeters: 1.27,
        areaBasis: {
          kind: "selected_dimensions",
          unit: "square_foot",
          value: 20.83
        },
        buyerNote: "Looks good",
        createdAt: 1710000050000
      }
    });

    expect(serialized).toMatchObject({
      publicSlug: "p-client-proof",
      sourceKind: "upload",
      createdVia: "builder",
      sourceLabel: "Uploaded through invite",
      confirmation: {
        selectedPrintLabel: "5 ft x 4.2 ft",
        buyerNote: "Looks good"
      },
      print: {
        label: "5 ft x 4.2 ft"
      }
    });
    expect(JSON.stringify(serialized)).not.toMatch(/price|pricing|rate|estimate|\$/i);
  });

  it("does not treat ordinary buyer identities as admin allowlist members", () => {
    const env = {
      WALL_PRINT_PRO_SELLER_EMAILS: "seller@wallprintpro.com",
      WALL_PRINT_PRO_SELLER_USER_IDS: "user_seller"
    };

    expect(isWallPrintProSellerIdentity({ subject: "buyer_1", email: "buyer@example.com" }, env)).toBe(false);
    expect(isWallPrintProSellerIdentity({ subject: "user_seller", email: "seller@wallprintpro.com" }, env)).toBe(true);
  });

  it("routes sellers to admin and ordinary buyers to the buyer dashboard", () => {
    const env = {
      WALL_PRINT_PRO_SELLER_EMAILS: "seller@wallprintpro.com",
      WALL_PRINT_PRO_SELLER_USER_IDS: "user_seller"
    };

    expect(getAccountDashboardPath({ subject: "buyer_1", email: "buyer@example.com" }, env)).toBe("/account");
    expect(getAccountDashboardPath({ subject: "user_seller", email: "buyer@example.com" }, env)).toBe("/admin");
    expect(getAccountDashboardPath({ subject: "buyer_1", email: "seller@wallprintpro.com" }, env)).toBe("/admin");
  });
});
