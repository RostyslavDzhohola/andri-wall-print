"use client";

import { Images, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useArPreviewSelection } from "@/components/ar/ar-preview-surface";
import type { ArSample } from "@/lib/ar-sample";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { isValidLeadEmail, LEAD_CONCEPT_PROMPT_MAX_LENGTH, normalizeLeadEmail } from "@/lib/lead-request-contract";

type GenerationStatus = "idle" | "generating" | "ready" | "composite_only" | "failed";

type ConceptArtStartResponse =
  | {
      ok: true;
      code: "QUEUED";
      leadRequestId: string;
      message: string;
    }
  | {
      ok: false;
      code?: string;
      message: string;
    };

type ConceptArtStatusResponse =
  | {
      ok: true;
      leadRequestId: string;
      draftId: string;
      status: "queued" | "generating" | "ready" | "composite_only" | "failed";
      message: string;
      title: string;
      description: string;
      print?: ArSample["print"];
      assets?: {
        poster: string | null;
        glb?: string | null;
        usdz?: string | null;
      };
      publicPreviewUrl?: string;
    }
  | {
      ok: false;
      code?: string;
      message: string;
    };

const CONCEPT_STATUS_POLL_DELAY_MS = 1_200;
const CONCEPT_STATUS_MAX_POLLS = 80;
export const CONCEPT_STATUS_MAX_CONSECUTIVE_FETCH_FAILURES = 3;

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

class ConceptStatusPollGiveUpError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConceptStatusPollGiveUpError";
  }
}

export function canStartHomepageConceptGeneration(input: {
  status: GenerationStatus;
  prompt: string;
  email: string;
}) {
  return input.status !== "generating" && Boolean(input.prompt.trim()) && isValidLeadEmail(normalizeLeadEmail(input.email));
}

export function canRetryConceptStatusPollFailure(input: {
  consecutiveFailures: number;
  maxConsecutiveFailures?: number;
}) {
  return input.consecutiveFailures <= (input.maxConsecutiveFailures ?? CONCEPT_STATUS_MAX_CONSECUTIVE_FETCH_FAILURES);
}

function startFailureMessage(code: string | undefined, fallback: string) {
  if (code === "CONTACT_RATE_LIMITED") {
    return "Try tomorrow.";
  }

  if (code === "GLOBAL_DAILY_CAP_REACHED") {
    return "At capacity today.";
  }

  return fallback;
}

async function readJsonResponse<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function isTransientPollFailureStatus(status: number) {
  return status === 408 || status === 429 || status >= 500;
}

function conceptStatusPollFailureMessage(error: unknown) {
  return error instanceof Error ? error.message : "Concept preview status could not be checked.";
}

async function fetchConceptStatus(leadRequestId: string) {
  let response: Response;

  try {
    response = await fetch(`/api/concept-art?leadRequestId=${encodeURIComponent(leadRequestId)}`, {
      method: "GET",
      headers: {
        Accept: "application/json"
      },
      cache: "no-store"
    });
  } catch (error) {
    return {
      ok: false as const,
      message: conceptStatusPollFailureMessage(error)
    };
  }

  let result: ConceptArtStatusResponse;

  try {
    result = await readJsonResponse<ConceptArtStatusResponse>(response);
  } catch (error) {
    if (response.ok || isTransientPollFailureStatus(response.status)) {
      return {
        ok: false as const,
        message: conceptStatusPollFailureMessage(error)
      };
    }

    throw error;
  }

  if (!response.ok) {
    if (isTransientPollFailureStatus(response.status)) {
      return {
        ok: false as const,
        message: result.ok ? "Concept preview status could not be checked." : result.message
      };
    }

    throw new Error(result.ok ? "Concept preview status could not be checked." : result.message);
  }

  if (!result.ok) {
    throw new Error(result.message);
  }

  return {
    ok: true as const,
    result
  };
}

