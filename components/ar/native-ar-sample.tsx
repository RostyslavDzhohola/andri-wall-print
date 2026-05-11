"use client";

import Link from "next/link";
import { Box, ExternalLink, ImageIcon, Ruler, Smartphone } from "lucide-react";
import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { AR_SAMPLE, formatMeters } from "@/lib/ar-sample";

export function NativeArSample() {
  useEffect(() => {
    void import("@google/model-viewer");
  }, []);

  return (
    <main className="min-h-screen bg-[#f7f5ef] text-[#171717]">
      <section className="mx-auto grid min-h-screen max-w-7xl gap-8 px-4 py-5 md:px-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(360px,0.72fr)] lg:items-center lg:py-8">
        <div className="flex min-h-[92vh] flex-col justify-between gap-8">
          <header className="flex items-center justify-between gap-3">
            <Link className="text-lg font-semibold tracking-[0px]" href="/">
              Preview Picture
            </Link>
            <Button asChild data-testid="header-picture-mode-link" variant="outline">
              <Link href={AR_SAMPLE.fallbackHref}>Picture mode</Link>
            </Button>
          </header>

          <div className="grid gap-7">
            <div className="grid gap-5">
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.98] tracking-[0px] text-balance md:text-7xl">
                Preview one real-size wall print in native AR.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-[#5f5c55] md:text-lg">
                This first proof uses a checked-in tall sample so iPhone Quick Look and Android Scene Viewer can validate wall placement before dynamic artwork generation is added.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <a
                  data-testid="open-ar-sample"
                  href={AR_SAMPLE.assets.usdz}
                  rel="ar"
                  aria-label="Open the static tall print in native AR"
                >
                  <Smartphone className="size-4" />
                  Open AR sample
                </a>
              </Button>
              <Button asChild size="lg" variant="secondary">
                <Link href={AR_SAMPLE.fallbackHref}>
                  <ImageIcon className="size-4" />
                  Open Picture mode
                </Link>
              </Button>
            </div>
          </div>

          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#d7d1c5] bg-[#fffdf8] p-4">
              <dt className="flex items-center gap-2 text-sm text-[#6a665f]">
                <Ruler className="size-4" />
                Physical size
              </dt>
              <dd className="mt-2 text-xl font-semibold">{AR_SAMPLE.print.label}</dd>
            </div>
            <div className="rounded-lg border border-[#d7d1c5] bg-[#fffdf8] p-4">
              <dt className="flex items-center gap-2 text-sm text-[#6a665f]">
                <Box className="size-4" />
                Model assets
              </dt>
              <dd className="mt-2 text-xl font-semibold">GLB + USDZ</dd>
            </div>
            <div className="rounded-lg border border-[#d7d1c5] bg-[#fffdf8] p-4">
              <dt className="flex items-center gap-2 text-sm text-[#6a665f]">
                <ExternalLink className="size-4" />
                Fallback
              </dt>
              <dd className="mt-2 text-xl font-semibold">Picture mode</dd>
            </div>
          </dl>
        </div>

        <div className="relative min-h-[68vh] overflow-hidden rounded-lg border border-[#d7d1c5] bg-[#ebe5d8] shadow-[0_30px_90px_rgba(35,31,25,0.18)]">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.42)_1px,transparent_1px),linear-gradient(rgba(255,255,255,0.42)_1px,transparent_1px)] bg-[size:46px_46px]" />
          <model-viewer
            alt={`${AR_SAMPLE.title}: ${AR_SAMPLE.print.label} ${AR_SAMPLE.print.aspectRatio} wall print`}
            ar
            ar-modes="quick-look scene-viewer webxr"
            camera-controls
            disable-zoom
            ios-src={AR_SAMPLE.assets.usdz}
            poster={AR_SAMPLE.assets.poster}
            reveal="auto"
            shadow-intensity="0.35"
            src={AR_SAMPLE.assets.glb}
            touch-action="pan-y"
            className="relative z-10 h-[68vh] min-h-[520px] w-full"
          />
          <div className="absolute bottom-4 left-4 right-4 z-20 rounded-lg border border-[#d7d1c5] bg-[#fffdf8]/94 p-4 text-sm leading-6 text-[#55514a] shadow-lg backdrop-blur">
            Native AR uses the model asset dimensions: {formatMeters(AR_SAMPLE.print.widthMeters)} wide by{" "}
            {formatMeters(AR_SAMPLE.print.heightMeters)} tall. The browser fallback stays separate at{" "}
            <Link className="font-semibold text-[#1c4f59] underline-offset-4 hover:underline" href={AR_SAMPLE.fallbackHref}>
              /picture-mode
            </Link>
            .
          </div>
        </div>
      </section>
    </main>
  );
}
