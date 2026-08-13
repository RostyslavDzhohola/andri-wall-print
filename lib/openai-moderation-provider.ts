const MODERATION_ENDPOINT = "https://api.openai.com/v1/moderations";
const MAX_MODERATION_IMAGE_BYTES = 20 * 1024 * 1024;
const DEFAULT_MODERATION_TIMEOUT_MS = 15_000;

type ModerationFetcher = typeof fetch;

type ModerationResponse = {
  results?: Array<{
    flagged?: unknown;
    categories?: unknown;
  }>;
};

function collectFlaggedCategories(value: unknown) {
  if (!value || typeof value !== "object") {
    return [];
  }

  return Object.entries(value)
    .filter(([, flagged]) => flagged === true)
    .map(([category]) => category)
    .sort();
}

export async function moderateGeneratedArtwork(input: {
  apiKey: string | undefined;
  prompt: string;
  imageBytes: Uint8Array;
  imageContentType: string;
  fetcher?: ModerationFetcher;
  timeoutMs?: number;
}) {
  if (!input.apiKey) {
    throw new Error("OpenAI moderation is not configured.");
  }

  if (input.imageBytes.byteLength > MAX_MODERATION_IMAGE_BYTES) {
    throw new Error("Generated image exceeds the moderation size limit.");
  }

  const imageBase64 = Buffer.from(input.imageBytes).toString("base64");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), input.timeoutMs ?? DEFAULT_MODERATION_TIMEOUT_MS);

  try {
    const response = await (input.fetcher ?? fetch)(MODERATION_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: [
          { type: "text", text: input.prompt },
          {
            type: "image_url",
            image_url: {
              url: `data:${input.imageContentType};base64,${imageBase64}`
            }
          }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`OpenAI moderation request failed with status ${response.status}.`);
    }

    const body = (await response.json()) as ModerationResponse;
    const result = body.results?.[0];

    if (typeof result?.flagged !== "boolean") {
      throw new Error("OpenAI moderation returned an invalid response.");
    }

    return {
      flagged: result.flagged,
      flaggedCategories: collectFlaggedCategories(result.categories),
      model: "omni-moderation-latest" as const
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
