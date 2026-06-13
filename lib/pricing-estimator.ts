import type { PreviewBundlePrint } from "./preview-bundle-contract";

export const SELLER_PRICING_CURRENCY = "USD";
export const DEFAULT_PRICE_PER_SQUARE_FOOT_CENTS = 0;
export const SQUARE_FEET_PER_SQUARE_METER = 10.763910416709722;

export type SellerPricingState = {
  currency: typeof SELLER_PRICING_CURRENCY;
  pricePerSquareFootCents: number;
  updatedAt: number | null;
};

export type SellerPricingEstimate = {
  currency: typeof SELLER_PRICING_CURRENCY;
  areaSquareFeet: number;
  pricePerSquareFootCents: number;
  estimateCents: number;
};

function assertNonNegativeSafeInteger(fieldName: string, value: number) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer.`);
  }
}

function assertPositiveFiniteNumber(fieldName: string, value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${fieldName} must be a positive finite number.`);
  }
}

export function normalizePricePerSquareFootCents(value: number) {
  assertNonNegativeSafeInteger("pricePerSquareFootCents", value);
  return value;
}

export function makeSellerPricingState(
  pricePerSquareFootCents = DEFAULT_PRICE_PER_SQUARE_FOOT_CENTS,
  updatedAt: number | null = null
): SellerPricingState {
  return {
    currency: SELLER_PRICING_CURRENCY,
    pricePerSquareFootCents: normalizePricePerSquareFootCents(pricePerSquareFootCents),
    updatedAt
  };
}

export function parseUsdRateInputToCents(input: string) {
  const normalized = input.trim().replace(/^\$/, "").replaceAll(",", "");
  const match = normalized.match(/^(\d+)(?:\.(\d+))?$/);

  if (!match) {
    throw new Error("Price per square foot must be a non-negative USD amount.");
  }

  const dollars = Number(match[1]);
  const decimal = match[2] ?? "";
  let cents = Number(decimal.slice(0, 2).padEnd(2, "0"));

  if (!Number.isSafeInteger(dollars) || !Number.isSafeInteger(cents)) {
    throw new Error("Price per square foot is too large.");
  }

  if (Number(decimal[2] ?? "0") >= 5) {
    cents += 1;
  }

  const totalCents = dollars * 100 + cents;
  return normalizePricePerSquareFootCents(totalCents);
}

export function calculatePrintAreaSquareFeet(print: Pick<PreviewBundlePrint, "widthMeters" | "heightMeters">) {
  assertPositiveFiniteNumber("print.widthMeters", print.widthMeters);
  assertPositiveFiniteNumber("print.heightMeters", print.heightMeters);

  return print.widthMeters * print.heightMeters * SQUARE_FEET_PER_SQUARE_METER;
}

export function estimatePreviewPricing(
  print: Pick<PreviewBundlePrint, "widthMeters" | "heightMeters">,
  pricePerSquareFootCents: number
): SellerPricingEstimate {
  const normalizedRate = normalizePricePerSquareFootCents(pricePerSquareFootCents);
  const areaSquareFeet = calculatePrintAreaSquareFeet(print);

  return {
    currency: SELLER_PRICING_CURRENCY,
    areaSquareFeet,
    pricePerSquareFootCents: normalizedRate,
    estimateCents: Math.round(areaSquareFeet * normalizedRate)
  };
}

export function formatUsdCents(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: SELLER_PRICING_CURRENCY
  }).format(normalizePricePerSquareFootCents(cents) / 100);
}

export function formatSquareFeet(areaSquareFeet: number) {
  if (!Number.isFinite(areaSquareFeet) || areaSquareFeet < 0) {
    throw new Error("areaSquareFeet must be a non-negative finite number.");
  }

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  }).format(areaSquareFeet);
}
