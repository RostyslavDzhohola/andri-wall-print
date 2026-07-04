import { afterEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/concept-art/route";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

function conceptArtRequest(body: unknown) {
  return new Request("http://localhost:3000/api/concept-art", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json"
    }
  });
}

function conceptStatusRequest(leadRequestId = "lead_123") {
  return new Request(`http://localhost:3000/api/concept-art?leadRequestId=${encodeURIComponent(leadRequestId)}`, {
    method: "GET"
  });
}

describe("/api/concept-art", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rejects missing email before calling Convex", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await POST(conceptArtRequest({ prompt: "Chicago skyline mural" }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      code: "INVALID_EMAIL",
      message: "Enter a valid email address to generate a concept draft."
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects empty prompts before calling Convex", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await POST(conceptArtRequest({ contactEmail: "buyer@example.com", prompt: "   " }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      message: "Describe the wall print idea first."
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("calls the gated Convex mutation instead of the image provider", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    process.env.CONVEX_URL = "https://steady-otter-123.convex.cloud";
    globalThis.fetch = vi.fn(async (input, init) => {
      calls.push({
        url: String(input),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>
      });

      return Response.json({
        status: "success",
        value: {
          ok: true,
          code: "QUEUED",
          leadRequestId: "lead_123",
          status: "new",
          aiDraftStatus: "queued",
          message: "Request saved. The concept draft is being prepared for seller review."
        }
      });
    }) as typeof fetch;

    const response = await POST(
      conceptArtRequest({
        contactEmail: " BUYER@EXAMPLE.COM ",
        contactName: "Buyer",
        prompt: "Chicago skyline for a kids area mural",
        selectedDesignId: "chicago-final-1"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      ok: true,
      code: "QUEUED",
      leadRequestId: "lead_123"
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      url: "https://steady-otter-123.convex.cloud/api/mutation",
      body: {
        path: "leadRequests:startConceptGeneration",
        format: "json"
      }
    });
    expect(calls[0].body.args).toMatchObject({
      contactEmail: "buyer@example.com",
      contactName: "Buyer",
      businessName: "Wall Print Pro",
      wallDescription: "Homepage instant artwork preview"
    });
    expect(String((calls[0].body.args as Record<string, unknown>).conceptPrompt)).toContain("Pathways to Success");
    expect(JSON.stringify(calls[0].body)).not.toMatch(/OPENAI|sk-/i);
  });

  it("maps unavailable generation from Convex to 503", async () => {
    process.env.CONVEX_URL = "https://steady-otter-123.convex.cloud";
    globalThis.fetch = vi.fn(async () => {
      return Response.json({
        status: "success",
        value: {
          ok: false,
          code: "GENERATION_UNAVAILABLE",
          message: "AI concept drafting is temporarily unavailable."
        }
      });
    }) as typeof fetch;

    const response = await POST(
      conceptArtRequest({
        contactEmail: "buyer@example.com",
        prompt: "Chicago skyline for a kids area mural"
      })
    );
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toEqual({
      ok: false,
      code: "GENERATION_UNAVAILABLE",
      message: "AI concept drafting is temporarily unavailable."
    });
  });

  it("polls the public concept status query", async () => {
    const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
    process.env.CONVEX_URL = "https://steady-otter-123.convex.cloud";
    globalThis.fetch = vi.fn(async (input, init) => {
      calls.push({
        url: String(input),
        body: JSON.parse(String(init?.body)) as Record<string, unknown>
      });

      return Response.json({
        status: "success",
        value: {
          ok: true,
          leadRequestId: "lead_123",
          draftId: "draft_123",
          status: "ready",
          message: "Artwork preview is ready for wall placement.",
          title: "Buyer concept draft",
          description: "Concept draft generated from a client request.",
          assets: {
            poster: "https://steady-otter-123.convex.cloud/api/storage/poster",
            glb: "https://steady-otter-123.convex.cloud/api/storage/glb",
            usdz: "https://steady-otter-123.convex.cloud/api/storage/usdz"
          }
        }
      });
    }) as typeof fetch;

    const response = await GET(conceptStatusRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      status: "ready",
      assets: {
        poster: expect.stringContaining("/poster"),
        glb: expect.stringContaining("/glb"),
        usdz: expect.stringContaining("/usdz")
      }
    });
    expect(calls).toEqual([
      {
        url: "https://steady-otter-123.convex.cloud/api/query",
        body: {
          path: "leadRequests:getConceptGenerationStatus",
          args: {
            leadRequestId: "lead_123"
          },
          format: "json"
        }
      }
    ]);
  });

  it("returns 202 while concept status is still generating", async () => {
    process.env.CONVEX_URL = "https://steady-otter-123.convex.cloud";
    globalThis.fetch = vi.fn(async () => {
      return Response.json({
        status: "success",
        value: {
          ok: true,
          leadRequestId: "lead_123",
          draftId: "draft_123",
          status: "generating",
          message: "Creating artwork and preparing the AR wall preview.",
          title: "Buyer concept draft",
          description: "Concept draft generated from a client request."
        }
      });
    }) as typeof fetch;

    const response = await GET(conceptStatusRequest());
    const body = await response.json();

    expect(response.status).toBe(202);
    expect(body).toMatchObject({
      ok: true,
      status: "generating"
    });
  });
});
