import type { ArSample } from "./ar-sample";

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

export type ArAccessNotice = {
  message: string;
  title: string;
  description: string;
  blockLaunch: boolean;
};

export function getAndroidArUnavailableNotice(): ArAccessNotice {
  return {
    message: "AR is not available here.",
    title: "AR not available on this device",
    description:
      "This device can preview the artwork here. For wall placement, open this link on a recent iPhone or an AR-capable Android phone.",
    blockLaunch: true
  };
}

export function getArAccessNotice(diagnostics: ArDiagnostics | null): ArAccessNotice | null {
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

  if (
    diagnostics.isIPhone &&
    (!diagnostics.isSafari || diagnostics.isWKWebViewLike || !diagnostics.quickLookRel)
  ) {
    return {
      message: "Use Safari on iPhone.",
      title: "Use Safari on this iPhone",
      description:
        "This browser cannot reliably start wall placement. Copy this page link, open Safari, paste it, then tap Place on wall again.",
      blockLaunch: true
    };
  }

  if (diagnostics.isIPhone) {
    return null;
  }

  if (diagnostics.isAndroid && !diagnostics.isChrome) {
    return {
      message: "Use Chrome on Android.",
      title: "Use Chrome on this Android phone",
      description:
        "This browser is not Chrome, so wall placement will not start here. Open this same link in Chrome on your Android phone, then tap Place on wall again.",
      blockLaunch: true
    };
  }

  if (diagnostics.isAndroid && diagnostics.canActivateModelViewerAR === false) {
    return getAndroidArUnavailableNotice();
  }

  if (diagnostics.isAndroid) {
    return null;
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

export function getArActionLabel(diagnostics: ArDiagnostics | null, accessNotice: ArAccessNotice | null) {
  if (!diagnostics) {
    return "Checking";
  }

  if (!accessNotice) {
    return "Place on wall";
  }

  if (diagnostics.isIPhone) {
    return "Open in Safari";
  }

  if (diagnostics.isAndroid && !diagnostics.isChrome) {
    return "Open in Chrome";
  }

  if (diagnostics.isAndroid) {
    return "AR unavailable";
  }

  return "Open on iPhone";
}

export function isChromeBrowserUserAgent(userAgent: string) {
  const hasChromeToken = /Chrome\/|CriOS\//.test(userAgent);
  const isAlternativeChromiumBrowser =
    /Edg\/|EdgA\/|EdgiOS\/|OPR\/|SamsungBrowser\/|DuckDuckGo\/|FBAN|FBAV|Instagram|Line\/|Telegram|MicroMessenger|WhatsApp|GSA\/|LinkedInApp|Pinterest|TikTok/i.test(
      userAgent
    );
  const isAndroidWebView = /;\s*wv\)/i.test(userAgent);

  return hasChromeToken && !isAlternativeChromiumBrowser && !isAndroidWebView;
}

export function isKnownIOSNonSafariBrowserUserAgent(userAgent: string) {
  return /CriOS\/|FxiOS\/|EdgiOS\/|OPiOS\/|DuckDuckGo\/|FBAN|FBAV|Instagram|Line\/|Telegram|MicroMessenger|WhatsApp|GSA\/|LinkedInApp|Pinterest|TikTok|ArcSearch\/|ArcMobile\/|Arc\/|TheBrowserCompany/i.test(
    userAgent
  );
}

export type ArAssetKind = "poster" | "glb" | "usdz";

export const AR_ASSET_CONTENT_TYPES: Record<ArAssetKind, string> = {
  poster: "image/png",
  glb: "model/gltf-binary",
  usdz: "model/vnd.usdz+zip"
};

export const AR_ASSET_SIZE_BUDGET_BYTES: Record<ArAssetKind, number> = {
  poster: 4_250_000,
  glb: 4_250_000,
  usdz: 4_250_000
};

export const AR_SAMPLE_TOTAL_SIZE_BUDGET_BYTES = 12_750_000;

export type AssetDeliveryCheck = {
  kind: ArAssetKind;
  url: string;
  status: number;
  redirected: boolean;
  contentType: string;
  contentLength: number | null;
  ok: boolean;
  problems: string[];
};

export type AssetDeliveryFetch = (
  input: string,
  init: { method: "HEAD"; redirect: "follow" }
) => Promise<Pick<Response, "headers" | "ok" | "redirected" | "status">>;

export function getFixedScaleQuickLookHref(usdzHref: string) {
  const [withoutHash, rawHash = ""] = usdzHref.split("#", 2);
  const params = new URLSearchParams(rawHash);

  params.set("allowsContentScaling", "0");

  return `${withoutHash}#${params.toString()}`;
}

export function getAssetKindFromHref(href: string): ArAssetKind {
  const pathname = href.split("#", 1)[0].split("?", 1)[0];

  if (pathname.endsWith(".glb")) {
    return "glb";
  }

  if (pathname.endsWith(".usdz")) {
    return "usdz";
  }

  return "poster";
}

export function getAssetContentType(href: string) {
  return AR_ASSET_CONTENT_TYPES[getAssetKindFromHref(href)];
}

function hasAssetUrl(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

export function hasReadyArAssetUrls(sample: ArSample) {
  return hasAssetUrl(sample.assets.poster) && hasAssetUrl(sample.assets.glb) && hasAssetUrl(sample.assets.usdz);
}

export async function checkAssetDelivery(
  kind: ArAssetKind,
  url: string,
  fetcher: AssetDeliveryFetch = fetch
): Promise<AssetDeliveryCheck> {
  const response = await fetcher(url, { method: "HEAD", redirect: "follow" });
  const expectedContentType = AR_ASSET_CONTENT_TYPES[kind];
  const contentType = response.headers.get("content-type") ?? "";
  const contentLengthHeader = response.headers.get("content-length");
  const contentLength = contentLengthHeader === null ? null : Number(contentLengthHeader);
  const problems: string[] = [];

  if (!response.ok) {
    problems.push(`Expected 2xx status, received ${response.status}.`);
  }

  if (!contentType.toLowerCase().includes(expectedContentType)) {
    problems.push(`Expected ${expectedContentType}, received ${contentType || "no content-type"}.`);
  }

  if (contentLength !== null && Number.isFinite(contentLength) && contentLength > AR_ASSET_SIZE_BUDGET_BYTES[kind]) {
    problems.push(`Expected ${kind} under ${AR_ASSET_SIZE_BUDGET_BYTES[kind]} bytes, received ${contentLength}.`);
  }

  return {
    kind,
    url,
    status: response.status,
    redirected: response.redirected,
    contentType,
    contentLength: Number.isFinite(contentLength) ? contentLength : null,
    ok: problems.length === 0,
    problems
  };
}
