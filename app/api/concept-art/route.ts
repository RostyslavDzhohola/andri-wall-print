import { AR_SAMPLE_IDS, DEFAULT_AR_SAMPLE, getArSample } from "@/lib/ar-sample";
import { COMMUNITY_GALLERY_CONSENT_REQUIRED_MESSAGE } from "@/lib/community-gallery";
import { isValidLeadEmail, LEAD_CONCEPT_PROMPT_MAX_LENGTH, normalizeLeadEmail } from "@/lib/lead-request-contract";
import { noStoreJson } from "@/lib/private-api-response";
import { readConvexRuntimeUrl, readWallPrintProCommunityGalleryEnabled } from "@/lib/runtime-env";

export const runtime = "nodejs";
export const maxDuration = 60;

type ConceptArtRequestBody = {
  contactEmail?: unknown;
  email?: unknown;
  contactName?: unknown;
  prompt?: unknown;
  selectedDesignId?: unknown;
  galleryPublicationConsent?: unknown;
};

type ConvexSuccessResponse = {
  status: "success";
  value: unknown;
};

type ConvexErrorResponse = {
  status: "error";
  errorMessage?: string;
};

type ConvexHttpResponse = ConvexSuccessResponse | ConvexErrorResponse;

function normalizePrompt(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, LEAD_CONCEPT_PROMPT_MAX_LENGTH) : "";
}

function normalizeOptionalText(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

function resolveSelectedSample(value: unknown) {
  if (typeof value !== "string" || !AR_SAMPLE_IDS.includes(value)) {
    return DEFAULT_AR_SAMPLE;
  }

  return getArSample(value);
}

function normalizeRequestEmail(body: ConceptArtRequestBody) {
  const email = normalizeLeadEmail(typeof body.contactEmail === "string" ? body.contactEmail : typeof body.email === "string" ? body.email : "");

  return isValidLeadEmail(email) ? email : "";
}

function normalizeConvexUrl(convexUrl: string) {
  return convexUrl.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resultStatus(value: unknown) {
  if (!isRecord(value)) {
    return 503;
  }

  if (value.code === "QUEUED") {
    return 202;
  }

  if (value.code === "INVALID_EMAIL" || value.code === "INVALID_GENERATION_REQUEST" || value.code === "CONSENT_REQUIRED") {
    return 400;
  }

  if (value.code === "CONTACT_RATE_LIMITED") {
    return 429;
  }

  if (value.code === "GLOBAL_DAILY_CAP_REACHED" || value.code === "GENERATION_UNAVAILABLE") {
    return 503;
  }

  return 503;
}

function conceptStatusHttpStatus(value: unknown) {
  if (!isRecord(value) || value.ok === false) {
    return 404;
  }

  if (value.status === "ready" || value.status === "composite_only" || value.status === "failed") {
    return 200;
  }

  return 202;
}

async function startConceptGeneration(input: {
  contactEmail: string;
  contactName?: string;
  conceptPrompt: string;
  selectedDesignId?: unknown;
  galleryPublicationConsent?: boolean;
}) {
  const convexUrl = readConvexRuntimeUrl();

  if (!convexUrl) {
    return {
      status: 503,
      body: {
        ok: false,
        code: "UNAVAILABLE",
        message: "AI concept drafting is temporarily unavailable."
      }
    };
  }

  const selectedSample = resolveSelectedSample(input.selectedDesignId);
  let response: Response;

  try {
    response = await fetch(`${normalizeConvexUrl(convexUrl)}/api/mutation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        path: "leadRequests:startConceptGeneration",
        args: {
          contactEmail: input.contactEmail,
          ...(input.contactName ? { contactName: input.contactName } : {}),
          businessName: "Wall Print Pro",
          wallDescription: "Homepage instant artwork preview",
          conceptPrompt: `${input.conceptPrompt}. Use this selected proof as loose visual context, not a copy: ${selectedSample.title} - ${selectedSample.description}`,
          ...(input.galleryPublicationConsent ? { galleryPublicationConsent: true } : {}),
          print: selectedSample.print
        },
        format: "json"
      }),
      cache: "no-store"
    });
  } catch {
    return {
      status: 503,
      body: {
        ok: false,
        code: "UNAVAILABLE",
        message: "AI concept drafting is temporarily unavailable."
      }
    };
  }

  if (!response.ok) {
    return {
      status: 503,
      body: {
        ok: false,
        code: "UNAVAILABLE",
        message: "AI concept drafting is temporarily unavailable."
      }
    };
  }

  let body: ConvexHttpResponse;

  try {
    body = (await response.json()) as ConvexHttpResponse;
  } catch {
    return {
      status: 503,
      body: {
        ok: false,
        code: "UNAVAILABLE",
        message: "AI concept drafting is temporarily unavailable."
      }
    };
  }

  if (body.status === "error") {
    return {
      status: 503,
      body: {
        ok: false,
        code: "UNAVAILABLE",
        message: "AI concept drafting is temporarily unavailable."
      }
    };
  }

  return {
    status: resultStatus(body.value),
    body: body.value
  };
}

async function getConceptGenerationStatus(leadRequestId: string) {
  const convexUrl = readConvexRuntimeUrl();

  if (!convexUrl) {
    return {
      status: 503,
      body: {
        ok: false,
        code: "UNAVAILABLE",
        message: "AI concept drafting is temporarily unavailable."
      }
    };
  }

  let response: Response;

  try {
    response = await fetch(`${normalizeConvexUrl(convexUrl)}/api/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        path: "leadRequests:getConceptGenerationStatus",
        args: {
          leadRequestId
        },
        format: "json"
      }),
      cache: "no-store"
    });
  } catch {
    return {
      status: 503,
      body: {
        ok: false,
        code: "UNAVAILABLE",
        message: "AI concept drafting is temporarily unavailable."
      }
    };
  }

  if (!response.ok) {
    return {
      status: 503,
      body: {
        ok: false,
        code: "UNAVAILABLE",
        message: "AI concept drafting is temporarily unavailable."
      }
    };
  }

  let body: ConvexHttpResponse;

  try {
    body = (await response.json()) as ConvexHttpResponse;
  } catch {
    return {
      status: 503,
      body: {
        ok: false,
        code: "UNAVAILABLE",
        message: "AI concept drafting is temporarily unavailable."
      }
    };
  }

  if (body.status === "error") {
    return {
      status: 503,
      body: {
        ok: false,
        code: "UNAVAILABLE",
        message: "AI concept drafting is temporarily unavailable."
      }
    };
  }

  return {
    status: conceptStatusHttpStatus(body.value),
    body: body.value
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const leadRequestId = url.searchParams.get("leadRequestId")?.trim() ?? "";

  if (!leadRequestId) {
    return noStoreJson(
      {
        ok: false,
        code: "MISSING_LEAD_REQUEST",
        message: "Concept status is unavailable."
      },
      { status: 400 }
    );
  }

  const result = await getConceptGenerationStatus(leadRequestId);

  return noStoreJson(result.body, { status: result.status });
}

