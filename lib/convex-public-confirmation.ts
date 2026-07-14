import {
  normalizePreviewConfirmationNote,
  type PublicPreviewConfirmation
} from "@/lib/preview-confirmation-contract";
import { formatPreviewBundlePrintDimensions } from "@/lib/preview-bundle-contract";
import { readConvexRuntimeUrl } from "@/lib/runtime-env";

type ConvexSuccessResponse = {
  status: "success";
  value: unknown;
};

type ConvexErrorResponse = {
  status: "error";
  errorMessage?: string;
};

type ConvexHttpResponse = ConvexSuccessResponse | ConvexErrorResponse;

type FetchLike = (
  input: string,
  init: {
    method: "POST";
    headers: Record<string, string>;
    body: string;
    cache: "no-store";
  }
) => Promise<Pick<Response, "json" | "ok" | "status">>;

export type PublicPreviewConfirmationResult =
  | {
      status: "confirmed";
      confirmation: PublicPreviewConfirmation;
    }
  | {
      status: "unavailable";
      reason: string;
    };

export type SubmitPublicPreviewConfirmationOptions = {
  convexUrl?: string;
  fetcher?: FetchLike;
};

function normalizeConvexUrl(convexUrl: string) {
  return convexUrl.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function readNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseAreaBasis(value: unknown): PublicPreviewConfirmation["areaBasis"] | null {
  if (!isRecord(value)) {
    return null;
  }

  const kind = readString(value.kind);
  const unit = readString(value.unit);
  const areaValue = readNumber(value.value);

  if (kind !== "selected_dimensions" || (unit !== "square_foot" && unit !== "square_meter") || areaValue === null) {
    return null;
  }

  return {
    kind,
    unit,
    value: areaValue
  };
}

export function parsePublicPreviewConfirmationValue(value: unknown): PublicPreviewConfirmation | null {
  if (!isRecord(value)) {
    return null;
  }

  const id = readString(value.id);
  const publicSlug = readString(value.publicSlug);
  const previewBundleId = readString(value.previewBundleId);
  const selectedArtworkTitle = readString(value.selectedArtworkTitle);
  const selectedPrintLabel = readString(value.selectedPrintLabel);
  const selectedWidthMeters = readNumber(value.selectedWidthMeters);
  const selectedHeightMeters = readNumber(value.selectedHeightMeters);
  const areaBasis = parseAreaBasis(value.areaBasis);
  const buyerNote = normalizePreviewConfirmationNote(value.buyerNote);
  const createdAt = readNumber(value.createdAt);

  if (
    !id ||
    !publicSlug ||
    !previewBundleId ||
    !selectedArtworkTitle ||
    !selectedPrintLabel ||
    selectedWidthMeters === null ||
    selectedHeightMeters === null ||
    !areaBasis ||
    createdAt === null
  ) {
    return null;
  }

  return {
    id,
    publicSlug,
    previewBundleId,
    selectedArtworkTitle,
    selectedPrintLabel: formatPreviewBundlePrintDimensions({
      widthMeters: selectedWidthMeters,
      heightMeters: selectedHeightMeters
    }),
    selectedWidthMeters,
    selectedHeightMeters,
    areaBasis,
    ...(buyerNote ? { buyerNote } : {}),
    createdAt
  };
}

export async function submitPublicPreviewConfirmation(
  input: {
    publicSlug: string;
    buyerNote?: string;
  },
  options: SubmitPublicPreviewConfirmationOptions = {}
): Promise<PublicPreviewConfirmationResult> {
  const convexUrl = options.convexUrl ?? readConvexRuntimeUrl();
  const buyerNote = normalizePreviewConfirmationNote(input.buyerNote);

  if (!convexUrl) {
    return {
      status: "unavailable",
      reason: "This preview cannot accept confirmations right now."
    };
  }

  const response = await (options.fetcher ?? fetch)(`${normalizeConvexUrl(convexUrl)}/api/mutation`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify({
      path: "previewBundles:submitPublicConfirmation",
      args: {
        publicSlug: input.publicSlug,
        ...(buyerNote ? { buyerNote } : {})
      },
      format: "json"
    }),
    cache: "no-store"
  });

  if (!response.ok) {
    return {
      status: "unavailable",
      reason: "This preview cannot accept confirmations right now."
    };
  }

  const body = (await response.json()) as ConvexHttpResponse;

  if (body.status === "error") {
    return {
      status: "unavailable",
      reason: "This preview cannot accept confirmations right now."
    };
  }

  const confirmation = parsePublicPreviewConfirmationValue(body.value);

  if (!confirmation) {
    return {
      status: "unavailable",
      reason: "This preview cannot accept confirmations right now."
    };
  }

  return {
    status: "confirmed",
    confirmation
  };
}
