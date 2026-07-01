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
import { cn } from "@/lib/utils";

type ArPreviewSurfaceProps = {
  samples?: ArSample[];
  heading: string;
  intro?: string;
  brandName?: string;
  headerAction?: ReactNode;
  headingClassName?: string;
  sideContent?: ReactNode;
  showPrintSizeGuide?: boolean;
  afterContent?: ReactNode;
};

export function ArPreviewSurface({
  samples = AR_SAMPLES,
  heading,
  intro,
  brandName = "Wall Print Pro",
  headerAction,
  headingClassName,
  sideContent,
  showPrintSizeGuide = false,
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
        <header className="flex items-center justify-between gap-4 pt-1 sm:pt-0">
          <BrandMark ariaLabel={`${brandName} homepage`} className="min-w-0 text-base sm:text-lg" label={brandName} textClassName="truncate" />
          {headerAction ? <div className="flex shrink-0 items-center gap-3">{headerAction}</div> : null}
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,0.46fr)_minmax(0,0.54fr)] lg:items-center">
          <section className="grid content-center gap-4 py-3 md:py-8 lg:min-h-[72vh]">
            <h1 className={cn("max-w-none text-4xl font-semibold leading-[0.95] text-balance sm:max-w-[12ch] md:text-6xl lg:max-w-[9ch]", headingClassName)}>{heading}</h1>
            {intro ? <p className="max-w-lg text-base leading-7 text-muted-foreground">{intro}</p> : null}
            {sideContent ? <div className="max-w-lg">{sideContent}</div> : null}
          </section>

          <section className="relative flex flex-col overflow-hidden rounded-lg border bg-secondary shadow-[0_30px_90px_rgba(35,31,25,0.18)] md:min-h-[72vh]">
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
              draggable={false}
              src={selectedSample.assets.poster}
            />
            <Card className="relative z-20 mx-3 mb-3 mt-4 bg-card/95 py-3 shadow-lg backdrop-blur" data-testid="artwork-controls">
              <CardContent className="px-3">
                <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-3 sm:grid-cols-[auto_1fr_auto]">
                  {hasMultipleSamples ? (
                    <div className="flex items-center justify-start gap-2">
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

                  <div className={cn("min-w-0", hasMultipleSamples ? "text-left" : "col-span-2 text-center sm:col-span-1 sm:text-left")}>
                    <div className="truncate text-base font-semibold" data-testid="selected-artwork-title">
                      {selectedSample.title}
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1 sm:justify-self-end">
                    <NativeArLauncher sample={selectedSample} diagnostics={diagnostics} onDiagnosticsChange={setDiagnostics} />
                  </div>
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
