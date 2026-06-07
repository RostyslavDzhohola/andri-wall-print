"use client";

import { Smartphone } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { getFixedScaleQuickLookHref } from "@/lib/ar-launcher";
import type { ArSample } from "@/lib/ar-sample";

export type ArDiagnostics = {
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

type NativeArLauncherProps = {
  sample: ArSample;
  diagnostics: ArDiagnostics | null;
  onDiagnosticsChange: (diagnostics: ArDiagnostics) => void;
};

export function NativeArLauncher({ sample, diagnostics, onDiagnosticsChange }: NativeArLauncherProps) {
  const quickLookUrl = getFixedScaleQuickLookHref(sample.assets.usdz);
  const modelViewerRef = useRef<ModelViewerElement | null>(null);
  const [arError, setArError] = useState<string | null>(null);

  useEffect(() => {
    const modelViewer = modelViewerRef.current;

    if (!modelViewer) {
      return;
    }

    modelViewer.setAttribute("alt", `${sample.title}: ${sample.print.label} ${sample.print.aspectRatio} wall print`);
    modelViewer.setAttribute("ar-placement", "wall");
    modelViewer.setAttribute("ar-scale", "fixed");
    modelViewer.setAttribute("ios-src", sample.assets.usdz);
    modelViewer.setAttribute("poster", sample.assets.poster);
    modelViewer.setAttribute("src", sample.assets.glb);
  }, [sample.assets.glb, sample.assets.poster, sample.assets.usdz, sample.print.aspectRatio, sample.print.label, sample.title]);

  useEffect(() => {
    const readDiagnostics = () => {
      const modelViewer = modelViewerRef.current;
      const anchor = document.createElement("a");
      const userAgent = window.navigator.userAgent;
      const webkitWindow = window as Window & { webkit?: { messageHandlers?: unknown } };

      onDiagnosticsChange({
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
  }, [onDiagnosticsChange, sample.id]);

  const placeInAr = (event: MouseEvent<HTMLAnchorElement>) => {
    const modelViewer = modelViewerRef.current;

    if (diagnostics?.quickLookRel || !modelViewer?.activateAR) {
      return;
    }

    event.preventDefault();
    setArError(null);
    void modelViewer.activateAR().catch((error: unknown) => {
      console.error("Failed to activate native AR.", error);
      setArError("AR could not start from this browser. Open this preview in Safari on iPhone or Chrome on Android.");
    });
  };

  return (
    <div className="grid gap-2 sm:justify-items-end">
      <model-viewer
        alt={`${sample.title}: ${sample.print.label} ${sample.print.aspectRatio} wall print`}
        ar
        ar-modes="quick-look scene-viewer"
        ar-placement="wall"
        ar-scale="fixed"
        aria-hidden="true"
        data-testid="ar-launcher-model"
        ios-src={sample.assets.usdz}
        poster={sample.assets.poster}
        ref={modelViewerRef}
        reveal="manual"
        src={sample.assets.glb}
        tabIndex={-1}
        className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
      />
      <a
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#1c4f59] px-5 py-3 text-base font-semibold text-white shadow-[0_18px_38px_rgba(28,79,89,0.32)]"
        data-testid="quick-look-link"
        href={quickLookUrl}
        onClick={placeInAr}
        rel="ar"
      >
        <img className="size-5 rounded-sm object-cover" src={sample.assets.poster} alt="" aria-hidden="true" />
        <Smartphone className="size-5" />
        Place on wall
      </a>
      {arError ? (
        <p aria-live="polite" className="max-w-64 text-center text-xs font-medium leading-5 text-[#8d2f22] sm:text-right">
          {arError}
        </p>
      ) : null}
    </div>
  );
}
