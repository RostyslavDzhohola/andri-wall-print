import { NextResponse } from "next/server";

import { AR_SAMPLE_IDS, DEFAULT_AR_SAMPLE, getArSample } from "@/lib/ar-sample";
import { isValidLeadEmail, LEAD_CONCEPT_PROMPT_MAX_LENGTH, normalizeLeadEmail } from "@/lib/lead-request-contract";
import { readConvexRuntimeUrl } from "@/lib/runtime-env";

export const runtime = "nodejs";
export const maxDuration = 60;

type ConceptArtRequestBody = {
  contactEmail?: unknown;
  email?: unknown;
  contactName?: unknown;
  prompt?: unknown;
  selectedDesignId?: unknown;
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

  if (value.code === "INVALID_EMAIL" || value.code === "INVALID_GENERATION_REQUEST") {
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
  const response = await fetch(`${normalizeConvexUrl(convexUrl)}/api/mutation`, {
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
        print: selectedSample.print
      },
      format: "json"
    }),
    cache: "no-store"
  });

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

  const body = (await response.json()) as ConvexHttpResponse;

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

  const response = await fetch(`${normalizeConvexUrl(convexUrl)}/api/query`, {
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

  const body = (await response.json()) as ConvexHttpResponse;

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
    return NextResponse.json(
      {
        ok: false,
        code: "MISSING_LEAD_REQUEST",
        message: "Concept status is unavailable."
      },
      { status: 400 }
    );
  }

  const result = await getConceptGenerationStatus(leadRequestId);

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function POST(request: Request) {
  let body: ConceptArtRequestBody;

  try {
    body = (await request.json()) as ConceptArtRequestBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Send a wall-print idea to generate artwork." }, { status: 400 });
  }

  const prompt = normalizePrompt(body.prompt);
  const contactEmail = normalizeRequestEmail(body);

  if (!prompt) {
    return NextResponse.json({ ok: false, message: "Describe the wall print idea first." }, { status: 400 });
  }

  if (!contactEmail) {
    return NextResponse.json(
      {
        ok: false,
        code: "INVALID_EMAIL",
        message: "Enter a valid email address to generate a concept draft."
      },
      { status: 400 }
    );
  }

  const result = await startConceptGeneration({
    contactEmail,
    contactName: normalizeOptionalText(body.contactName),
    conceptPrompt: prompt,
    selectedDesignId: body.selectedDesignId
  });

  return NextResponse.json(result.body, {
    status: result.status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}
