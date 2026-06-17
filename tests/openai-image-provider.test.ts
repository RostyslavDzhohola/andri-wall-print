import { describe, expect, it } from "vitest";

import { generateOpenAiConceptImage, makeWallPrintConceptPrompt } from "@/lib/openai-image-provider";

function response(body: unknown, ok = true) {
  return {
    ok,
    json: async () => body
  } as Response;
}

describe("OpenAI image provider adapter", () => {
  it("returns a missing-key failure before calling the provider", async () => {
    const result = await generateOpenAiConceptImage({
      prompt: "paint a wall"
    });

    expect(result).toEqual({
      ok: false,
      code: "missing_api_key",
      reason: "AI concept drafting is not configured."
    });
  });

  it("parses base64 image data from a successful image response", async () => {
    const result = await generateOpenAiConceptImage({
      apiKey: "sk-test",
      prompt: "paint a wall",
      fetcher: async () =>
        response({
          data: [
            {
              b64_json: Buffer.from("png-bytes").toString("base64")
            }
          ],
          usage: {
            total_tokens: 12
          }
        })
    });

    expect(result.ok).toBe(true);
    expect(result.ok ? Buffer.from(result.bytes).toString("utf8") : "").toBe("png-bytes");
    expect(result.ok ? result.contentType : "").toBe("image/png");
  });

  it("classifies policy-style provider errors as refusals", async () => {
    const result = await generateOpenAiConceptImage({
      apiKey: "sk-test",
      prompt: "paint a wall",
      fetcher: async () =>
        response(
          {
            error: {
              message: "Request refused by safety policy."
            }
          },
          false
        )
    });

    expect(result).toMatchObject({
      ok: false,
      code: "refused",
      reason: "Request refused by safety policy."
    });
  });

  it("builds a wall-print-specific prompt without pricing language", () => {
    const prompt = makeWallPrintConceptPrompt({
      conceptPrompt: "Chicago skyline for a lobby",
      businessName: "Hotel",
      wallDescription: "behind front desk"
    });

    expect(prompt).toContain("Chicago skyline");
    expect(prompt).toContain("Hotel");
    expect(prompt).toContain("Do not include pricing");
  });
});
