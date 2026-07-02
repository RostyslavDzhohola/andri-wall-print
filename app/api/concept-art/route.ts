import { NextResponse } from "next/server";

import { AR_SAMPLE_IDS, DEFAULT_AR_SAMPLE, getArSample } from "@/lib/ar-sample";
import { LEAD_CONCEPT_PROMPT_MAX_LENGTH } from "@/lib/lead-request-contract";
import { generateOpenAiConceptImage, makeWallPrintConceptPrompt } from "@/lib/openai-image-provider";

export const runtime = "nodejs";
export const maxDuration = 60;

type ConceptArtRequestBody = {
  prompt?: unknown;
  selectedDesignId?: unknown;
};

function normalizePrompt(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ").slice(0, LEAD_CONCEPT_PROMPT_MAX_LENGTH) : "";
}

function resolveSelectedSample(value: unknown) {
  if (typeof value !== "string" || !AR_SAMPLE_IDS.includes(value)) {
    return DEFAULT_AR_SAMPLE;
  }

  return getArSample(value);
}

function failureStatus(code: string) {
  if (code === "missing_api_key") {
    return 503;
  }

  if (code === "refused") {
    return 422;
  }

  if (code === "timeout") {
    return 504;
  }

  return 502;
}

function publicFailureMessage(code: string) {
  if (code === "missing_api_key") {
    return "Artwork generation is not configured.";
  }

  if (code === "refused") {
    return "The image provider rejected this wall-print idea. Try a different description.";
  }

  if (code === "timeout") {
    return "Artwork generation timed out. Try again.";
  }

  return "Artwork generation is not configured correctly.";
}

export async function POST(request: Request) {
  let body: ConceptArtRequestBody;

  try {
    body = (await request.json()) as ConceptArtRequestBody;
  } catch {
    return NextResponse.json({ ok: false, message: "Send a wall-print idea to generate artwork." }, { status: 400 });
  }

  const prompt = normalizePrompt(body.prompt);

  if (!prompt) {
    return NextResponse.json({ ok: false, message: "Describe the wall print idea first." }, { status: 400 });
  }

  const selectedSample = resolveSelectedSample(body.selectedDesignId);
  const conceptPrompt = makeWallPrintConceptPrompt({
    businessName: "Wall Print Pro",
    conceptPrompt: `${prompt}. Use this selected proof as loose visual context, not a copy: ${selectedSample.title} - ${selectedSample.description}`,
    wallDescription: "Homepage instant artwork preview"
  });
  const result = await generateOpenAiConceptImage({
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_IMAGE_MODEL,
    print: selectedSample.print,
    prompt: conceptPrompt
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, message: publicFailureMessage(result.code) }, { status: failureStatus(result.code) });
  }

  return NextResponse.json(
    {
      ok: true,
      sample: {
        id: `generated-concept-${Date.now()}`,
        title: "Generated concept",
        description: prompt,
        print: selectedSample.print,
        assets: {
          poster: `data:${result.contentType};base64,${Buffer.from(result.bytes).toString("base64")}`,
          glb: "",
          usdz: ""
        }
      },
      generation: {
        model: result.model,
        size: result.size
      }
    },
    {
      headers: {
        "Cache-Control": "no-store"
      }
    }
  );
}
