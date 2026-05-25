"use client";

import { ChevronLeft, ChevronRight, Ruler, Smartphone } from "lucide-react";
import Script from "next/script";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { AR_SAMPLES, DEFAULT_AR_SAMPLE, formatMeters } from "@/lib/ar-sample";

type ArDiagnostics = {
  quickLookRel: boolean;
  isIOS: boolean;
  isSafari: boolean;
  isWKWebViewLike: boolean;
  canActivateModelViewerAR: boolean | null;
};

type ModelViewerElement = HTMLElement & {
  activateAR?: () => Promise<void>;
  canActivateAR?: boolean;
};

export function NativeArSample() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedSample = AR_SAMPLES[selectedIndex] ?? DEFAULT_AR_SAMPLE;
  const quickLookUrl = `${selectedSample.assets.usdz}#allowsContentScaling=0`;
  const [diagnostics, setDiagnostics] = useState<ArDiagnostics | null>(null);
  const modelViewerRef = useRef<ModelViewerElement | null>(null);

  useEffect(() => {
    const modelViewer = modelViewerRef.current;

    if (!modelViewer) {
      return;
    }

    modelViewer.setAttribute("alt", `${selectedSample.title}: ${selectedSample.print.label} ${selectedSample.print.aspectRatio} wall print`);
    modelViewer.setAttribute("ios-src", selectedSample.assets.usdz);
    modelViewer.setAttribute("poster", selectedSample.assets.poster);
    modelViewer.setAttribute("src", selectedSample.assets.glb);
  }, [selectedSample.assets.glb, selectedSample.assets.poster, selectedSample.assets.usdz, selectedSample.print.aspectRatio, selectedSample.print.label, selectedSample.title]);

  useEffect(() => {
    const readDiagnostics = () => {
      const modelViewer = modelViewerRef.current;
      const anchor = document.createElement("a");
      const userAgent = window.navigator.userAgent;
      const webkitWindow = window as Window & { webkit?: { messageHandlers?: unknown } };

      setDiagnostics({
        quickLookRel: Boolean(anchor.relList?.supports?.("ar")),
        isIOS: /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1),
        isSafari: /Safari\//.test(userAgent) && !/CriOS\/|FxiOS\/|EdgiOS\//.test(userAgent),
        isWKWebViewLike: Boolean(webkitWindow.webkit?.messageHandlers),
        canActivateModelViewerAR: typeof modelViewer?.canActivateAR === "boolean" ? modelViewer.canActivateAR : null
      });
    };

    readDiagnostics();
    const timers = [window.setTimeout(readDiagnostics, 600), window.setTimeout(readDiagnostics, 1800)];

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [selectedSample.id]);

  const selectPrevious = () => {
    setSelectedIndex((current) => (current - 1 + AR_SAMPLES.length) % AR_SAMPLES.length);
  };

  const selectNext = () => {
    setSelectedIndex((current) => (current + 1) % AR_SAMPLES.length);
  };

  const placeInAr = (event: MouseEvent<HTMLAnchorElement>) => {
    const modelViewer = modelViewerRef.current;

    if (diagnostics?.quickLookRel || !modelViewer?.activateAR) {
      return;
    }

    event.preventDefault();
    void modelViewer.activateAR();
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
                Place this print on your wall.
              </h1>
              <p className="text-base leading-7 text-[#5f5c55]">
                Choose a picture, open native AR, and move around there to see how the selected print looks on the wall.
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
            <model-viewer
              alt={`${selectedSample.title}: ${selectedSample.print.label} ${selectedSample.print.aspectRatio} wall print`}
              ar
              ar-modes="quick-look scene-viewer"
              aria-hidden="true"
              data-testid="ar-launcher-model"
              ios-src={selectedSample.assets.usdz}
              poster={selectedSample.assets.poster}
              ref={modelViewerRef}
              reveal="manual"
              src={selectedSample.assets.glb}
              tabIndex={-1}
              className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
            />
            <div className="absolute bottom-4 left-4 right-4 z-20 rounded-lg border border-[#d7d1c5] bg-[#fffdf8]/95 p-3 shadow-lg backdrop-blur">
              <div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center">
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

                <div className="min-w-0 text-center sm:text-left">
                  <div className="truncate text-base font-semibold text-[#2f2b26]" data-testid="selected-artwork-title">
                    {selectedSample.title}
                  </div>
                  <div className="text-sm text-[#5f5a50]">
                    {formatMeters(selectedSample.print.widthMeters)} wide x {formatMeters(selectedSample.print.heightMeters)} tall
                  </div>
                </div>

                <a
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1c4f59] px-5 py-3 text-base font-semibold text-white shadow-[0_18px_38px_rgba(28,79,89,0.32)]"
                  data-testid="quick-look-link"
                  href={quickLookUrl}
                  onClick={placeInAr}
                  rel="ar"
                >
                  <img className="size-5 rounded-sm object-cover" src={selectedSample.assets.poster} alt="" aria-hidden="true" />
                  <Smartphone className="size-5" />
                  Place on wall
                </a>
              </div>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
