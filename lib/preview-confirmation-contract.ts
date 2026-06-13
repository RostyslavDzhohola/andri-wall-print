export const PREVIEW_CONFIRMATION_NOTE_MAX_LENGTH = 800;
const SQUARE_FEET_PER_SQUARE_METER = 10.763910416709722;

export type PreviewConfirmationAreaBasis = {
  kind: "selected_dimensions";
  unit: "square_foot" | "square_meter";
  value: number;
};

export type PreviewConfirmationPrint = {
  widthMeters: number;
  heightMeters: number;
  label: string;
};

export type PublicPreviewConfirmation = {
  id: string;
  publicSlug: string;
  previewBundleId: string;
  selectedArtworkTitle: string;
  selectedPrintLabel: string;
  selectedWidthMeters: number;
  selectedHeightMeters: number;
  areaBasis: PreviewConfirmationAreaBasis;
  buyerNote?: string;
  createdAt: number;
};

export type InternalAreaPricing = {
  ratePerSquareFoot?: number;
  ratePerSquareMeter?: number;
  currency: string;
};

export type PreviewConfirmationInternalEstimate = {
  amount: number;
  currency: string;
  label: string;
  source: "area_rate";
};

function compactWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizePreviewConfirmationNote(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  const normalized = compactWhitespace(value);

  if (!normalized) {
    return undefined;
  }

  return normalized.slice(0, PREVIEW_CONFIRMATION_NOTE_MAX_LENGTH);
}

export function makePreviewConfirmationAreaBasis(print: PreviewConfirmationPrint): PreviewConfirmationAreaBasis {
  return {
    kind: "selected_dimensions",
    unit: "square_foot",
    value: Number((print.widthMeters * print.heightMeters * SQUARE_FEET_PER_SQUARE_METER).toFixed(2))
  };
}

export function getPreviewConfirmationAreaSquareFeet(areaBasis: PreviewConfirmationAreaBasis) {
  if (areaBasis.unit === "square_foot") {
    return areaBasis.value;
  }

  return areaBasis.value * SQUARE_FEET_PER_SQUARE_METER;
}

export function formatPreviewConfirmationAreaBasis(areaBasis: PreviewConfirmationAreaBasis) {
  return `${getPreviewConfirmationAreaSquareFeet(areaBasis).toFixed(2)} sq ft`;
}

export function makeInternalEstimate(
  areaBasis: PreviewConfirmationAreaBasis,
  pricing: InternalAreaPricing | null | undefined
): PreviewConfirmationInternalEstimate | undefined {
  const ratePerSquareFoot =
    typeof pricing?.ratePerSquareFoot === "number"
      ? pricing.ratePerSquareFoot
      : typeof pricing?.ratePerSquareMeter === "number"
        ? pricing.ratePerSquareMeter / SQUARE_FEET_PER_SQUARE_METER
        : undefined;
  const normalizedRate = ratePerSquareFoot ?? 0;

  if (!pricing || !Number.isFinite(normalizedRate) || normalizedRate <= 0 || !pricing.currency.trim()) {
    return undefined;
  }

  const amount = Number((getPreviewConfirmationAreaSquareFeet(areaBasis) * normalizedRate).toFixed(2));
  const currency = pricing.currency.trim().toUpperCase();

  return {
    amount,
    currency,
    label: `${currency} ${amount.toFixed(2)}`,
    source: "area_rate"
  };
}

export function buildBuyerPreviewShareText(input: {
  brandName: string;
  artworkTitle: string;
  dimensionsLabel: string;
  posterUrl: string;
  previewUrl: string;
}) {
  return [
    `${input.brandName} preview`,
    `Artwork: ${input.artworkTitle}`,
    `Dimensions: ${input.dimensionsLabel}`,
    `Image: ${input.posterUrl}`,
    `Preview: ${input.previewUrl}`
  ].join("\n");
}
