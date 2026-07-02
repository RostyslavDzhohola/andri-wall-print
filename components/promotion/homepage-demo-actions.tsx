"use client";

import { Images, Sparkles, Upload } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useArPreviewSelection } from "@/components/ar/ar-preview-surface";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { LEAD_CONCEPT_PROMPT_MAX_LENGTH } from "@/lib/lead-request-contract";

function requestHrefForConceptPrompt(prompt: string) {
  const trimmedPrompt = prompt.trim();

  if (!trimmedPrompt) {
    return "/request?intent=concept#lead-concept";
  }

  const params = new URLSearchParams({
    intent: "concept",
    conceptPrompt: trimmedPrompt.slice(0, LEAD_CONCEPT_PROMPT_MAX_LENGTH)
  });

  return `/request?${params.toString()}`;
}

export function HomepageDemoActions() {
  const { selectedSample } = useArPreviewSelection();
  const [conceptPrompt, setConceptPrompt] = useState("");
  const selectedDesignHref = `/gallery?designId=${encodeURIComponent(selectedSample.id)}`;
  const conceptHref = useMemo(() => requestHrefForConceptPrompt(conceptPrompt), [conceptPrompt]);

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
          <Button asChild className="min-h-10 rounded-full px-4">
            <Link data-testid="homepage-concept-handoff" href={conceptHref}>
              <Sparkles className="size-4" aria-hidden="true" />
              Describe idea
            </Link>
          </Button>
          <span className="text-xs font-medium text-muted-foreground">Selected: {selectedSample.title}</span>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/35 p-3 text-sm leading-6" data-testid="homepage-proof-note">
        Proof on screen: <span className="font-semibold">{selectedSample.title}</span>
      </div>
    </div>
  );
}
