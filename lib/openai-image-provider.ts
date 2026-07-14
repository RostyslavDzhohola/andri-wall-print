export type OpenAiImageSuccess = {
  ok: true;
  bytes: Uint8Array;
  contentType: "image/png";
  model: string;
  quality: OpenAiImageQuality;
  size: OpenAiImageSize;
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

export type OpenAiImageQuality = "auto" | "low" | "medium" | "high";
export type OpenAiImageSize = "auto" | `${number}x${number}`;

type WallPrintShape = {
  aspectRatio?: string;
  widthMeters?: number;
  heightMeters?: number;
};

type GenerateOpenAiConceptImageOptions = {
  apiKey?: string;
  prompt: string;
  model?: string;
  print?: WallPrintShape;
  quality?: OpenAiImageQuality;
  size?: OpenAiImageSize;
  fetcher?: FetchLike;
  timeoutMs?: number;
};

const OPENAI_IMAGE_GENERATION_URL = "https://api.openai.com/v1/images/generations";
const DEFAULT_OPENAI_IMAGE_MODEL = "gpt-image-2";
const DEFAULT_OPENAI_IMAGE_QUALITY: OpenAiImageQuality = "auto";
const GPT_IMAGE_2_WALL_LONG_EDGE_PX = 1536;
const GPT_IMAGE_2_MIN_PIXELS = 655_360;
const GPT_IMAGE_2_MAX_ASPECT_RATIO = 3;
// gpt-image-2 regularly needs 45-90s for a full-quality render; Convex Node
// actions allow minutes and the UI polls asynchronously, so a tight budget
// only turns slow successes into timeouts.
const DEFAULT_TIMEOUT_MS = 120_000;

function safeMetadata(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

function sanitizeProviderBody(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sanitizeProviderBody);
  }

  if (typeof value !== "object" || value === null) {
    return value;
  }

  const sanitized: Record<string, unknown> = {};

  for (const [key, item] of Object.entries(value)) {
    if (key === "b64_json") {
      sanitized[key] = "[base64 image omitted]";
      continue;
    }

    sanitized[key] = sanitizeProviderBody(item);
  }

  return sanitized;
}

function providerMetadata(input: { body: unknown; model: string; quality: OpenAiImageQuality; size: OpenAiImageSize }) {
  return safeMetadata({
    request: {
      model: input.model,
      quality: input.quality,
      size: input.size,
      output_format: "png"
    },
    response: sanitizeProviderBody(input.body)
  });
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

function roundToMultipleOf16(value: number) {
  return Math.max(16, Math.round(value / 16) * 16);
}

function parseAspectRatio(value?: string) {
  if (!value) {
    return null;
  }

  const ratioParts = value.match(/^\s*(\d+(?:\.\d+)?)\s*[:/]\s*(\d+(?:\.\d+)?)\s*$/);

  if (ratioParts) {
    const width = Number(ratioParts[1]);
    const height = Number(ratioParts[2]);

    return width > 0 && height > 0 ? width / height : null;
  }

  const numeric = Number(value);

  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}

function wallPrintAspectRatio(print?: WallPrintShape) {
  if (print?.widthMeters && print.heightMeters && print.widthMeters > 0 && print.heightMeters > 0) {
    return print.widthMeters / print.heightMeters;
  }

  return parseAspectRatio(print?.aspectRatio) ?? 1;
}

function clampWallAspectRatio(ratio: number) {
  if (!Number.isFinite(ratio) || ratio <= 0) {
    return 1;
  }

  return Math.min(GPT_IMAGE_2_MAX_ASPECT_RATIO, Math.max(1 / GPT_IMAGE_2_MAX_ASPECT_RATIO, ratio));
}

function chooseGptImage2WallSize(print?: WallPrintShape): OpenAiImageSize {
  const ratio = clampWallAspectRatio(wallPrintAspectRatio(print));
  const landscape = ratio >= 1;
  let width = landscape ? GPT_IMAGE_2_WALL_LONG_EDGE_PX : roundToMultipleOf16(GPT_IMAGE_2_WALL_LONG_EDGE_PX * ratio);
  let height = landscape ? roundToMultipleOf16(GPT_IMAGE_2_WALL_LONG_EDGE_PX / ratio) : GPT_IMAGE_2_WALL_LONG_EDGE_PX;

  while (width * height < GPT_IMAGE_2_MIN_PIXELS) {
    width = roundToMultipleOf16(width * 1.1);
    height = roundToMultipleOf16(height * 1.1);
  }

  return `${width}x${height}`;
}

function chooseLegacyGptImageWallSize(print?: WallPrintShape): OpenAiImageSize {
  const ratio = wallPrintAspectRatio(print);

  if (ratio > 1.08) {
    return "1536x1024";
  }

  if (ratio < 0.92) {
    return "1024x1536";
  }

  return "1024x1024";
}

export function chooseWallPrintImageSize(input: { model?: string; print?: WallPrintShape } = {}): OpenAiImageSize {
  const model = input.model ?? DEFAULT_OPENAI_IMAGE_MODEL;

  return model.startsWith("gpt-image-2") ? chooseGptImage2WallSize(input.print) : chooseLegacyGptImageWallSize(input.print);
}

export function makeWallPrintConceptPrompt(input: { conceptPrompt: string; wallDescription?: string; businessName?: string }) {
  const context = [
    input.businessName ? `Business or space: ${input.businessName}.` : null,
    input.wallDescription ? `Wall context: ${input.wallDescription}.` : null
  ]
    .filter(Boolean)
    .join(" ");

  return [
    "Create one premium wall-print artwork concept for a commercial wall-printing sales draft.",
    "Make full-bleed rectangular artwork only, not a room mockup, frame, poster on a wall, UI, caption, or product sheet.",
    "Design for large-format wall printing: crisp edges, strong silhouettes, clean negative space, layered depth, balanced contrast, and details that read from across a room.",
    "Use a polished commercial mural style that can be reviewed by a seller before production.",
    "Avoid tiny text, fake logos, fake signatures, QR codes, pricing, invoices, contact details, measurement claims, watermarks, and borders.",
    "If the request mentions a brand or business, evoke the mood and category without inventing exact protected logos or unreadable typography.",
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
  const quality = options.quality ?? DEFAULT_OPENAI_IMAGE_QUALITY;
  const size = options.size ?? chooseWallPrintImageSize({ model, print: options.print });
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
        size,
        quality,
        output_format: "png"
      }),
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);
    const metadata = providerMetadata({ body, model, quality, size });

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
      quality,
      size,
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
