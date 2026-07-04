export const LEAD_REQUEST_INTENTS = ["contact", "concept", "reserve"] as const;
export const LEAD_REQUEST_STATUSES = ["new", "reviewing", "contacted", "won", "lost", "archived"] as const;
export const AI_CONCEPT_DRAFT_STATUSES = [
  "queued",
  "generating",
  "ready",
  "composite_only",
  "failed",
  "rejected",
  "rate_limited",
  "disabled"
] as const;
export const LEAD_CONTACT_METHODS = ["email", "phone", "either"] as const;

export type LeadRequestIntent = (typeof LEAD_REQUEST_INTENTS)[number];
export type LeadRequestStatus = (typeof LEAD_REQUEST_STATUSES)[number];
export type AiConceptDraftStatus = (typeof AI_CONCEPT_DRAFT_STATUSES)[number];
export type LeadContactMethod = (typeof LEAD_CONTACT_METHODS)[number];

export const LEAD_CONCEPT_PROMPT_MAX_LENGTH = 900;
export const LEAD_TEXT_FIELD_MAX_LENGTH = 240;
export const LEAD_WALL_DESCRIPTION_MAX_LENGTH = 700;
export const LEAD_AI_RATE_LIMIT_PER_DAY = 3;

export type LeadContactInput = {
  contactName: string;
  contactEmail?: string;
  contactPhone?: string;
  preferredContactMethod?: string;
  projectType?: string;
  businessName?: string;
  wallDescription?: string;
  conceptPrompt?: string;
  intent?: string;
  reserveInterest?: boolean;
};

export type NormalizedLeadContact = {
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  normalizedContactEmail: string;
  normalizedContactPhone?: string;
  preferredContactMethod: LeadContactMethod;
  projectType?: string;
  businessName?: string;
  wallDescription?: string;
  conceptPrompt?: string;
  intent: LeadRequestIntent;
  reserveInterest: boolean;
};

function normalizeWhitespace(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function optionalText(value: string | undefined, maxLength: number) {
  const normalized = normalizeWhitespace(value ?? "");

  return normalized ? normalized.slice(0, maxLength) : undefined;
}

export function normalizeLeadEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidLeadEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizeLeadEmail(value));
}

export function normalizeLeadPhone(value: string | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");

  return digits ? digits.slice(0, 20) : undefined;
}

export function isLeadRequestIntent(value: string): value is LeadRequestIntent {
  return LEAD_REQUEST_INTENTS.includes(value as LeadRequestIntent);
}

export function isLeadRequestStatus(value: string): value is LeadRequestStatus {
  return LEAD_REQUEST_STATUSES.includes(value as LeadRequestStatus);
}

export function isLeadContactMethod(value: string): value is LeadContactMethod {
  return LEAD_CONTACT_METHODS.includes(value as LeadContactMethod);
}

function resolvePreferredContactMethod(input: string | undefined, hasEmail: boolean, hasPhone: boolean): LeadContactMethod {
  if (input && isLeadContactMethod(input)) {
    return input;
  }

  if (hasEmail && hasPhone) {
    return "either";
  }

  return hasPhone ? "phone" : "email";
}

export function normalizeLeadRequestInput(input: LeadContactInput): NormalizedLeadContact {
  const contactName = optionalText(input.contactName, LEAD_TEXT_FIELD_MAX_LENGTH);
  const contactEmail = normalizeLeadEmail(input.contactEmail ?? "");
  const contactPhone = optionalText(input.contactPhone, LEAD_TEXT_FIELD_MAX_LENGTH);
  const normalizedContactPhone = normalizeLeadPhone(contactPhone);
  const hasEmail = Boolean(contactEmail);
  const hasValidEmail = hasEmail && isValidLeadEmail(contactEmail);
  const hasPhone = Boolean(normalizedContactPhone);
  const preferredContactMethod = resolvePreferredContactMethod(input.preferredContactMethod, hasValidEmail, hasPhone);
  const intent = input.intent && isLeadRequestIntent(input.intent) ? input.intent : "concept";
  const conceptPrompt = optionalText(input.conceptPrompt, LEAD_CONCEPT_PROMPT_MAX_LENGTH);

  if (!contactName) {
    throw new Error("Name is required.");
  }

  if (hasEmail && !hasValidEmail) {
    throw new Error("Enter a valid email address.");
  }

  if (contactPhone && !hasPhone) {
    throw new Error("Enter a valid phone number.");
  }

  if (!hasValidEmail && !hasPhone) {
    throw new Error("Email or phone is required.");
  }

  if (preferredContactMethod === "email" && !hasValidEmail) {
    throw new Error("Email is required when email is the preferred contact method.");
  }

  if (preferredContactMethod === "phone" && !hasPhone) {
    throw new Error("Phone is required when phone is the preferred contact method.");
  }

  if (input.conceptPrompt && !conceptPrompt) {
    throw new Error("Concept prompt is required to draft a concept.");
  }

  return {
    contactName,
    contactEmail,
    ...(contactPhone ? { contactPhone } : {}),
    normalizedContactEmail: contactEmail,
    ...(normalizedContactPhone ? { normalizedContactPhone } : {}),
    preferredContactMethod,
    ...(optionalText(input.projectType, LEAD_TEXT_FIELD_MAX_LENGTH) ? { projectType: optionalText(input.projectType, LEAD_TEXT_FIELD_MAX_LENGTH) } : {}),
    ...(optionalText(input.businessName, LEAD_TEXT_FIELD_MAX_LENGTH) ? { businessName: optionalText(input.businessName, LEAD_TEXT_FIELD_MAX_LENGTH) } : {}),
    ...(optionalText(input.wallDescription, LEAD_WALL_DESCRIPTION_MAX_LENGTH)
      ? { wallDescription: optionalText(input.wallDescription, LEAD_WALL_DESCRIPTION_MAX_LENGTH) }
      : {}),
    ...(conceptPrompt ? { conceptPrompt } : {}),
    intent,
    reserveInterest: Boolean(input.reserveInterest || intent === "reserve")
  };
}

export function makeLeadRateLimitBucket(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}