export function HomepageDemoActions() {
  const { selectedBaseSample, selectedSample, showPreviewSample } = useArPreviewSelection();
  const [conceptPrompt, setConceptPrompt] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>("idle");
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [lastLeadRequestId, setLastLeadRequestId] = useState<string | null>(null);
  const [canCheckAgain, setCanCheckAgain] = useState(false);
  const selectedDesignHref = `/gallery?designId=${encodeURIComponent(selectedBaseSample.id)}`;

  const pollConceptStatus = async (leadRequestId: string) => {
    let consecutiveFetchFailures = 0;

    for (let attempt = 0; attempt < CONCEPT_STATUS_MAX_POLLS; attempt += 1) {
      if (attempt > 0) {
        await wait(CONCEPT_STATUS_POLL_DELAY_MS);
      }

      const statusResult = await fetchConceptStatus(leadRequestId);

      if (!statusResult.ok) {
        consecutiveFetchFailures += 1;

        if (canRetryConceptStatusPollFailure({ consecutiveFailures: consecutiveFetchFailures })) {
          setGenerationMessage("Still checking the existing concept preview. Temporary connection issue; retrying...");
          continue;
        }

        throw new ConceptStatusPollGiveUpError(
          `${statusResult.message} Use Check again to resume this same request without submitting a new one.`
        );
      }

      consecutiveFetchFailures = 0;
      const result = statusResult.result;

      if (result.status === "queued" || result.status === "generating") {
        setGenerationMessage(result.message);
        continue;
      }

      return result;
    }

    throw new ConceptStatusPollGiveUpError("Concept preview is still preparing. Use Check again to resume this same request shortly.");
  };

  const applyConceptStatus = (status: Extract<ConceptArtStatusResponse, { ok: true }>) => {
    const poster = status.assets?.poster;

    if (status.status === "ready" && poster && status.assets?.glb && status.assets?.usdz) {
      showPreviewSample({
        id: `concept-${status.draftId}`,
        title: status.title,
        description: status.description,
        print: status.print ?? selectedBaseSample.print,
        assets: {
          poster,
          glb: status.assets.glb,
          usdz: status.assets.usdz
        }
      });
      setCanCheckAgain(false);
      setGenerationStatus("ready");
      setGenerationMessage("Artwork preview is ready for wall placement.");
      return;
    }

    if (status.status === "composite_only" && poster) {
      showPreviewSample({
        id: `concept-${status.draftId}`,
        title: status.title,
        description: status.description,
        print: status.print ?? selectedBaseSample.print,
        assets: {
          poster,
          glb: "",
          usdz: ""
        }
      });
      setCanCheckAgain(false);
      setGenerationStatus("composite_only");
      setGenerationMessage("leave this open / scan the QR / come back. Wall Print Pro will follow up by email.");
      return;
    }

    setCanCheckAgain(false);
    setGenerationStatus("failed");
    setGenerationMessage(status.message);
  };

  const pollAndApplyConceptStatus = async (leadRequestId: string) => {
    const status = await pollConceptStatus(leadRequestId);
    applyConceptStatus(status);
  };

  const handleConceptError = (error: unknown, leadRequestId: string | null) => {
    const canResume = error instanceof ConceptStatusPollGiveUpError && Boolean(leadRequestId);

    setCanCheckAgain(canResume);
    setGenerationStatus("failed");
    setGenerationMessage(error instanceof Error ? error.message : "Artwork generation failed.");
  };

  const generateConceptArtwork = async () => {
    const prompt = conceptPrompt.trim();
    const email = normalizeLeadEmail(contactEmail);

    if (generationStatus === "generating") {
      return;
    }

    if (!canStartHomepageConceptGeneration({ status: generationStatus, prompt, email })) {
      setGenerationStatus("idle");
      setGenerationMessage(!prompt ? "Describe the wall print idea first." : "Enter a valid email address to generate a concept draft.");
      setCanCheckAgain(false);
      return;
    }

    setGenerationStatus("generating");
    setGenerationMessage("Creating artwork and preparing the AR wall preview...");
    setCanCheckAgain(false);
    let submittedLeadRequestId: string | null = null;

    try {
      const response = await fetch("/api/concept-art", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          contactEmail: email,
          selectedDesignId: selectedBaseSample.id
        })
      });
      const result = await readJsonResponse<ConceptArtStartResponse>(response);

      if (!response.ok || !result.ok) {
        throw new Error(result.ok ? "Artwork generation failed." : startFailureMessage(result.code, result.message));
      }

      submittedLeadRequestId = result.leadRequestId;
      setLastLeadRequestId(submittedLeadRequestId);
      await pollAndApplyConceptStatus(submittedLeadRequestId);
    } catch (error) {
      handleConceptError(error, submittedLeadRequestId ?? lastLeadRequestId);
    }
  };

  const checkExistingConceptAgain = async () => {
    if (!lastLeadRequestId || generationStatus === "generating") {
      return;
    }

    setGenerationStatus("generating");
    setGenerationMessage("Checking the existing concept preview again...");
    setCanCheckAgain(false);

    try {
      await pollAndApplyConceptStatus(lastLeadRequestId);
    } catch (error) {
      handleConceptError(error, lastLeadRequestId);
    }
  };

  return (
    <div className="grid gap-4" data-testid="homepage-demo-actions">
      <div className="grid gap-2 sm:grid-cols-2">
        <Button asChild className="min-h-11 rounded-full px-5" size="lg">
          <Link data-testid="homepage-selected-design-handoff" href={selectedDesignHref}>
            <Images className="size-4" aria-hidden="true" />
            Choose design
          </Link>
        </Button>
        <Button asChild className="min-h-11 rounded-full px-5" size="lg" variant="outline">
          <Link href="/request?intent=concept#lead-upload-section">
            <Upload className="size-4" aria-hidden="true" />
            Upload art/logo
          </Link>
        </Button>
      </div>

      <div className="grid gap-2 rounded-lg border bg-card/80 p-3 shadow-sm">
        <div className="grid gap-2">
          <Label htmlFor="homepage-concept-email">Email</Label>
          <Input
            id="homepage-concept-email"
            inputMode="email"
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="you@example.com"
            type="email"
            value={contactEmail}
          />
        </div>
        <div className="grid gap-1">
          <Label htmlFor="homepage-concept">Describe idea</Label>
          <Textarea
            id="homepage-concept"
            maxLength={LEAD_CONCEPT_PROMPT_MAX_LENGTH}
            onChange={(event) => setConceptPrompt(event.target.value)}
            placeholder="Logo wall, Chicago skyline, kids area mural..."
            rows={3}
            value={conceptPrompt}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            className="min-h-10 rounded-full px-4"
            data-testid="homepage-concept-generate"
            disabled={generationStatus === "generating"}
            onClick={() => void generateConceptArtwork()}
            type="button"
          >
            <Sparkles className="size-4" aria-hidden="true" />
            {generationStatus === "generating" ? "Creating art" : "Generate concept"}
          </Button>
          {canCheckAgain && lastLeadRequestId ? (
            <Button
              className="min-h-10 rounded-full px-4"
              data-testid="homepage-concept-check-again"
              disabled={generationStatus === "generating"}
              onClick={() => void checkExistingConceptAgain()}
              type="button"
              variant="outline"
            >
              Check again
            </Button>
          ) : null}
          <span className="text-xs font-medium text-muted-foreground">Selected: {selectedBaseSample.title}</span>
        </div>
        {generationMessage ? (
          <p className="text-xs font-medium text-muted-foreground" data-testid="homepage-concept-status">
            {generationMessage}
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border bg-muted/35 p-3 text-sm leading-6" data-testid="homepage-proof-note">
        Proof on screen: <span className="font-semibold">{selectedSample.title}</span>
      </div>
    </div>
  );
}
