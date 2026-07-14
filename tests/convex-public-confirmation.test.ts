import { describe, expect, it } from "vitest";

import { serializeReusablePublicConfirmationForBundle } from "@/convex/previewBundles";
import {
  parsePublicPreviewConfirmationValue,
  submitPublicPreviewConfirmation,
  type SubmitPublicPreviewConfirmationOptions
} from "@/lib/convex-public-confirmation";

function jsonResponse(body: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => body
  };
}

describe("Convex public confirmation adapter", () => {
  it("drops internal estimate fields from buyer confirmation values", () => {
    const parsed = parsePublicPreviewConfirmationValue({
      id: "confirmation_123",
      publicSlug: "p-client-proof",
      previewBundleId: "bundle_123",
      selectedArtworkTitle: "Client Proof",
      selectedPrintLabel: "152 x 127 cm",
      selectedWidthMeters: 1.524,
      selectedHeightMeters: 1.27,
      areaBasis: {
        kind: "selected_dimensions",
        unit: "square_foot",
        value: 20.83
      },
      internalEstimate: {
        amount: 875.03,
        currency: "USD",
        label: "USD 875.03",
        source: "area_rate"
      },
      pricePerSquareFootCents: 4200,
      createdAt: 1710000000000
    });

    expect(JSON.stringify(parsed)).not.toMatch(/price|pricing|rate|estimate/i);
    expect(parsed?.selectedPrintLabel).toBe("5 ft x 4.2 ft");
  });

  it("calls the Convex public HTTP mutation endpoint without auth fields", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const fetcher: SubmitPublicPreviewConfirmationOptions["fetcher"] = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });

      return jsonResponse({
        status: "success",
        value: {
          id: "confirmation_123",
          publicSlug: "p-client-proof",
          previewBundleId: "bundle_123",
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
          createdAt: 1710000000000
        }
      });
    };

    await expect(
      submitPublicPreviewConfirmation(
        {
          publicSlug: "p-client-proof",
          buyerNote: "  Looks   good  "
        },
        {
          convexUrl: "https://steady-otter-123.convex.cloud/",
          fetcher
        }
      )
    ).resolves.toMatchObject({
      status: "confirmed",
      confirmation: {
        publicSlug: "p-client-proof",
        buyerNote: "Looks good"
      }
    });

    expect(calls).toEqual([
      {
        url: "https://steady-otter-123.convex.cloud/api/mutation",
        body: {
          path: "previewBundles:submitPublicConfirmation",
          args: {
            publicSlug: "p-client-proof",
            buyerNote: "Looks good"
          },
          format: "json"
        }
      }
    ]);
  });

  it("reuses an existing public confirmation for the same preview bundle", () => {
    const reusable = serializeReusablePublicConfirmationForBundle(
      {
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
        buyerNote: "Original choice",
        createdAt: 1710000000000
      },
      {
        _id: "bundle_123",
        publicSlug: "p-client-proof"
      }
    );

    expect(reusable).toMatchObject({
      id: "confirmation_123",
      publicSlug: "p-client-proof",
      previewBundleId: "bundle_123",
      buyerNote: "Original choice"
    });
  });
});
