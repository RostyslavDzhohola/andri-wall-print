"use client";

import { Images, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useArPreviewSelection } from "@/components/ar/ar-preview-surface";
import type { ArSample } from "@/lib/ar-sample";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_CONCEPT_PROMPT_MAX_LENGTH } from "@/lib/lead-request-contract";

type ConceptArtResponse =
  | {
      ok: true;
      sample: ArSample;
    }
  | {
      ok: false;
      message: string;
    };

export function HomepageDemoActions() {
  const { selectedBaseSample, selectedSample, showPreviewSample } = useArPreviewSelection();
  const [conceptPrompt, setConceptPrompt] = useState("");
  const [generationStatus, setGenerationStatus] = useState<"idle" | "generating" | "ready">("idle");
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const selectedDesignHref = `/gallery?designId=${encodeURIComponent(selectedBaseSample.id)}`;

  const generateConceptArtwork = async () => {
    const prompt = conceptPrompt.trim();

    if (!prompt) {
      setGenerationStatus("idle");
      setGenerationMessage("Describe the wall print idea first.");
      return;
    }

    setGenerationStatus("generating");
    setGenerationMessage("Creating artwork preview...");

    try {
      const response = await fetch("/api/concept-art", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt,
          selectedDesignId: selectedBaseSample.id
        })
      });
      const result = (await response.json()) as ConceptArtResponse;

      if (!response.ok || !result.ok) {
        throw new Error(result.ok ? "Artwork generation failed." : result.message);
      }

      showPreviewSample(result.sample);
      setGenerationStatus("ready");
      setGenerationMessage("Artwork created on this page.");
    } catch (error) {
      setGenerationStatus("idle");
      setGenerationMessage(error instanceof Error ? error.message : "Artwork generation failed.");
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
            {generationStatus === "generating" ? "Creating art" : "Describe idea"}
          </Button>
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
