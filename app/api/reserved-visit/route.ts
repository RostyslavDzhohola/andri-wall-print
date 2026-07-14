import { NextResponse } from "next/server";

import { normalizeReservedSessionId } from "@/lib/reserved-session-id";
import { readConvexRuntimeUrl } from "@/lib/runtime-env";

export const runtime = "nodejs";

type ConvexSuccessResponse = {
  status: "success";
  value: unknown;
};

type ConvexErrorResponse = {
  status: "error";
  errorMessage?: string;
};

type ConvexHttpResponse = ConvexSuccessResponse | ConvexErrorResponse;

function normalizeConvexUrl(convexUrl: string) {
  return convexUrl.replace(/\/+$/, "");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unavailable(status: number) {
  return NextResponse.json({ status: "unavailable" }, { status });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return unavailable(400);
  }

  const sessionId = isRecord(body) ? normalizeReservedSessionId(body.sessionId) : null;

  if (!sessionId) {
    return unavailable(400);
  }

  const convexUrl = readConvexRuntimeUrl();

  if (!convexUrl) {
    return unavailable(503);
  }

  let response: Response;

  try {
    response = await fetch(`${normalizeConvexUrl(convexUrl)}/api/mutation`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({
        path: "leadRequests:logReservedVisit",
        args: { sessionId },
        format: "json"
      }),
      cache: "no-store"
    });
  } catch {
    return unavailable(503);
  }

  if (!response.ok) {
    return unavailable(503);
  }

  let result: ConvexHttpResponse;

  try {
    result = (await response.json()) as ConvexHttpResponse;
  } catch {
    return unavailable(503);
  }

  if (result.status === "error") {
    return unavailable(503);
  }

  return NextResponse.json({ status: "logged" }, { status: 202 });
}
