import { z } from "zod";

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
export const AI_DRAFT_ACTIVE_STATUSES = ["queued", "generating"] as const;
export const LEAD_CONTACT_METHODS = ["email", "phone", "either"] as const;

export type LeadRequestIntent = (typeof LEAD_REQUEST_INTENTS)[number];
export type LeadRequestStatus = (typeof LEAD_REQUEST_STATUSES)[number];
export type AiConceptDraftStatus = (typeof AI_CONCEPT_DRAFT_STATUSES)[number];
export type LeadContactMethod = (typeof LEAD_CONTACT_METHODS)[number];

export function canFinalizeAiDraft(from: AiConceptDraftStatus, to: AiConceptDraftStatus) {
  if (to === "failed" || to === "rejected") {
    return AI_DRAFT_ACTIVE_STATUSES.includes(from as (typeof AI_DRAFT_ACTIVE_STATUSES)[number]);
  }

  if (to === "ready" || to === "composite_only") {
    return from === "generating";
  }

  return false;
}

export const LEAD_CONCEPT_PROMPT_MAX_LENGTH = 900;
export const LEAD_TEXT_FIELD_MAX_LENGTH = 240;
export const LEAD_WALL_DESCRIPTION_MAX_LENGTH = LEAD_CONCEPT_PROMPT_MAX_LENGTH;
export const LEAD_AI_RATE_LIMIT_PER_DAY = 3;
export const LEAD_PHONE_MIN_DIGITS = 10;
export const LEAD_PHONE_MAX_DIGITS = 15;

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

export function foldLeadContactEmail(email: string) {
  const normalized = normalizeLeadEmail(email);
  const atIndex = normalized.lastIndexOf("@");

  if (atIndex < 0) {
    return normalized.split("+", 1)[0];
  }

  const domain = normalized.slice(atIndex + 1);
  let localPart = normalized.slice(0, atIndex).split("+", 1)[0];

  if (domain === "gmail.com" || domain === "googlemail.com") {
    localPart = localPart.replace(/\./g, "");
  }

  return `${localPart}@${domain}`;
}

export function makeLeadRateLimitKey(email: string) {
  return `ai:${foldLeadContactEmail(email)}`;
}

export function normalizeLeadPhone(value: string | undefined) {
  const digits = (value ?? "").replace(/\D/g, "");

  return digits || undefined;
}

export const leadEmailSchema = z.string().trim().toLowerCase().email("Enter a valid email address.");

export const leadPhoneSchema = z
  .string()
  .trim()
  .refine(
    (value) => {
      const digitCount = normalizeLeadPhone(value)?.length ?? 0;

      return /^\+?[\d\s().-]+$/.test(value) && digitCount >= LEAD_PHONE_MIN_DIGITS && digitCount <= LEAD_PHONE_MAX_DIGITS;
    },
    { message: "Enter a valid phone number with 10 to 15 digits." }
  )
  .transform((value) => normalizeLeadPhone(value) as string);

export function isValidLeadEmail(value: string) {
  return leadEmailSchema.safeParse(value).success;
}

