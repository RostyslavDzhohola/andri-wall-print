import { describe, expect, it, vi } from "vitest";

import { moderateGeneratedArtwork } from "@/lib/openai-moderation-provider";

describe("OpenAI gallery moderation provider", () => {
  it("moderates the original prompt and base64 image with omni-moderation-latest", async () => {
    const fetcher = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      Response.json({
        results: [
          {
            flagged: false,
            categories: { violence: false, sexual: false }
          }
        ]
      })
    );

    const result = await moderateGeneratedArtwork({
      apiKey: "test-key",
      prompt: "A calm abstract Chicago lakefront",
      imageBytes: Uint8Array.from([1, 2, 3]),
      imageContentType: "image/png",
      fetcher: fetcher as typeof fetch
    });

    expect(result).toEqual({
      flagged: false,
      flaggedCategories: [],
      model: "omni-moderation-latest"
    });
    const [url, init] = fetcher.mock.calls[0];
    const body = JSON.parse(String(init?.body));
    const headers = new Headers(init?.headers);
    expect(url).toBe("https://api.openai.com/v1/moderations");
    expect(headers.get("Authorization")).toBe("Bearer test-key");
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(body).toEqual({
      model: "omni-moderation-latest",
      input: [
        { type: "text", text: "A calm abstract Chicago lakefront" },
        { type: "image_url", image_url: { url: "data:image/png;base64,AQID" } }
      ]
    });
  });

  it("uses the API flagged decision without custom score thresholds", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        results: [
          {
            flagged: true,
            categories: { violence: true, harassment: false, sexual: true },
            category_scores: { violence: 0.2 }
          }
        ]
      })
    ) as typeof fetch;

    await expect(
      moderateGeneratedArtwork({
        apiKey: "test-key",
        prompt: "prompt",
        imageBytes: Uint8Array.from([1]),
        imageContentType: "image/png",
        fetcher
      })
    ).resolves.toMatchObject({ flagged: true, flaggedCategories: ["sexual", "violence"] });
  });

  it("fails closed on endpoint or response errors", async () => {
    await expect(
      moderateGeneratedArtwork({
        apiKey: "test-key",
        prompt: "prompt",
        imageBytes: Uint8Array.from([1]),
        imageContentType: "image/png",
        fetcher: vi.fn(async () => new Response("unavailable", { status: 503 })) as typeof fetch
      })
    ).rejects.toThrow(/status 503/);
  });

  it("aborts a moderation request that exceeds its deadline", async () => {
    const fetcher = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        await new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
        })
    ) as typeof fetch;

    await expect(
      moderateGeneratedArtwork({
        apiKey: "test-key",
        prompt: "prompt",
        imageBytes: Uint8Array.from([1]),
        imageContentType: "image/png",
        fetcher,
        timeoutMs: 1
      })
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
