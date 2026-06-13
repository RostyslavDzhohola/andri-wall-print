"use client";

import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getResizableQuickLookHref } from "@/lib/ar-launcher";
import type { ArSample } from "@/lib/ar-sample";
import { cn } from "@/lib/utils";

export type ArDiagnostics = {
  quickLookRel: boolean;
  isIPhone: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isLikelyPhoneOrTablet: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isBrowserUnknown: boolean;
  isWKWebViewLike: boolean;
  canActivateModelViewerAR: boolean | null;
};

type ArAccessNotice = {
  message: string;
  title: string;
  description: string;
  blockLaunch: boolean;
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

function getBrowserDeviceDiagnostics(modelViewer: ModelViewerElement | null): ArDiagnostics {
  const anchor = document.createElement("a");
  const userAgent = window.navigator.userAgent;
  const navigatorWithUserAgentData = navigator as Navigator & {
    userAgentData?: {
      mobile?: boolean;
    };
  };
  const isIPadOSDesktopMode = navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
  const isIPhone = /iPhone/.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/.test(userAgent) || isIPadOSDesktopMode;
  const isAndroid = /Android/.test(userAgent);
  const isKnownIOSNonSafari = /CriOS\/|FxiOS\/|EdgiOS\/|OPiOS\/|DuckDuckGo\/|FBAN|FBAV|Instagram|Line\//.test(userAgent);
  const isChrome = /Chrome\/|CriOS\//.test(userAgent) && !/Edg\/|EdgiOS\/|OPR\//.test(userAgent);
  const isSafari = /Version\/[\d.]+.*Safari\//.test(userAgent) && !isKnownIOSNonSafari && !/Chrome\/|Chromium\/|Edg\//.test(userAgent);
  const isTouchCapable = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
  const hasCoarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const hasHoverPointer = window.matchMedia?.("(hover: hover)").matches ?? false;
  const isLikelyPhoneOrTablet =
    isIOS || isAndroid || Boolean(navigatorWithUserAgentData.userAgentData?.mobile) || (isTouchCapable && hasCoarsePointer && !hasHoverPointer);
  const webkitWindow = window as Window & { webkit?: { messageHandlers?: unknown } };
  const isBrowserUnknown = isLikelyPhoneOrTablet && !isSafari && !isChrome && !isKnownIOSNonSafari;

  return {
    quickLookRel: Boolean(anchor.relList?.supports?.("ar")),
    isIPhone,
    isIOS,
    isAndroid,
    isLikelyPhoneOrTablet,
    isSafari,
    isChrome,
    isBrowserUnknown,
    isWKWebViewLike: Boolean(webkitWindow.webkit?.messageHandlers),
    canActivateModelViewerAR: typeof modelViewer?.canActivateAR === "boolean" ? modelViewer.canActivateAR : null
  };
}

function getArAccessNotice(diagnostics: ArDiagnostics | null): ArAccessNotice | null {
  if (!diagnostics) {
    return {
      message: "Checking device and browser.",
      title: "Checking your browser",
      description: "Wall placement only works on iPhone in Safari. Try again after this browser check finishes.",
      blockLaunch: true
    };
  }

  if (!diagnostics.isLikelyPhoneOrTablet) {
    return {
      message: "Requires iPhone Safari.",
      title: "Open this on iPhone Safari",
      description: "This wall placement only works on iPhone in Safari. Desktop browsers can preview the artwork, but they cannot launch the wall placement viewer.",
      blockLaunch: true
    };
  }

  if (diagnostics.isIPhone && diagnostics.isSafari) {
    return null;
  }

  if (diagnostics.isIPhone && !diagnostics.isBrowserUnknown) {
    return {
      message: "Use Safari on iPhone.",
      title: "Use Safari on this iPhone",
      description: "This wall placement only works on iPhone in Safari. Open this same link in Safari, then tap Place on wall again.",
      blockLaunch: true
    };
  }

  if (diagnostics.isAndroid) {
    return {
      message: "Requires iPhone Safari.",
      title: "Open this on iPhone Safari",
      description: "This wall placement only works on iPhone in Safari. This device can preview the artwork, but it cannot launch the iPhone wall placement viewer.",
      blockLaunch: true
    };
  }

  if (diagnostics.isBrowserUnknown) {
    return {
      message: "Browser not confirmed.",
      title: "Browser not confirmed",
      description: "We could not confirm that this is iPhone Safari. This wall placement only works on iPhone in Safari.",
      blockLaunch: true
    };
  }

  return {
    message: "Requires iPhone Safari.",
    title: "Open this on iPhone Safari",
    description: "This wall placement only works on iPhone in Safari.",
    blockLaunch: true
  };
}

export function NativeArLauncher({ sample, diagnostics, onDiagnosticsChange }: NativeArLauncherProps) {
  const quickLookUrl = getResizableQuickLookHref(sample.assets.usdz);
  const modelViewerRef = useRef<ModelViewerElement | null>(null);
  const [arError, setArError] = useState<string | null>(null);
  const [preLaunchDialogOpen, setPreLaunchDialogOpen] = useState(false);
  const [dialogNotice, setDialogNotice] = useState<ArAccessNotice | null>(null);
  const accessNotice = getArAccessNotice(diagnostics);

  useEffect(() => {
    const modelViewer = modelViewerRef.current;

    if (!modelViewer) {
      return;
    }

    modelViewer.setAttribute("alt", `${sample.title} wall print`);
    modelViewer.setAttribute("ar-placement", "wall");
    modelViewer.setAttribute("ar-scale", "auto");
    modelViewer.setAttribute("ios-src", sample.assets.usdz);
    modelViewer.setAttribute("poster", sample.assets.poster);
    modelViewer.setAttribute("src", sample.assets.glb);
  }, [sample.assets.glb, sample.assets.poster, sample.assets.usdz, sample.title]);

  useEffect(() => {
    const readDiagnostics = () => {
      const modelViewer = modelViewerRef.current;

      onDiagnosticsChange(getBrowserDeviceDiagnostics(modelViewer));
    };

    readDiagnostics();
    const timers = [window.setTimeout(readDiagnostics, 600), window.setTimeout(readDiagnostics, 1800)];

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [onDiagnosticsChange, sample.id]);

  const placeInAr = (event: MouseEvent<HTMLAnchorElement>) => {
    const modelViewer = modelViewerRef.current;
    const currentDiagnostics = getBrowserDeviceDiagnostics(modelViewer);
    const currentAccessNotice = getArAccessNotice(currentDiagnostics);

    onDiagnosticsChange(currentDiagnostics);

    if (currentAccessNotice?.blockLaunch) {
      event.preventDefault();
      setArError(null);
      setDialogNotice(currentAccessNotice);
      return;
    }

    if (currentDiagnostics.isIPhone && currentDiagnostics.isSafari) {
      event.preventDefault();
      setArError(null);
      setDialogNotice(null);
      setPreLaunchDialogOpen(true);
      return;
    }

    if (currentDiagnostics.quickLookRel || !modelViewer?.activateAR) {
      return;
    }

    event.preventDefault();
    setArError(null);
    setDialogNotice(null);
    void modelViewer.activateAR().catch((error: unknown) => {
      console.error("Failed to activate native AR.", error);
      setArError("Wall preview could not start from this browser. Open this client preview page in Safari on iPhone.");
    });
  };

  return (
    <div className="grid gap-2 sm:justify-items-end">
      <model-viewer
        alt={`${sample.title} wall print`}
        ar
        ar-modes="quick-look scene-viewer"
        ar-placement="wall"
        ar-scale="auto"
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
      <Tooltip>
        <TooltipTrigger asChild>
          <a
            className={cn(
              buttonVariants(),
              "h-12 rounded-full px-5 py-3 text-base shadow-[0_18px_38px_rgba(28,79,89,0.32)]"
            )}
            data-testid="quick-look-link"
            href={quickLookUrl}
            onClick={placeInAr}
            rel="ar"
            title={accessNotice?.message ?? "Place this print on a wall"}
          >
            <img className="sr-only" src={sample.assets.poster} alt="" aria-hidden="true" />
            Place on wall
          </a>
        </TooltipTrigger>
        <TooltipContent
          className="max-w-64 text-center text-xs leading-5"
          data-testid="ar-access-warning"
          side="top"
          sideOffset={8}
        >
          {accessNotice?.message ?? "Place this print on a wall."}
        </TooltipContent>
      </Tooltip>
      <Dialog open={preLaunchDialogOpen} onOpenChange={setPreLaunchDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Before you place it</DialogTitle>
            <DialogDescription>
              If the print disappears or drifts, tap <strong>Object</strong>, then <strong>AR</strong> to reset the placement view.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button className="h-11 rounded-full px-5" type="button" variant="outline">
                Cancel
              </Button>
            </DialogClose>
            <a
              className={cn(buttonVariants(), "h-11 rounded-full px-5")}
              data-testid="continue-to-ar-link"
              href={quickLookUrl}
              onClick={() => setPreLaunchDialogOpen(false)}
              rel="ar"
            >
              <img className="sr-only" src={sample.assets.poster} alt="" aria-hidden="true" />
              Continue to AR
            </a>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(dialogNotice)} onOpenChange={(open) => !open && setDialogNotice(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogNotice?.title}</DialogTitle>
            <DialogDescription>{dialogNotice?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button className="h-11 rounded-full px-5" type="button">
                Dismiss
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {arError ? (
        <Alert aria-live="polite" className="max-w-64" variant="destructive">
          <AlertDescription className="text-center text-xs leading-5 sm:text-right">{arError}</AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
