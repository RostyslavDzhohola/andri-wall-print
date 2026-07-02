import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/concept-art/route";

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

describe("/api/concept-art", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns a generated artwork sample without creating a lead request", async () => {
    const providerRequests: Array<Record<string, unknown>> = [];
    process.env.OPENAI_API_KEY = "sk-test";
    process.env.OPENAI_IMAGE_MODEL = "gpt-image-2";
    globalThis.fetch = vi.fn(async (_input, init) => {
      providerRequests.push(JSON.parse(String(init?.body)) as Record<string, unknown>);

      return Response.json({
        data: [
          {
            b64_json: Buffer.from("png-bytes").toString("base64")
          }
        ]
      });
    }) as typeof fetch;

    const response = await POST(conceptArtRequest({ prompt: "Chicago skyline for a kids area mural", selectedDesignId: "chicago-final-1" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      ok: true,
      sample: {
        title: "Generated concept",
        description: "Chicago skyline for a kids area mural",
        assets: {
          poster: `data:image/png;base64,${Buffer.from("png-bytes").toString("base64")}`,
          glb: "",
          usdz: ""
        }
      }
    });
    const providerRequest = providerRequests[0];

    expect(providerRequest).toMatchObject({
      model: "gpt-image-2",
      output_format: "png"
    });
    expect(String(providerRequest?.prompt)).toContain("full-bleed rectangular artwork");
    expect(String(providerRequest?.prompt)).toContain("Pathways to Success");
  });

  it("rejects empty prompts before calling the image provider", async () => {
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await POST(conceptArtRequest({ prompt: "   " }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      ok: false,
      message: "Describe the wall print idea first."
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not expose provider credential errors to the browser", async () => {
    process.env.OPENAI_API_KEY = "sk-test";
    globalThis.fetch = vi.fn(async () =>
      Response.json(
        {
          error: {
            message: "Incorrect API key provided: sk-proj-secret-value."
          }
        },
        { status: 401 }
      )
    ) as typeof fetch;

    const response = await POST(conceptArtRequest({ prompt: "Chicago skyline mural", selectedDesignId: "chicago-final-1" }));
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body).toEqual({
      ok: false,
      message: "Artwork generation is not configured correctly."
    });
    expect(JSON.stringify(body)).not.toContain("sk-proj");
  });
});
