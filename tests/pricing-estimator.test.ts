import { describe, expect, it } from "vitest";

import {
  SELLER_PRICING_CURRENCY,
  calculatePrintAreaSquareFeet,
  estimatePreviewPricing,
  makeSellerPricingState,
  parseUsdRateInputToCents
} from "@/lib/pricing-estimator";

describe("pricing estimator", () => {
  it("converts stored meter dimensions to square feet", () => {
    const areaSquareFeet = calculatePrintAreaSquareFeet({
      widthMeters: 1.524,
      heightMeters: 1.27
    });

    expect(areaSquareFeet).toBeCloseTo(20.833, 3);
  });

  it("rounds internal estimates to USD cents", () => {
    const estimate = estimatePreviewPricing(
      {
        widthMeters: 1,
        heightMeters: 1
      },
      1
    );

    expect(estimate).toMatchObject({
      currency: SELLER_PRICING_CURRENCY,
      pricePerSquareFootCents: 1,
      estimateCents: 11
    });
    expect(estimate.areaSquareFeet).toBeCloseTo(10.7639, 4);
  });

  it("rounds admin-entered USD rates to cents", () => {
    expect(parseUsdRateInputToCents("25")).toBe(2500);
    expect(parseUsdRateInputToCents("$25.4")).toBe(2540);
    expect(parseUsdRateInputToCents("25.455")).toBe(2546);
  });

  it("builds updated USD rate state", () => {
    expect(makeSellerPricingState(4200, 1710000000000)).toEqual({
      currency: "USD",
      pricePerSquareFootCents: 4200,
      updatedAt: 1710000000000
    });
  });
});
