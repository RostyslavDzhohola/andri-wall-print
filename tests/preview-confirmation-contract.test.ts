import { describe, expect, it } from "vitest";

import {
  buildBuyerPreviewShareText,
  makePreviewConfirmationAreaBasis,
  normalizePreviewConfirmationNote
} from "@/lib/preview-confirmation-contract";

describe("preview confirmation contract", () => {
  it("builds a buyer-safe share summary with image and dimensions only", () => {
    const summary = buildBuyerPreviewShareText({
      brandName: "Wall Print Pro",
      artworkTitle: "Client Proof",
      dimensionsLabel: "5 ft x 4.2 ft",
      posterUrl: "https://example.com/poster.png",
      previewUrl: "https://example.com/preview/p-client-proof"
    });

    expect(summary).toContain("Image: https://example.com/poster.png");
    expect(summary).toContain("Dimensions: 5 ft x 4.2 ft");
    expect(summary).not.toMatch(/price|pricing|rate|estimate|\$/i);
  });

  it("normalizes notes and stores the selected-dimensions area basis", () => {
    expect(normalizePreviewConfirmationNote("  Looks   good  ")).toBe("Looks good");
    expect(makePreviewConfirmationAreaBasis({ widthMeters: 1.524, heightMeters: 1.27, label: "5 ft x 4.2 ft" })).toEqual({
      kind: "selected_dimensions",
      unit: "square_foot",
      value: 20.83
    });
  });
});
