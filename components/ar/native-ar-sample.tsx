"use client";

import { Box, Ruler, Smartphone } from "lucide-react";
import { useEffect } from "react";

import { AR_SAMPLE, formatMeters } from "@/lib/ar-sample";

export function NativeArSample() {
  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#171717]">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col gap-4 px-4 py-4 md:px-6">
        <header className="flex items-center justify-between gap-3">
          <div className="text-lg font-semibold tracking-[0px]">Preview Picture</div>
          <div className="flex items-center gap-2 rounded-full border border-[#d7d1c5] bg-[#fffdf8] px-3 py-1.5 text-sm text-[#57534a]">
            <Ruler className="size-4" />
            {AR_SAMPLE.print.label}
          </div>
        </header>

        <div className="grid flex-1 gap-4 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)] lg:items-stretch">
          <section className="flex flex-col justify-center gap-5 rounded-lg border border-[#d7d1c5] bg-[#fffdf8] p-5 md:p-7">
            <div className="grid gap-3">
              <h1 className="text-4xl font-semibold leading-none tracking-[0px] text-balance md:text-6xl">
                Place this print on your wall.
              </h1>
              <p className="text-base leading-7 text-[#5f5c55]">
                Open this page on your phone, tap the AR button, point at a wall, and place the real-size 45 x 90 cm print.
              </p>
            </div>

            <div className="grid gap-3 rounded-lg border border-[#ded8cc] bg-[#f7f1e5] p-4 text-sm leading-6 text-[#4f4a42]">
              <div className="flex items-start gap-3">
                <Smartphone className="mt-0.5 size-4 shrink-0" />
                <span>Use iPhone Safari or Android Chrome. Desktop browsers may only show the model preview.</span>
              </div>
              <div className="flex items-start gap-3">
                <Box className="mt-0.5 size-4 shrink-0" />
                <span>The AR viewer is native: Quick Look on iPhone, Scene Viewer where supported on Android.</span>
              </div>
            </div>
          </section>

          <div className="relative min-h-[72vh] overflow-hidden rounded-lg border border-[#d7d1c5] bg-[#ebe5d8] shadow-[0_30px_90px_rgba(35,31,25,0.18)]">
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.42)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.42)_1px,transparent_1px)] bg-[size:46px_46px]" />
            <model-viewer
              alt={`${AR_SAMPLE.title}: ${AR_SAMPLE.print.label} ${AR_SAMPLE.print.aspectRatio} wall print`}
              ar
              ar-modes="quick-look scene-viewer"
              camera-controls
              disable-zoom
              ios-src={AR_SAMPLE.assets.usdz}
              poster={AR_SAMPLE.assets.poster}
              reveal="auto"
              shadow-intensity="0.35"
              src={AR_SAMPLE.assets.glb}
              touch-action="pan-y"
              className="relative z-10 h-[72vh] min-h-[520px] w-full"
            >
              <button
                className="absolute bottom-5 left-1/2 z-20 flex min-h-12 -translate-x-1/2 items-center justify-center gap-2 rounded-full bg-[#1c4f59] px-6 py-3 text-base font-semibold text-white shadow-[0_18px_38px_rgba(28,79,89,0.32)]"
                data-testid="place-print-button"
                slot="ar-button"
                type="button"
              >
                <Smartphone className="size-5" />
                Place print on wall
              </button>
            </model-viewer>
            <div className="absolute left-4 top-4 z-20 rounded-full border border-[#d7d1c5] bg-[#fffdf8]/94 px-4 py-2 text-sm font-medium text-[#55514a] shadow-lg backdrop-blur">
              {formatMeters(AR_SAMPLE.print.widthMeters)} wide x {formatMeters(AR_SAMPLE.print.heightMeters)} tall
            </div>
            <div className="absolute bottom-4 left-4 right-4 z-10 rounded-lg border border-[#d7d1c5] bg-[#fffdf8]/90 p-3 text-center text-sm text-[#55514a] shadow-lg backdrop-blur md:hidden">
              If the AR button is not visible, open this page in Safari or Chrome on a supported phone.
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
