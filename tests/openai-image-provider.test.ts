import { describe, expect, it } from "vitest";

import { chooseWallPrintImageSize, generateOpenAiConceptImage, makeWallPrintConceptPrompt } from "@/lib/openai-image-provider";

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
    let requestBody: Record<string, unknown> | null = null;
    const result = await generateOpenAiConceptImage({
      apiKey: "sk-test",
      prompt: "paint a wall",
      print: {
        aspectRatio: "6:5",
        widthMeters: 1.524,
        heightMeters: 1.27
      },
      fetcher: async (_url, init) => {
        requestBody = JSON.parse(String(init?.body));

        return response({
          id: "img_123",
          data: [
            {
              b64_json: Buffer.from("png-bytes").toString("base64")
            }
          ],
          usage: {
            total_tokens: 12
          }
        });
      }
    });

    expect(requestBody).toMatchObject({
      model: "gpt-image-2",
      size: "1536x1280",
      quality: "auto",
      output_format: "png"
    });
    expect(result.ok).toBe(true);
    expect(result.ok ? Buffer.from(result.bytes).toString("utf8") : "").toBe("png-bytes");
    expect(result.ok ? result.contentType : "").toBe("image/png");
    expect(result.ok ? result.model : "").toBe("gpt-image-2");
    expect(result.ok ? result.quality : "").toBe("auto");
    expect(result.ok ? result.size : "").toBe("1536x1280");
    expect(result.ok ? result.metadata : "").toContain("[base64 image omitted]");
    expect(result.ok ? result.metadata : "").not.toContain(Buffer.from("png-bytes").toString("base64"));
  });

  it("lets callers override model, quality, and size for controlled generation", async () => {
    let requestBody: Record<string, unknown> | null = null;
    const result = await generateOpenAiConceptImage({
      apiKey: "sk-test",
      prompt: "paint a wall",
      model: "gpt-image-1.5",
      quality: "medium",
      size: "1024x1536",
      fetcher: async (_url, init) => {
        requestBody = JSON.parse(String(init?.body));

        return response({
          data: [
            {
              b64_json: Buffer.from("png-bytes").toString("base64")
            }
          ]
        });
      }
    });

    expect(requestBody).toMatchObject({
      model: "gpt-image-1.5",
      size: "1024x1536",
      quality: "medium"
    });
    expect(result.ok).toBe(true);
  });

  it("chooses wall-shaped image sizes from print dimensions", () => {
    expect(chooseWallPrintImageSize({ model: "gpt-image-2", print: { aspectRatio: "16:9" } })).toBe("1536x864");
    expect(chooseWallPrintImageSize({ model: "gpt-image-2", print: { aspectRatio: "9:16" } })).toBe("864x1536");
    expect(
      chooseWallPrintImageSize({
        model: "gpt-image-2",
        print: {
          aspectRatio: "6:5",
          widthMeters: 1.524,
          heightMeters: 1.27
        }
      })
    ).toBe("1536x1280");
    expect(chooseWallPrintImageSize({ model: "gpt-image-1", print: { aspectRatio: "9:16" } })).toBe("1024x1536");
  });

  it("classifies policy-style provider errors as refusals", async () => {
    const result = await generateOpenAiConceptImage({
      apiKey: "sk-test",
      prompt: "paint a wall",
      fetcher: async () =>
        response({
          error: {
            message: "Request refused by safety policy."
          }
        }, false)
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
    expect(prompt).toContain("large-format wall printing");
    expect(prompt).toContain("full-bleed rectangular artwork");
    expect(prompt).toContain("Avoid tiny text");
    expect(prompt).toContain("pricing");
  });
});
