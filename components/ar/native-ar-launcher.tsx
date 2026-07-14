"use client";

import { Share2, Smartphone } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getFixedScaleQuickLookHref, hasReadyArAssetUrls } from "@/lib/ar-launcher";
import type { ArSample } from "@/lib/ar-sample";
import { resolveClientPreviewUrl } from "@/lib/client-preview-url";
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
  const isKnownIOSNonSafari =
    /CriOS\/|FxiOS\/|EdgiOS\/|OPiOS\/|DuckDuckGo\/|FBAN|FBAV|Instagram|Line\/|Telegram|MicroMessenger|WhatsApp|GSA\/|LinkedInApp|Pinterest|TikTok/i.test(
      userAgent
    );
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
      message: "Open on iPhone.",
      title: "Open this on your iPhone",
      description:
        "Desktop browsers can preview the artwork, but wall placement starts on iPhone Safari. Share this page to your phone, then tap Place on wall there.",
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
      description:
        "This browser is not Safari, so wall placement will not start here. Open this same link in Safari on your iPhone, then tap Place on wall again.",
      blockLaunch: true
    };
  }

  if (diagnostics.isAndroid) {
    return {
      message: "Open on iPhone.",
      title: "Open this on your iPhone",
      description: "This device can preview the artwork, but the wall-placement viewer starts on iPhone Safari.",
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
    message: "Open on iPhone.",
    title: "Open this on your iPhone",
    description: "This wall placement only works on iPhone in Safari.",
    blockLaunch: true
  };
}

function getArActionLabel(diagnostics: ArDiagnostics | null, accessNotice: ArAccessNotice | null) {
  if (!diagnostics) {
    return "Checking";
  }

  if (!accessNotice) {
    return "Place on wall";
  }

  if (diagnostics.isIPhone) {
    return "Open in Safari";
  }

  return "Open on iPhone";
}