export async function POST(request: Request) {
  let body: ConceptArtRequestBody;

  try {
    body = (await request.json()) as ConceptArtRequestBody;
  } catch {
    return noStoreJson({ ok: false, message: "Send a wall-print idea to generate artwork." }, { status: 400 });
  }

  const prompt = normalizePrompt(body.prompt);
  const contactEmail = normalizeRequestEmail(body);

  if (!prompt) {
    return noStoreJson({ ok: false, message: "Describe the wall print idea first." }, { status: 400 });
  }

  if (!contactEmail) {
    return noStoreJson(
      {
        ok: false,
        code: "INVALID_EMAIL",
        message: "Enter a valid email address to generate a concept draft."
      },
      { status: 400 }
    );
  }

  if (readWallPrintProCommunityGalleryEnabled() && body.galleryPublicationConsent !== true) {
    return noStoreJson(
      {
        ok: false,
        code: "CONSENT_REQUIRED",
        message: COMMUNITY_GALLERY_CONSENT_REQUIRED_MESSAGE
      },
      { status: 400 }
    );
  }

  const result = await startConceptGeneration({
    contactEmail,
    contactName: normalizeOptionalText(body.contactName),
    conceptPrompt: prompt,
    selectedDesignId: body.selectedDesignId,
    galleryPublicationConsent: body.galleryPublicationConsent === true
  });

  return noStoreJson(result.body, { status: result.status });
}
