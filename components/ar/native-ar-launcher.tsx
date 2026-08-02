"use client";

import { Share2, Smartphone } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  getAndroidArUnavailableNotice,
  getArAccessNotice,
  getArActionLabel,
  getFixedScaleQuickLookHref,
  hasReadyArAssetUrls,
  isChromeBrowserUserAgent,
  isKnownIOSNonSafariBrowserUserAgent,
  type ArAccessNotice,
  type ArDiagnostics
} from "@/lib/ar-launcher";
import type { ArSample } from "@/lib/ar-sample";
import { resolveClientPreviewUrl } from "@/lib/client-preview-url";
import { cn } from "@/lib/utils";

export type { ArDiagnostics } from "@/lib/ar-launcher";

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
  const isKnownIOSNonSafari = isKnownIOSNonSafariBrowserUserAgent(userAgent);
  const isChrome = isChromeBrowserUserAgent(userAgent);
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

export function NativeArLauncher({ sample, diagnostics, onDiagnosticsChange }: NativeArLauncherProps) {
  const hasReadyArAssets = hasReadyArAssetUrls(sample);
  const quickLookUrl = hasReadyArAssets ? getFixedScaleQuickLookHref(sample.assets.usdz) : "#";
  const modelViewerRef = useRef<ModelViewerElement | null>(null);
  const androidLaunchAttemptedRef = useRef(false);
  const launchFallbackTimerRef = useRef<number | null>(null);
  const launchFallbackCleanupRef = useRef<(() => void) | null>(null);
  const [arError, setArError] = useState<string | null>(null);
  const [dialogNotice, setDialogNotice] = useState<ArAccessNotice | null>(null);
  const [shareStatus, setShareStatus] = useState<string | null>(null);
  const [safariLinkCopied, setSafariLinkCopied] = useState(false);
  const accessNotice = getArAccessNotice(diagnostics);
  const actionLabel = getArActionLabel(diagnostics, accessNotice);
  const showSendToIPhone = diagnostics ? !diagnostics.isIPhone && !diagnostics.isAndroid : false;

  const clearPendingLaunchFallback = () => {
    if (launchFallbackTimerRef.current !== null) {
      window.clearTimeout(launchFallbackTimerRef.current);
      launchFallbackTimerRef.current = null;
    }

    launchFallbackCleanupRef.current?.();
    launchFallbackCleanupRef.current = null;
  };

  const showAndroidArUnavailableNotice = () => {
    clearPendingLaunchFallback();
    setArError(null);
    setDialogNotice(getAndroidArUnavailableNotice());
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
        setSafariLinkCopied(false);
        setDialogNotice({
          message: "Open in iPhone Safari.",
          title: "Open in Safari to place on wall",
          description:
            "Wall placement did not start from this browser. Copy this page link, open Safari, paste it, then tap Place on wall again.",
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

  useEffect(() => {
    if (!hasReadyArAssets) {
      return;
    }

    const modelViewer = modelViewerRef.current;

    if (!modelViewer) {
      return;
    }

    const handleArStatus = (event: Event) => {
      const status = (event as CustomEvent<{ status?: string }>).detail?.status;

      if (status !== "failed") {
        return;
      }

      const currentDiagnostics = getBrowserDeviceDiagnostics(modelViewer);
      onDiagnosticsChange(currentDiagnostics);

      if (currentDiagnostics.isAndroid && androidLaunchAttemptedRef.current) {
        androidLaunchAttemptedRef.current = false;
        showAndroidArUnavailableNotice();
      }
    };

    modelViewer.addEventListener("ar-status", handleArStatus);

    return () => {
      modelViewer.removeEventListener("ar-status", handleArStatus);
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
      setSafariLinkCopied(false);
      setDialogNotice(currentAccessNotice);
      return;
    }

    if (currentDiagnostics.isIOS) {
      scheduleLaunchFailureFallback();
      return;
    }

    if (!modelViewer?.activateAR) {
      if (currentDiagnostics.isAndroid) {
        event.preventDefault();
        showAndroidArUnavailableNotice();
      }
      return;
    }

    event.preventDefault();
    setArError(null);
    setDialogNotice(null);
    androidLaunchAttemptedRef.current = currentDiagnostics.isAndroid;
    void modelViewer.activateAR().catch((error: unknown) => {
      console.error("Failed to activate native AR.", error);

      if (currentDiagnostics.isAndroid) {
        androidLaunchAttemptedRef.current = false;
        showAndroidArUnavailableNotice();
        return;
      }

      setArError("Wall preview could not start from this browser. Open this client preview page in Safari on iPhone.");
    });
  };

  const getCurrentSharePath = () => sample.shareUrl ?? `${window.location.pathname}${window.location.search}${window.location.hash}`;

  const copyLinkForSafari = async () => {
    try {
      const shareUrlResult = await resolveClientPreviewUrl(getCurrentSharePath());

      await navigator.clipboard.writeText(shareUrlResult.url);
      setSafariLinkCopied(true);
      setShareStatus(shareUrlResult.warning ?? "Link copied. Open Safari and paste it.");
    } catch (error) {
      console.error("Failed to copy the Safari preview link.", error);
      setSafariLinkCopied(false);
      setShareStatus("Could not copy the link. Copy this page address, then paste it into Safari.");
    }
  };

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
            <div className="inline-grid">
              <TooltipTrigger asChild>
                <a
                  aria-label={actionLabel}
                  className={cn(
                    buttonVariants(),
                    "col-start-1 row-start-1 h-12 w-full rounded-full px-5 py-3 text-base shadow-[0_18px_38px_rgba(28,79,89,0.32)]"
                  )}
                  data-testid="quick-look-link"
                  href={quickLookUrl}
                  onClick={placeInAr}
                  rel="ar"
                  title={accessNotice?.message ?? "Place this print on a wall"}
                >
                  <img className="sr-only" src={sample.assets.poster} alt={actionLabel} />
                </a>
              </TooltipTrigger>
              <span
                aria-hidden="true"
                className="pointer-events-none z-10 col-start-1 row-start-1 flex items-center justify-center gap-2 px-5 py-3 text-base text-primary-foreground"
                data-testid="quick-look-label"
              >
                <Smartphone className="size-5" />
                {actionLabel}
              </span>
            </div>
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
      <Dialog
        open={Boolean(dialogNotice)}
        onOpenChange={(open) => {
          if (!open) {
            setDialogNotice(null);
            setSafariLinkCopied(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogNotice?.title}</DialogTitle>
            <DialogDescription>{dialogNotice?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            {dialogNotice?.title.includes("Safari") ? (
              <Button className="h-11 rounded-full px-5" onClick={copyLinkForSafari} type="button" variant="outline">
                {safariLinkCopied ? "Link copied" : "Copy link"}
              </Button>
            ) : null}
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