export function isValidLeadPhone(value: string | undefined) {
  return leadPhoneSchema.safeParse(value ?? "").success;
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

const rawLeadRequestSchema = z.object({
  contactName: z.string(),
  contactEmail: z.string().optional(),
  contactPhone: z.string().optional(),
  preferredContactMethod: z.string().optional(),
  projectType: z.string().optional(),
  businessName: z.string().optional(),
  wallDescription: z.string().optional(),
  conceptPrompt: z.string().optional(),
  intent: z.string().optional(),
  reserveInterest: z.boolean().optional()
});

export const leadRequestSchema = rawLeadRequestSchema
  .transform((input) => {
    const contactName = optionalText(input.contactName, LEAD_TEXT_FIELD_MAX_LENGTH) ?? "";
    const contactEmail = normalizeLeadEmail(input.contactEmail ?? "");
    const contactPhone = optionalText(input.contactPhone, LEAD_TEXT_FIELD_MAX_LENGTH);
    const normalizedContactPhone = normalizeLeadPhone(contactPhone);
    const hasValidEmail = Boolean(contactEmail) && isValidLeadEmail(contactEmail);
    const hasValidPhone = Boolean(contactPhone) && isValidLeadPhone(contactPhone);
    const preferredContactMethod = resolvePreferredContactMethod(input.preferredContactMethod, hasValidEmail, hasValidPhone);
    const intent = input.intent && isLeadRequestIntent(input.intent) ? input.intent : "concept";

    return {
      contactName,
      contactEmail,
      contactPhone,
      normalizedContactPhone,
      hasValidEmail,
      hasValidPhone,
      preferredContactMethod,
      projectType: optionalText(input.projectType, LEAD_TEXT_FIELD_MAX_LENGTH),
      businessName: optionalText(input.businessName, LEAD_TEXT_FIELD_MAX_LENGTH),
      wallDescription: optionalText(input.wallDescription, LEAD_WALL_DESCRIPTION_MAX_LENGTH),
      conceptPrompt: optionalText(input.conceptPrompt, LEAD_CONCEPT_PROMPT_MAX_LENGTH),
      conceptPromptSupplied: Boolean(input.conceptPrompt),
      intent,
      reserveInterest: Boolean(input.reserveInterest || intent === "reserve")
    };
  })
  .superRefine((input, context) => {
    const addIssue = (message: string, path: string) => {
      context.addIssue({ code: "custom", message, path: [path] });
    };

    if (!input.contactName) {
      addIssue("Name is required.", "contactName");
    }

    if (input.contactEmail && !input.hasValidEmail) {
      addIssue("Enter a valid email address.", "contactEmail");
    }

    if (input.contactPhone && !input.hasValidPhone) {
      addIssue("Enter a valid phone number with 10 to 15 digits.", "contactPhone");
    }

    if (!input.hasValidEmail && !input.hasValidPhone) {
      addIssue("Email or phone is required.", "contactEmail");
    }

    if (input.preferredContactMethod === "email" && !input.hasValidEmail) {
      addIssue("Email is required when email is the preferred contact method.", "contactEmail");
    }

    if (input.preferredContactMethod === "phone" && !input.hasValidPhone) {
      addIssue("Phone is required when phone is the preferred contact method.", "contactPhone");
    }

    if (input.conceptPromptSupplied && !input.conceptPrompt) {
      addIssue("Concept prompt is required to draft a concept.", "conceptPrompt");
    }
  })
  .transform(
    (input): NormalizedLeadContact => ({
      contactName: input.contactName,
      contactEmail: input.contactEmail,
      ...(input.contactPhone ? { contactPhone: input.contactPhone } : {}),
      normalizedContactEmail: input.contactEmail,
      ...(input.normalizedContactPhone ? { normalizedContactPhone: input.normalizedContactPhone } : {}),
      preferredContactMethod: input.preferredContactMethod,
      ...(input.projectType ? { projectType: input.projectType } : {}),
      ...(input.businessName ? { businessName: input.businessName } : {}),
      ...(input.wallDescription ? { wallDescription: input.wallDescription } : {}),
      ...(input.conceptPrompt ? { conceptPrompt: input.conceptPrompt } : {}),
      intent: input.intent,
      reserveInterest: input.reserveInterest
    })
  );

export function normalizeLeadRequestInput(input: LeadContactInput): NormalizedLeadContact {
  const parsed = leadRequestSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? "This request could not be saved.");
  }

  return parsed.data;
}

export function getChicagoGenerationDayKey(now: number) {
  const utcYear = new Date(now).getUTCFullYear();
  const dstStart = getChicagoDstStartUtcMs(utcYear);
  const dstEnd = getChicagoDstEndUtcMs(utcYear);
  const utcOffsetHours = now >= dstStart && now < dstEnd ? -5 : -6;
  const chicagoDate = new Date(now + utcOffsetHours * 60 * 60 * 1_000);
  const year = chicagoDate.getUTCFullYear();
  const month = String(chicagoDate.getUTCMonth() + 1).padStart(2, "0");
  const day = String(chicagoDate.getUTCDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getChicagoDstStartUtcMs(year: number) {
  const secondSunday = getNthSundayOfMonth(year, 2, 2);

  return Date.UTC(year, 2, secondSunday, 8, 0, 0, 0);
}

function getChicagoDstEndUtcMs(year: number) {
  const firstSunday = getNthSundayOfMonth(year, 10, 1);

  return Date.UTC(year, 10, firstSunday, 7, 0, 0, 0);
}

function getNthSundayOfMonth(year: number, monthIndex: number, nth: number) {
  const firstDayOfMonth = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const firstSunday = 1 + ((7 - firstDayOfMonth) % 7);

  return firstSunday + (nth - 1) * 7;
}

export function makeLeadRateLimitBucket(now = Date.now()) {
  return getChicagoGenerationDayKey(now);
}
