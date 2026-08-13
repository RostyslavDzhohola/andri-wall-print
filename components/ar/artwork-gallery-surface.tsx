"use client";

import { ChevronLeft, ChevronRight, MessageCircle } from "lucide-react";
import Link from "next/link";
import Script from "next/script";
import { useMemo, useRef, useState } from "react";

import { NativeArLauncher, type ArDiagnostics } from "@/components/ar/native-ar-launcher";
import { Button } from "@/components/ui/button";
import { AR_SAMPLES, DEFAULT_AR_SAMPLE, type ArSample } from "@/lib/ar-sample";
import type { PublicGalleryPage } from "@/lib/convex-public-gallery";
import { cn } from "@/lib/utils";

type ArtworkGallerySurfaceProps = {
  initialSampleId?: string;
  samples?: ArSample[];
  initialCommunityPage?: PublicGalleryPage;
};

export function ArtworkGallerySurface({
  initialSampleId,
  samples = AR_SAMPLES,
  initialCommunityPage = { samples: [], continueCursor: null, isDone: true }
}: ArtworkGallerySurfaceProps) {
  const [communitySamples, setCommunitySamples] = useState(initialCommunityPage.samples);
  const [continueCursor, setContinueCursor] = useState(initialCommunityPage.continueCursor);
  const [communityDone, setCommunityDone] = useState(initialCommunityPage.isDone);
  const [communityLoading, setCommunityLoading] = useState(false);
  const [communityError, setCommunityError] = useState<string | null>(null);
  const [selectedSampleId, setSelectedSampleId] = useState(initialSampleId ?? samples[0]?.id ?? DEFAULT_AR_SAMPLE.id);
  const [diagnostics, setDiagnostics] = useState<ArDiagnostics | null>(null);
  const previewRef = useRef<HTMLElement | null>(null);
  const allSamples = useMemo(() => [...samples, ...communitySamples], [communitySamples, samples]);
  const selectedSample = allSamples.find((sample) => sample.id === selectedSampleId) ?? allSamples[0] ?? DEFAULT_AR_SAMPLE;
  const hasMultipleSamples = allSamples.length > 1;
  const requestSelectedDesignHref = `/request?${new URLSearchParams({
    intent: "concept",
    ...(selectedSample.sourceKind === "community_ai"
      ? { gallerySlug: selectedSample.id }
      : { designId: selectedSample.id })
  }).toString()}`;

  const selectArtwork = (sampleId: string) => {
    const nextIndex = allSamples.findIndex((sample) => sample.id === sampleId);

    if (nextIndex < 0) {
      return;
    }

    setSelectedSampleId(allSamples[nextIndex].id);

    if (!window.matchMedia("(min-width: 1024px)").matches) {
      window.setTimeout(() => {
        previewRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
      }, 0);
    }
  };

  const selectPrevious = () => {
    const current = allSamples.findIndex((sample) => sample.id === selectedSample.id);
    setSelectedSampleId(allSamples[(current - 1 + allSamples.length) % allSamples.length].id);
  };

  const selectNext = () => {
    const current = allSamples.findIndex((sample) => sample.id === selectedSample.id);
    setSelectedSampleId(allSamples[(current + 1) % allSamples.length].id);
  };

  const loadMoreCommunityArtwork = async () => {
    if (communityLoading || communityDone || !continueCursor) {
      return;
    }

    setCommunityLoading(true);
    setCommunityError(null);

    try {
      const response = await fetch(`/api/gallery?cursor=${encodeURIComponent(continueCursor)}`, {
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error("Community artwork is temporarily unavailable.");
      }

      const nextPage = (await response.json()) as PublicGalleryPage;
      setCommunitySamples((current) => {
        const known = new Set(current.map((sample) => sample.id));
        return [...current, ...nextPage.samples.filter((sample) => !known.has(sample.id))];
      });
      setContinueCursor(nextPage.continueCursor);
      setCommunityDone(nextPage.isDone);
    } catch (error) {
      setCommunityError(error instanceof Error ? error.message : "Community artwork is temporarily unavailable.");
    } finally {
      setCommunityLoading(false);
    }
  };

  const renderArtworkCard = (sample: ArSample, index: number) => {
    const isSelected = sample.id === selectedSample.id;

    return (
      <button
        aria-label={sample.title ? `Select ${sample.title}` : `Select gallery image ${index + 1}`}
        aria-pressed={isSelected}
        className={cn(
          "group block overflow-hidden rounded-lg border bg-card text-left shadow-sm outline-offset-4 transition hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
          isSelected ? "border-primary shadow-[0_18px_42px_rgba(28,79,89,0.14)]" : "border-border"
        )}
        data-artwork-id={sample.id}
        data-testid="gallery-artwork-card"
        key={sample.id}
        onClick={() => selectArtwork(sample.id)}
        type="button"
      >
        <span className="relative block aspect-[4/3] overflow-hidden bg-secondary">
          <img
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            draggable={false}
            src={sample.assets.poster}
          />
          {sample.sourceKind === "community_ai" ? (
            <span className="absolute left-2 top-2 rounded-full bg-background/90 px-2.5 py-1 text-xs font-semibold text-foreground shadow-sm">
              AI concept
            </span>
          ) : null}
        </span>
        <span className="grid gap-0.5 px-3 py-2.5">
          <span className="text-sm font-semibold text-foreground" data-testid="gallery-artwork-card-title">{sample.title}</span>
          <span className="text-xs text-muted-foreground" data-testid="gallery-artwork-card-dimensions">{sample.print.label}</span>
        </span>
      </button>
    );
  };

  return (
    <main className="min-h-screen bg-background text-foreground">
      <Script
        crossOrigin="anonymous"
        id="model-viewer"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js"
        strategy="afterInteractive"
        type="module"
      />
      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-4 pt-4 md:px-6">
        <div className="grid gap-1">
          <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">Wall print gallery</h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base sm:leading-7">
            Browse ready-to-print designs, preview any of them on your wall, and request the one you want.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(380px,1.05fr)] lg:items-start">
          <section
            aria-label="Selected artwork wall view"
            className="grid gap-4 lg:sticky lg:top-24 lg:order-2"
            data-testid="gallery-selected-preview"
            ref={previewRef}
          >
            <div className="relative min-h-[430px] overflow-hidden rounded-lg border bg-secondary shadow-[0_30px_90px_rgba(35,31,25,0.16)] md:min-h-[620px]">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.42)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.42)_1px,transparent_1px)] bg-[size:46px_46px]" />
              <img
                alt="Selected gallery wall print"
                className="wall-print-shadow relative z-10 mx-auto mt-8 h-[min(46vh,380px)] w-auto rounded-sm object-contain md:mt-12 md:h-[min(56vh,520px)]"
                data-testid="gallery-selected-artwork"
                draggable={false}
                src={selectedSample.assets.poster}
              />
              <div className="relative z-20 mx-3 mb-3 mt-4 rounded-lg border bg-card/95 p-3 shadow-lg backdrop-blur md:absolute md:bottom-4 md:left-4 md:right-4 md:mx-0 md:mb-0 md:mt-0">
                <div className="grid gap-3">
                  <div className="grid gap-0.5">
                    <h2 className="text-lg font-semibold text-foreground" data-testid="gallery-selected-artwork-title">
                      {selectedSample.title}
                    </h2>
                    <p className="text-sm text-muted-foreground" data-testid="gallery-selected-print-size">
                      {selectedSample.print.label}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                  {hasMultipleSamples ? (
                    <div className="flex items-center gap-2">
                      <Button
                        aria-label="Previous artwork"
                        className="size-10 rounded-full"
                        data-testid="gallery-previous-artwork"
                        onClick={selectPrevious}
                        size="icon"
                        type="button"
                        variant="outline"
                      >
                        <ChevronLeft className="size-5" aria-hidden="true" />
                      </Button>
                      <Button
                        aria-label="Next artwork"
                        className="size-10 rounded-full"
                        data-testid="gallery-next-artwork"
                        onClick={selectNext}
                        size="icon"
                        type="button"
                        variant="outline"
                      >
                        <ChevronRight className="size-5" aria-hidden="true" />
                      </Button>
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <NativeArLauncher sample={selectedSample} diagnostics={diagnostics} onDiagnosticsChange={setDiagnostics} />
                    <Button asChild className="h-12 rounded-full px-5 text-base" variant="outline">
                      <Link data-testid="gallery-request-selected-design" href={requestSelectedDesignHref}>
                        <MessageCircle className="size-4" aria-hidden="true" />
                        Request this design
                      </Link>
                    </Button>
                  </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section aria-label="Artwork choices" className="grid gap-3 lg:order-1">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Ready-to-print designs</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Curated Wall Print Pro artwork.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2" data-testid="gallery-artwork-list">
              {samples.map(renderArtworkCard)}
            </div>
            {communitySamples.length || !communityDone ? (
              <div className="mt-5 grid gap-3" data-testid="community-gallery-section">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">Community AI concepts</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Anonymous concepts, shared with permission.
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2" data-testid="community-gallery-list">
                  {communitySamples.map((sample, index) => renderArtworkCard(sample, samples.length + index))}
                </div>
                {!communityDone ? (
                  <Button
                    className="w-fit rounded-full"
                    data-testid="community-gallery-load-more"
                    disabled={communityLoading}
                    onClick={() => void loadMoreCommunityArtwork()}
                    type="button"
                    variant="outline"
                  >
                    {communityLoading ? "Loading…" : "Load more"}
                  </Button>
                ) : null}
                {communityError ? <p className="text-sm text-muted-foreground" role="status">{communityError}</p> : null}
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}
