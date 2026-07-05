"use client";

import { ArrowRight, Images, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";

import { useArPreviewSelection } from "@/components/ar/ar-preview-surface";
import type { ArSample } from "@/lib/ar-sample";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QrCode } from "@/components/ui/qr-code";
import { Textarea } from "@/components/ui/textarea";
import { isValidLeadEmail, LEAD_CONCEPT_PROMPT_MAX_LENGTH, normalizeLeadEmail } from "@/lib/lead-request-contract";
import {
  HOME_AT_CAPACITY_BODY,
  HOME_AT_CAPACITY_TITLE,
  HOME_COMPOSITE_ONLY_BODY,
  HOME_ENTRY_CHOOSE,
  HOME_ENTRY_DESCRIBE,
  HOME_ENTRY_UPLOAD,
  HOME_GENERATION_LICENSING_NOTE,
  HOME_GENERATION_LOADING,
  HOME_SEE_ON_WALL_CTA,
  HOME_UPLOAD_ACCEPTED_FORMATS,
  HOME_UPLOAD_ENTRY_BODY
} from "@/lib/product-copy";
import { cn } from "@/lib/utils";

type HomepageEntry = "choose" | "upload" | "describe";

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

// The QR code must always encode a scannable ABSOLUTE URL — phone cameras treat
// a bare path like "/gallery?designId=…" as plain text. Resolves relative paths
// against the current origin (the composite_only share state only renders
// client-side, after user interaction, so window is available there).
export function resolveAbsoluteShareUrl(url: string, origin?: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  const base = origin ?? (typeof window !== "undefined" ? window.location.origin : "");

  return base ? new URL(url, base).toString() : url;
}

// Picks the composite_only QR target: the shareable public preview URL when the
// draft reached `ready`, otherwise the concept's own poster image so the QR opens
// THIS concept on the phone — never the stock /gallery sample. Returns null when
// neither exists so the caller renders the composite message without a QR.
export function resolveCompositeShareTarget(input: { shareUrl: string | null; posterUrl: string | null }) {
  const url = input.shareUrl ?? input.posterUrl;

  if (!url) {
    return null;
  }

  return {
    url,
    // A resolved share URL points at the interactive preview page; the poster
    // fallback is just the concept image.
    title: input.shareUrl ? "Scan to open this concept on your phone" : "Scan to open your concept image on your phone"
  };
}

