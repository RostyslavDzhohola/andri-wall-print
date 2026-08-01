"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Script from "next/script";
import type { ReactNode } from "react";
import { createContext, useContext, useState } from "react";

import { NativeArLauncher, type ArDiagnostics } from "@/components/ar/native-ar-launcher";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { hasReadyArAssetUrls } from "@/lib/ar-launcher";
import { AR_SAMPLES, DEFAULT_AR_SAMPLE, type ArSample } from "@/lib/ar-sample";
import { cn } from "@/lib/utils";

type ArPreviewSurfaceProps = {
  samples?: ArSample[];
  heading: string;
  intro?: string;
  headingClassName?: string;
  eyebrow?: ReactNode;
  sideContent?: ReactNode;
  showPrintSizeGuide?: boolean;
  afterContent?: ReactNode;
};

type ArPreviewSelectionContextValue = {
  selectedIndex: number;
  selectedSample: ArSample;
  selectedBaseSample: ArSample;
  showPreviewSample: (sample: ArSample) => void;
};

const ArPreviewSelectionContext = createContext<ArPreviewSelectionContextValue | null>(null);

export function useArPreviewSelection() {
  const value = useContext(ArPreviewSelectionContext);

  if (!value) {
    throw new Error("useArPreviewSelection must be used inside ArPreviewSurface.");
  }

  return value;
}

export function ArPreviewSurface({
  samples = AR_SAMPLES,
  heading,
  intro,
  headingClassName,
  eyebrow,
  sideContent,
  showPrintSizeGuide = false,
  afterContent
}: ArPreviewSurfaceProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [previewSample, setPreviewSample] = useState<ArSample | null>(null);
  const selectedBaseSample = samples[selectedIndex] ?? samples[0] ?? DEFAULT_AR_SAMPLE;
  const selectedSample = previewSample ?? selectedBaseSample;
  const [diagnostics, setDiagnostics] = useState<ArDiagnostics | null>(null);
  const hasMultipleSamples = samples.length > 1;
  const hasReadyArAssets = hasReadyArAssetUrls(selectedSample);

  const selectPrevious = () => {
    setPreviewSample(null);
    setSelectedIndex((current) => (current - 1 + samples.length) % samples.length);
  };

  const selectNext = () => {
    setPreviewSample(null);
    setSelectedIndex((current) => (current + 1) % samples.length);
  };

  return (
    <ArPreviewSelectionContext.Provider value={{ selectedIndex, selectedSample, selectedBaseSample, showPreviewSample: setPreviewSample }}>
      <main className="min-h-screen bg-background text-foreground">
        <Script
          crossOrigin="anonymous"
          id="model-viewer"
          src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js"
          strategy="afterInteractive"
          type="module"
        />
        <section className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 pb-4 md:px-6">
          <div className="grid flex-1 gap-4 md:grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)] md:items-center">
            <section className="ar-hero-reveal grid content-center gap-4 py-3 md:min-h-[72vh] md:py-8">
              {eyebrow ? <div>{eyebrow}</div> : null}
              <h1 className={cn("max-w-none text-4xl font-semibold leading-[0.95] text-balance sm:max-w-[12ch] md:text-6xl lg:max-w-[9ch]", headingClassName)}>{heading}</h1>
              {intro ? <p className="max-w-lg text-base leading-7 text-muted-foreground">{intro}</p> : null}
              {sideContent ? <div className="max-w-lg">{sideContent}</div> : null}
            </section>

            <section className="ar-art-card relative flex flex-col overflow-hidden rounded-lg border bg-secondary shadow-[0_30px_90px_rgba(35,31,25,0.18)] md:min-h-[72vh]">
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.42)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.42)_1px,transparent_1px)] bg-[size:46px_46px]" />
              <img
                alt={`${selectedSample.title} wall print`}
                className={cn(
                  "wall-print-shadow relative z-10 mx-auto w-auto rounded-sm object-contain",
                  showPrintSizeGuide
                    ? "mt-10 max-h-[min(43vh,390px)] max-w-[calc(100%-3rem)] md:mt-14 md:max-h-[min(58vh,620px)]"
                    : "mt-6 h-[min(47vh,420px)] md:mt-8 md:h-[min(62vh,640px)]"
                )}
                data-testid="static-artwork-preview"
                decoding="async"
                draggable={false}
                fetchPriority="high"
                src={selectedSample.assets.poster}
                height={1600}
                width={1200}
              />
              <Card className="relative z-20 mx-3 mb-3 mt-4 bg-card/95 py-3 shadow-lg backdrop-blur" data-testid="artwork-controls">
                <CardContent className="px-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="order-1 ml-auto sm:order-2">
                      {hasReadyArAssets ? (
                        <NativeArLauncher sample={selectedSample} diagnostics={diagnostics} onDiagnosticsChange={setDiagnostics} />
                      ) : (
                        <Button className="min-h-10 rounded-full px-4" data-testid="ar-preview-unavailable" disabled type="button" variant="outline">
                          Preview only
                        </Button>
                      )}
                    </div>

                    {hasMultipleSamples ? (
                      <div className="order-2 flex items-center justify-start gap-2 sm:order-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Previous picture"
                              className="size-11 rounded-full"
                              data-testid="previous-artwork"
                              onClick={selectPrevious}
                              size="icon"
                              type="button"
                              variant="outline"
                            >
                              <ChevronLeft className="size-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Previous picture</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              aria-label="Next picture"
                              className="size-11 rounded-full"
                              data-testid="next-artwork"
                              onClick={selectNext}
                              size="icon"
                              type="button"
                              variant="outline"
                            >
                              <ChevronRight className="size-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Next picture</TooltipContent>
                        </Tooltip>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>
        </section>
        {afterContent}
      </main>
    </ArPreviewSelectionContext.Provider>
  );
}