export function NativeArLauncher({ sample, diagnostics, onDiagnosticsChange }: NativeArLauncherProps) {
  const hasReadyArAssets = hasReadyArAssetUrls(sample);
  const quickLookUrl = hasReadyArAssets ? getFixedScaleQuickLookHref(sample.assets.usdz) : "#";
  const modelViewerRef = useRef<ModelViewerElement | null>(null);
  const launchFallbackTimerRef = useRef<number | null>(null);
  const launchFallbackCleanupRef = useRef<(() => void) | null>(null);
  const [arError, setArError] = useState<string | null>(null);
  const [dialogNotice, setDialogNotice] = useState<ArAccessNotice | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const accessNotice = getArAccessNotice(diagnostics);
  const actionLabel = getArActionLabel(diagnostics, accessNotice);
  const showSendToIPhone = diagnostics ? !diagnostics.isIPhone : false;

  const clearPendingLaunchFallback = () => {
    if (launchFallbackTimerRef.current !== null) {
      window.clearTimeout(launchFallbackTimerRef.current);
      launchFallbackTimerRef.current = null;
    }

    launchFallbackCleanupRef.current?.();
    launchFallbackCleanupRef.current = null;
  };

  const scheduleLaunchFailureFallback = () => {
    clearPendingLaunchFallback();

    let launchLeftPage = false;
    const markLaunchStarted = () => {
      launchLeftPage = true;
      clearPendingLaunchFallback();
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markLaunchStarted();
      }
    };
    const cleanup = () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", markLaunchStarted);
      window.removeEventListener("blur", markLaunchStarted);
    };

    launchFallbackCleanupRef.current = cleanup;
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", markLaunchStarted);
    window.addEventListener("blur", markLaunchStarted);
    launchFallbackTimerRef.current = window.setTimeout(() => {
      cleanup();
      launchFallbackCleanupRef.current = null;
      launchFallbackTimerRef.current = null;

      if (!launchLeftPage && document.visibilityState === "visible") {
        setDialogNotice({
          message: "Open in iPhone Safari.",
          title: "Open in Safari to place on wall",
          description:
            "Wall placement did not start from this browser. Open this same preview link in Safari on your iPhone, then tap Place on wall again.",
          blockLaunch: true
        });
      }
    }, 1400);
  };

  useEffect(() => {
    if (!hasReadyArAssets) {
      return;
    }

    const modelViewer = modelViewerRef.current;

    if (!modelViewer) {
      return;
    }

    modelViewer.setAttribute("alt", `${sample.title} wall print`);
    modelViewer.setAttribute("ar-placement", "wall");
    modelViewer.setAttribute("ar-scale", "fixed");
    modelViewer.setAttribute("ios-src", sample.assets.usdz);
    modelViewer.setAttribute("poster", sample.assets.poster);
    modelViewer.setAttribute("src", sample.assets.glb);
  }, [hasReadyArAssets, sample.assets.glb, sample.assets.poster, sample.assets.usdz, sample.title]);

  useEffect(() => {
    if (!hasReadyArAssets) {
      return;
    }

    const readDiagnostics = () => {
      const modelViewer = modelViewerRef.current;

      onDiagnosticsChange(getBrowserDeviceDiagnostics(modelViewer));
    };

    readDiagnostics();
    const timers = [window.setTimeout(readDiagnostics, 600), window.setTimeout(readDiagnostics, 1800)];

    return () => {
      timers.forEach(window.clearTimeout);
    };
  }, [hasReadyArAssets, onDiagnosticsChange, sample.id]);

  useEffect(() => clearPendingLaunchFallback, []);

  const placeInAr = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!hasReadyArAssets) {
      event.preventDefault();
      setArError(null);
      setDialogNotice({
        message: "Preview only.",
        title: "Wall placement is not ready",
        description: "This preview has a poster image, but wall-placement files are not available yet.",
        blockLaunch: true
      });
      return;
    }

    const modelViewer = modelViewerRef.current;
    const currentDiagnostics = getBrowserDeviceDiagnostics(modelViewer);
    const currentAccessNotice = getArAccessNotice(currentDiagnostics);

    clearPendingLaunchFallback();
    onDiagnosticsChange(currentDiagnostics);

    if (currentAccessNotice?.blockLaunch) {
      event.preventDefault();
      setArError(null);
      setDialogNotice(currentAccessNotice);
      return;
    }

    if (currentDiagnostics.quickLookRel || !modelViewer?.activateAR) {
      if (currentDiagnostics.isIOS) {
        scheduleLaunchFailureFallback();
      }

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

  const getCurrentSharePath = () => sample.shareUrl ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;

  const shareToPhone = async () => {
    let shareUrlResult: Awaited<ReturnType<typeof resolveClientPreviewUrl>>;

    try {
      shareUrlResult = await resolveClientPreviewUrl(getCurrentSharePath());
    } catch (error) {
      console.error("Failed to resolve preview URL for sharing.", error);
      setShareStatus("Could not prepare a shareable link. Try again.");
      return;
    }

    const shareData = {
      title: `${sample.title} wall preview`,
      text: "Open this Wall Print Pro preview on your iPhone.",
      url: shareUrlResult.url
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setShareStatus(shareUrlResult.warning ?? "Share sheet opened.");
        return;
      }

      await navigator.clipboard.writeText(shareUrlResult.url);
      setShareStatus(shareUrlResult.warning ?? "Phone-ready link copied.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      try {
        await navigator.clipboard.writeText(shareUrlResult.url);
        setShareStatus(shareUrlResult.warning ?? "Phone-ready link copied.");
      } catch {
        setShareStatus("Copy this page link and open it on your iPhone.");
      }
    }
  };

  return (
    <div className="grid gap-2 sm:justify-items-end">
      {hasReadyArAssets ? (
        <model-viewer
          alt={`${sample.title} wall print`}
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
      ) : null}
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        {!hasReadyArAssets ? (
          <Button className="min-h-10 rounded-full px-4" data-testid="ar-preview-unavailable" disabled type="button" variant="outline">
            Preview only
          </Button>
        ) : showSendToIPhone ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                aria-label="Send this preview to your iPhone"
                className="h-12 rounded-full px-5 text-base shadow-[0_18px_38px_rgba(28,79,89,0.32)]"
                data-testid="share-to-phone"
                onClick={shareToPhone}
                type="button"
              >
                <Share2 className="size-4" />
                Send to iPhone
              </Button>
            </TooltipTrigger>
            <TooltipContent className="max-w-64 text-center text-xs leading-5" side="top" sideOffset={8}>
              Send this page to your iPhone.
            </TooltipContent>
          </Tooltip>
        ) : (
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
                <Smartphone className="size-5" />
                {actionLabel}
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
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {shareStatus}
      </span>
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