// Detects the daily-cap / rate-limit "come back tomorrow" outcome so the failed
// state can render the warm at-capacity card instead of a hard error.
export function isAtCapacityFailureMessage(message: string | null | undefined) {
  if (!message) {
    return false;
  }

  return message.startsWith("At capacity today.") || message.startsWith("Try tomorrow.");
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
  const [activeEntry, setActiveEntry] = useState<HomepageEntry>("describe");
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState<string | null>(null);
  const entryTabRefs = useRef<Partial<Record<HomepageEntry, HTMLButtonElement | null>>>({});
  const selectedDesignHref = `/gallery?designId=${encodeURIComponent(selectedBaseSample.id)}`;
  const uploadHref = "/request?intent=concept#lead-upload-section";

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
      setShareUrl(status.publicPreviewUrl ?? null);
      // composite_only never has publicPreviewUrl (only set on `ready`); fall back
      // to the concept's own poster so the QR opens THIS concept, not stock art.
      setPosterUrl(poster ?? null);
      setGenerationMessage(HOME_COMPOSITE_ONLY_BODY);
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
    setGenerationMessage(HOME_GENERATION_LOADING);
    setShareUrl(null);
    setPosterUrl(null);
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

  const isGenerating = generationStatus === "generating";
  const atCapacity = generationStatus === "failed" && isAtCapacityFailureMessage(generationMessage);
  const entries: { key: HomepageEntry; label: string; icon: typeof Images }[] = [
    { key: "choose", label: HOME_ENTRY_CHOOSE, icon: Images },
    { key: "upload", label: HOME_ENTRY_UPLOAD, icon: Upload },
    { key: "describe", label: HOME_ENTRY_DESCRIBE, icon: Sparkles }
  ];

  const handleEntryKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = entries.findIndex((entry) => entry.key === activeEntry);
    let nextIndex: number;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      const delta = event.key === "ArrowRight" ? 1 : -1;
      nextIndex = (currentIndex + delta + entries.length) % entries.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = entries.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    const next = entries[nextIndex];
    setActiveEntry(next.key);
    // Roving tabindex: focus must follow selection, or the visible focus ring
    // stays parked on a now tabIndex={-1} button.
    entryTabRefs.current[next.key]?.focus();
  };

  return (
    <div className="grid gap-4" data-testid="homepage-demo-actions">
      {/* Three-entry chooser — arrow-key navigable segmented control. */}
      <div
        aria-label="How would you like to start?"
        className="grid grid-cols-3 gap-1 rounded-full border bg-card/80 p-1 shadow-sm"
        onKeyDown={handleEntryKeyDown}
        role="tablist"
      >
        {entries.map((entry) => {
          const Icon = entry.icon;
          const selected = activeEntry === entry.key;

          return (
            <button
              aria-selected={selected}
              className={cn(
                "flex min-h-11 items-center justify-center gap-1.5 rounded-full px-2 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
              data-testid={`homepage-entry-${entry.key}`}
              key={entry.key}
              onClick={() => setActiveEntry(entry.key)}
              ref={(element) => {
                entryTabRefs.current[entry.key] = element;
              }}
              role="tab"
              tabIndex={selected ? 0 : -1}
              type="button"
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
              <span className="truncate">{entry.label}</span>
            </button>
          );
        })}
      </div>

      {/* Choose design — hand off to the gallery with the selected base sample. */}
      {activeEntry === "choose" ? (
        <div className="entry-crossfade grid gap-3 rounded-lg border bg-card/80 p-4 shadow-sm">
          <p className="text-sm leading-6 text-muted-foreground">
            Start from a Chicago design and place it on your wall in AR. Currently selected:{" "}
            <span className="font-semibold text-foreground">{selectedBaseSample.title}</span>.
          </p>
          <Button asChild className="min-h-11 w-fit rounded-full px-5" size="lg">
            <Link data-testid="homepage-selected-design-handoff" href={selectedDesignHref}>
              <Images className="size-4" aria-hidden="true" />
              {HOME_SEE_ON_WALL_CTA}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Upload art/logo — hand off to the contact-gated upload flow. */}
      {activeEntry === "upload" ? (
        <div className="entry-crossfade grid gap-3 rounded-lg border bg-card/80 p-4 shadow-sm">
          <p className="text-sm leading-6 text-muted-foreground">
            {HOME_UPLOAD_ENTRY_BODY} {HOME_UPLOAD_ACCEPTED_FORMATS}
          </p>
          <Button asChild className="min-h-11 w-fit rounded-full px-5" size="lg">
            <Link data-testid="homepage-upload-handoff" href={uploadHref}>
              <Upload className="size-4" aria-hidden="true" />
              {HOME_SEE_ON_WALL_CTA}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Describe idea — email-gated concept generation. */}
      {activeEntry === "describe" ? (
        <div className="entry-crossfade grid gap-3 rounded-lg border bg-card/80 p-4 shadow-sm">
          {atCapacity ? (
            <div
              className="grid gap-2 rounded-md border border-status-warning-border bg-status-warning p-4 text-status-warning-foreground"
              data-testid="homepage-at-capacity"
            >
              <p className="text-sm font-semibold">{HOME_AT_CAPACITY_TITLE}</p>
              <p className="text-sm leading-6">{HOME_AT_CAPACITY_BODY}</p>
            </div>
          ) : null}

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
            <Label htmlFor="homepage-concept">Describe your wall-print idea</Label>
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
              className="min-h-11 rounded-full px-5"
              data-testid="homepage-concept-generate"
              disabled={isGenerating}
              onClick={() => void generateConceptArtwork()}
              size="lg"
              type="button"
            >
              <Sparkles className="size-4" aria-hidden="true" />
              {isGenerating ? "Drafting concept" : HOME_SEE_ON_WALL_CTA}
              {isGenerating ? null : <ArrowRight className="size-4" aria-hidden="true" />}
            </Button>
            {canCheckAgain && lastLeadRequestId ? (
              <Button
                className="min-h-11 rounded-full px-4"
                data-testid="homepage-concept-check-again"
                disabled={isGenerating}
                onClick={() => void checkExistingConceptAgain()}
                size="lg"
                type="button"
                variant="outline"
              >
                Check again
              </Button>
            ) : null}
          </div>

          {isGenerating ? (
            <div
              className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium text-muted-foreground"
              data-testid="homepage-generation-progress"
            >
              <Sparkles className="size-4 shrink-0 text-primary motion-safe:animate-pulse" aria-hidden="true" />
              {HOME_GENERATION_LOADING}
            </div>
          ) : null}

          {generationStatus === "composite_only" ? (
            <div
              className="flex items-start gap-3 rounded-md border border-status-ready-border bg-status-ready p-3 text-status-ready-foreground"
              data-testid="homepage-composite-share"
            >
              {(() => {
                const target = resolveCompositeShareTarget({ shareUrl, posterUrl });

                return target ? <QrCode value={resolveAbsoluteShareUrl(target.url)} title={target.title} /> : null;
              })()}
              <p className="text-sm leading-6">{HOME_COMPOSITE_ONLY_BODY}</p>
            </div>
          ) : null}

          {generationMessage && !isGenerating && !atCapacity && generationStatus !== "composite_only" ? (
            <p className="text-sm font-medium text-muted-foreground" data-testid="homepage-concept-status">
              {generationMessage}
            </p>
          ) : (
            <span className="sr-only" data-testid="homepage-concept-status">
              {generationMessage ?? ""}
            </span>
          )}

          <p className="text-xs leading-5 text-muted-foreground">{HOME_GENERATION_LICENSING_NOTE}</p>
        </div>
      ) : null}

      <div className="rounded-lg border bg-muted/35 p-3 text-sm leading-6" data-testid="homepage-proof-note">
        Proof on screen: <span className="font-semibold">{selectedSample.title}</span>
      </div>
    </div>
  );
}
