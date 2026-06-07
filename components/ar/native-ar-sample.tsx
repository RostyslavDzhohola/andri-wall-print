"use client";

import { ChevronLeft, ChevronRight, Ruler, Smartphone } from "lucide-react";
import Script from "next/script";
import { useState } from "react";

import { NativeArLauncher, type ArDiagnostics } from "@/components/ar/native-ar-launcher";
import { AR_SAMPLES, DEFAULT_AR_SAMPLE, formatMeters } from "@/lib/ar-sample";

type NativeArSampleProps = {
  samples?: typeof AR_SAMPLES;
  heading?: string;
  intro?: string;
};

export function NativeArSample({
  samples = AR_SAMPLES,
  heading = "Place this print on your wall.",
  intro = "Choose a picture, open native AR, and move around there to see how the selected print looks on the wall."
}: NativeArSampleProps) {
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
    <main className="min-h-screen bg-[#f7f5ef] text-[#171717]">
      <Script
        id="model-viewer"
        src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.2.0/model-viewer.min.js"
        strategy="afterInteractive"
        type="module"
      />
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
        <header className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold tracking-[0px]">Preview Picture</div>
          <div className="flex items-center gap-2 rounded-full border border-[#d7d1c5] bg-[#fffdf8] px-3 py-1.5 text-sm text-[#57534a]">
            <Ruler className="size-4" />
            {selectedSample.print.label}
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:items-stretch">
          <section className="flex flex-col justify-center gap-5 rounded-lg border border-[#d7d1c5] bg-[#fffdf8] p-5 md:p-7">
            <div className="grid gap-3">
              <h1 className="text-4xl font-semibold leading-none tracking-[0px] text-balance md:text-6xl">
                {heading}
              </h1>
              <p className="text-base leading-7 text-[#5f5c55]">
                {intro}
              </p>
            </div>

            <div className="rounded-lg border border-[#ded8cc] bg-[#f7f1e5] p-4 text-sm leading-6 text-[#4f4a42]">
              <div className="flex items-start gap-3">
                <Smartphone className="mt-0.5 size-4 shrink-0" />
                <span>Before AR, this page is only a still presentation. The picture can be moved only after the phone opens the native wall viewer.</span>
              </div>
            </div>

            {diagnostics ? (
              <details className="rounded-lg border border-[#ded8cc] bg-[#fbf7ef] p-3 text-xs leading-5 text-[#5f5a50]">
                <summary className="cursor-pointer font-semibold text-[#3d3932]">AR diagnostics</summary>
                <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                  <dt>iOS</dt>
                  <dd>{diagnostics.isIOS ? "yes" : "no"}</dd>
                  <dt>Safari</dt>
                  <dd>{diagnostics.isSafari ? "yes" : "no"}</dd>
                  <dt>Quick Look rel=ar</dt>
                  <dd>{diagnostics.quickLookRel ? "yes" : "no"}</dd>
                  <dt>model-viewer AR</dt>
                  <dd>{diagnostics.canActivateModelViewerAR === null ? "checking" : diagnostics.canActivateModelViewerAR ? "yes" : "no"}</dd>
                  <dt>WKWebView-like</dt>
                  <dd>{diagnostics.isWKWebViewLike ? "yes" : "no"}</dd>
                </dl>
              </details>
            ) : null}
          </section>

          <section className="relative min-h-[72vh] overflow-hidden rounded-lg border border-[#d7d1c5] bg-[#ebe5d8] shadow-[0_30px_90px_rgba(35,31,25,0.18)]">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.42)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.42)_1px,transparent_1px)] bg-[size:46px_46px]" />
            <img
              alt={`${selectedSample.title}: ${selectedSample.print.label} ${selectedSample.print.aspectRatio} wall print`}
              className="wall-print-shadow relative z-10 mx-auto mt-8 h-[min(62vh,640px)] w-auto rounded-sm object-contain"
              data-testid="static-artwork-preview"
              draggable={false}
              src={selectedSample.assets.poster}
            />
            <div className="absolute bottom-4 left-4 right-4 z-20 rounded-lg border border-[#d7d1c5] bg-[#fffdf8]/95 p-3 shadow-lg backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
                {hasMultipleSamples ? (
                  <div className="flex items-center justify-center gap-2">
                    <button
                      aria-label="Previous picture"
                      className="inline-flex size-11 items-center justify-center rounded-full border border-[#d7d1c5] bg-white text-[#3d3932] transition hover:border-[#1c4f59]"
                      data-testid="previous-artwork"
                      onClick={selectPrevious}
                      type="button"
                    >
                      <ChevronLeft className="size-5" />
                    </button>
                    <button
                      aria-label="Next picture"
                      className="inline-flex size-11 items-center justify-center rounded-full border border-[#d7d1c5] bg-white text-[#3d3932] transition hover:border-[#1c4f59]"
                      data-testid="next-artwork"
                      onClick={selectNext}
                      type="button"
                    >
                      <ChevronRight className="size-5" />
                    </button>
                  </div>
                ) : (
                  <div className="hidden sm:block" />
                )}

                <div className="min-w-0 text-center sm:text-left">
                  <div className="truncate text-base font-semibold text-[#2f2b26]" data-testid="selected-artwork-title">
                    {selectedSample.title}
                  </div>
                  <div className="text-sm text-[#5f5a50]">
                    {formatMeters(selectedSample.print.widthMeters)} wide x {formatMeters(selectedSample.print.heightMeters)} tall
                  </div>
                </div>

                <NativeArLauncher sample={selectedSample} diagnostics={diagnostics} onDiagnosticsChange={setDiagnostics} />
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
