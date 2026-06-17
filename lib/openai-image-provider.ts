export type OpenAiImageSuccess = {
  ok: true;
  bytes: Uint8Array;
  contentType: "image/png";
  model: string;
  metadata: string;
};

export type OpenAiImageFailure = {
  ok: false;
  code: "missing_api_key" | "provider_error" | "refused" | "timeout" | "invalid_response";
  reason: string;
  metadata?: string;
};

export type OpenAiImageResult = OpenAiImageSuccess | OpenAiImageFailure;

type FetchLike = typeof fetch;

type GenerateOpenAiConceptImageOptions = {
  apiKey?: string;
  prompt: string;
  model?: string;
  fetcher?: FetchLike;
  timeoutMs?: number;
};

const OPENAI_IMAGE_GENERATION_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-1";
const DEFAULT_TIMEOUT_MS = 45_000;

function safeMetadata(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

function decodeBase64Image(value: string) {
  if (typeof Buffer !== "undefined") {
    return new Uint8Array(Buffer.from(value, "base64"));
  }

  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function extractProviderReason(body: unknown) {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const record = body as Record<string, unknown>;
  const error = record.error;

  if (typeof error === "object" && error !== null && typeof (error as Record<string, unknown>).message === "string") {
    return (error as Record<string, string>).message;
  }

  return typeof record.message === "string" ? record.message : null;
}

export function makeWallPrintConceptPrompt(input: { conceptPrompt: string; wallDescription?: string; businessName?: string }) {
  const context = [
    input.businessName ? `Business or space: ${input.businessName}.` : null,
    input.wallDescription ? `Wall context: ${input.wallDescription}.` : null
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "Create one polished wall-print artwork concept for a commercial wall-printing sales draft.",
    "The output should be a clean rectangular artwork image suitable for previewing as a printed wall graphic.",
    "Do not include pricing, invoices, QR codes, contact details, or measurement claims.",
    context,
    `Client idea: ${input.conceptPrompt}`
  ]
    .filter(Boolean)
    .join(" ");
}

export async function generateOpenAiConceptImage(options: GenerateOpenAiConceptImageOptions): Promise<OpenAiImageResult> {
  if (!options.apiKey) {
    return {
      ok: false,
      code: "missing_api_key",
      reason: "AI concept drafting is not configured."
    };
  }

  const model = options.model ?? DEFAULT_OPENAI_IMAGE_MODEL;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_TIMEOUT_MS);

  try {
    const response = await (options.fetcher ?? fetch)(OPENAI_IMAGE_GENERATION_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        prompt: options.prompt,
        n: 1,
        size: "1024x1024",
        quality: "low",
        output_format: "png"
      }),
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);
    const metadata = safeMetadata(body);

    if (!response.ok) {
      const reason = extractProviderReason(body) ?? "The AI image provider rejected this concept draft.";
      const lowerReason = reason.toLowerCase();

      return {
        ok: false,
        code: lowerReason.includes("safety") || lowerReason.includes("policy") || lowerReason.includes("refus") ? "refused" : "provider_error",
        reason,
        metadata
      };
    }

    const firstImage = typeof body === "object" && body !== null && Array.isArray((body as Record<string, unknown>).data)
      ? ((body as { data: Array<Record<string, unknown>> }).data[0] ?? null)
      : null;
    const b64Json = firstImage && typeof firstImage.b64_json === "string" ? firstImage.b64_json : null;

    if (!b64Json) {
      return {
        ok: false,
        code: "invalid_response",
        reason: "The AI image provider did not return image data.",
        metadata
      };
    }

    return {
      ok: true,
      bytes: decodeBase64Image(b64Json),
      contentType: "image/png",
      model,
      metadata
    };
  } catch (error) {
    return {
      ok: false,
      code: error instanceof Error && error.name === "AbortError" ? "timeout" : "provider_error",
      reason: error instanceof Error && error.name === "AbortError" ? "AI concept drafting timed out." : "AI concept drafting failed."
    };
  } finally {
    clearTimeout(timeout);
  }
}
