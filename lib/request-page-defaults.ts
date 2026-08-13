import { AR_SAMPLE_IDS, getArSample, type ArSample } from "./ar-sample";
import {
  LEAD_CONCEPT_PROMPT_MAX_LENGTH,
  isLeadRequestIntent,
  type LeadRequestIntent
} from "./lead-request-contract";

export type RequestSearchParamsInput = {
  intent?: string | string[];
  conceptPrompt?: string | string[];
  designId?: string | string[];
  gallerySlug?: string | string[];
  focus?: string | string[];
};

export type RequestDesignContext = {
  id: string;
  title: string;
  description: string;
  print: ArSample["print"];
};

export type RequestPageDefaults = {
  defaultIntent: LeadRequestIntent;
  defaultConceptPrompt?: string;
  defaultDesignContext?: RequestDesignContext;
  focusUpload: boolean;
};

function firstSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizeSearchText(value: string | undefined, maxLength: number) {
  const normalized = (value ?? "").trim().replace(/\s+/g, " ");

  return normalized ? normalized.slice(0, maxLength) : undefined;
}

export function makeDesignConceptPrompt(design: RequestDesignContext) {
  return normalizeSearchText(
    `Use the "${design.title}" Wall Print Pro design as the starting point at ${design.print.label}. ${design.description}`,
    LEAD_CONCEPT_PROMPT_MAX_LENGTH
  );
}

export function resolveRequestDesignContext(designId: string | string[] | undefined): RequestDesignContext | undefined {
  const normalizedDesignId = normalizeSearchText(firstSearchParam(designId), 120);

  if (!normalizedDesignId || !AR_SAMPLE_IDS.includes(normalizedDesignId)) {
    return undefined;
  }

  const sample = getArSample(normalizedDesignId);

  return {
    id: sample.id,
    title: sample.title,
    description: sample.description,
    print: sample.print
  };
}

export function readRequestGallerySlug(value: string | string[] | undefined) {
  return normalizeSearchText(firstSearchParam(value), 160);
}

export function resolveRequestPageDefaults(
  searchParams: RequestSearchParamsInput | undefined,
  publishedGalleryDesign?: RequestDesignContext
): RequestPageDefaults {
  const intent = firstSearchParam(searchParams?.intent);
  const defaultIntent = intent && isLeadRequestIntent(intent) ? intent : "concept";
  const requestedGallerySlug = readRequestGallerySlug(searchParams?.gallerySlug);
  const defaultDesignContext = requestedGallerySlug
    ? publishedGalleryDesign?.id === requestedGallerySlug
      ? publishedGalleryDesign
      : undefined
    : resolveRequestDesignContext(searchParams?.designId);
  const suppliedConceptPrompt = normalizeSearchText(
    firstSearchParam(searchParams?.conceptPrompt),
    LEAD_CONCEPT_PROMPT_MAX_LENGTH
  );
  const defaultConceptPrompt = requestedGallerySlug
    ? defaultDesignContext
      ? makeDesignConceptPrompt(defaultDesignContext)
      : undefined
    : suppliedConceptPrompt ?? (defaultDesignContext ? makeDesignConceptPrompt(defaultDesignContext) : undefined);

  const focusUpload = firstSearchParam(searchParams?.focus) === "upload";

  return {
    defaultIntent,
    focusUpload,
    ...(defaultConceptPrompt ? { defaultConceptPrompt } : {}),
    ...(defaultDesignContext ? { defaultDesignContext } : {})
  };
}
