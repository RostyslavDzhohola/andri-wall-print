import {
  AI_CONCEPT_DRAFT_STATUSES,
  type AiConceptDraftStatus
} from "./lead-request-contract";

type LeadRequestResultLike = {
  message?: string;
  aiDraftStatus?: string;
};

export function makeConceptDraftTitle({ businessName }: { businessName?: string | null }) {
  const normalizedBusinessName = businessName?.trim();

  return normalizedBusinessName
    ? `${normalizedBusinessName} concept draft`
    : "Wall print concept draft";
}

export function isAiConceptDraftStatus(value: string | undefined): value is AiConceptDraftStatus {
  return Boolean(value && AI_CONCEPT_DRAFT_STATUSES.includes(value as AiConceptDraftStatus));
}

export function formatAiConceptDraftStatus(value: string | undefined) {
  if (!value) {
    return "No concept draft";
  }

  if (!isAiConceptDraftStatus(value)) {
    return "Concept draft status unavailable";
  }

  switch (value) {
    case "queued":
      return "Concept draft queued";
    case "generating":
      return "Concept draft in progress";
    case "ready":
      return "Concept draft ready";
    case "composite_only":
      return "Concept poster ready";
    case "failed":
      return "Concept draft failed";
    case "rejected":
      return "Concept draft rejected";
    case "rate_limited":
      return "Daily concept draft limit reached";
    case "disabled":
      return "Concept drafting offline";
  }
}

export function formatLeadRequestResultMessage(result: LeadRequestResultLike) {
  if (result.message) {
    return result.message;
  }

  return formatAiConceptDraftStatus(result.aiDraftStatus);
}
