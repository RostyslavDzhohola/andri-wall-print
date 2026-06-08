"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Script from "next/script";
import type { ReactNode } from "react";
import { useState } from "react";

import { NativeArLauncher, type ArDiagnostics } from "@/components/ar/native-ar-launcher";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AR_SAMPLES, DEFAULT_AR_SAMPLE, type ArSample } from "@/lib/ar-sample";

type ArPreviewSurfaceProps = {
  samples?: ArSample[];
  heading: string;
  intro: string;
  brandName?: string;
  headerAction?: ReactNode;
  afterContent?: ReactNode;
};

export function ArPreviewSurface({
  samples = AR_SAMPLES,
  heading,
  intro,
  brandName = "Wall Print Pro",
  headerAction,
  afterContent
}: ArPreviewSurfaceProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedSample = samples[selectedIndex] ?? samples[0] ?? DEFAULT_AR_SAMPLE;
  const [diagnostics, setDiagnostics] = useState<ArDiagnostics | null>(null);
  const hasMultipleSamples = samples.length > 1;

  const selectPrevious = () => {
    setSelectedIndex((current) => (current - 1 + samples.length) % samples.length);
  };

  const selectNext = () => {
    setSelectedIndex((current) => (current + 1) % samples.length);
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
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
        <header className="flex items-center justify-between gap-3">
          <BrandMark ariaLabel={`${brandName} homepage`} className="text-lg" label={brandName} />
          {headerAction ? <div className="flex items-center gap-3">{headerAction}</div> : null}
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,0.4fr)_minmax(0,0.6fr)] lg:items-center">
          <section className="grid content-center gap-4 py-3 md:py-8 lg:min-h-[72vh]">
            <h1 className="max-w-[9ch] text-4xl font-semibold leading-[0.95] text-balance sm:max-w-[12ch] md:text-6xl">{heading}</h1>
            <p className="max-w-lg text-base leading-7 text-muted-foreground">{intro}</p>
          </section>

          <section className="relative min-h-[540px] overflow-hidden rounded-lg border bg-secondary shadow-[0_30px_90px_rgba(35,31,25,0.18)] md:min-h-[72vh]">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.42)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.42)_1px,transparent_1px)] bg-[size:46px_46px]" />
            <img
              alt={`${selectedSample.title} wall print`}
              className="wall-print-shadow relative z-10 mx-auto mt-6 h-[min(47vh,420px)] w-auto rounded-sm object-contain md:mt-8 md:h-[min(62vh,640px)]"
              data-testid="static-artwork-preview"
              draggable={false}
              src={selectedSample.assets.poster}
            />
            <Card className="absolute bottom-4 left-4 right-4 z-20 bg-card/95 py-3 shadow-lg backdrop-blur">
              <CardContent className="px-3">
                <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                  {hasMultipleSamples ? (
                    <div className="flex items-center justify-center gap-2">
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
                  ) : (
                    <div className="hidden sm:block" />
                  )}

                  <div className="min-w-0 text-center sm:text-left">
                    <div className="truncate text-base font-semibold" data-testid="selected-artwork-title">
                      {selectedSample.title}
                    </div>
                  </div>

                  <NativeArLauncher sample={selectedSample} diagnostics={diagnostics} onDiagnosticsChange={setDiagnostics} />
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </section>
      {afterContent}
    </main>
  );
}
