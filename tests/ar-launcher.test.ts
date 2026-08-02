import { describe, expect, it } from "vitest";

import {
  getArAccessNotice,
  getArActionLabel,
  getAssetContentType,
  getFixedScaleQuickLookHref,
  hasReadyArAssetUrls,
  isChromeBrowserUserAgent,
  isKnownIOSNonSafariBrowserUserAgent,
  type ArDiagnostics
} from "@/lib/ar-launcher";
import { DEFAULT_AR_SAMPLE } from "@/lib/ar-sample";

function diagnostics(overrides: Partial<ArDiagnostics> = {}): ArDiagnostics {
  return {
    quickLookRel: false,
    isIPhone: false,
    isIOS: false,
    isAndroid: false,
    isLikelyPhoneOrTablet: false,
    isSafari: false,
    isChrome: false,
    isBrowserUnknown: false,
    isWKWebViewLike: false,
    canActivateModelViewerAR: null,
    ...overrides
  };
}

describe("AR launcher helpers", () => {
  it("builds fixed-scale Quick Look links for local USDZ assets", () => {
    expect(getFixedScaleQuickLookHref("/api/ar/chicago-final-1.usdz")).toBe("/api/ar/chicago-final-1.usdz#allowsContentScaling=0");
  });

  it("builds fixed-scale Quick Look links for absolute Convex USDZ URLs", () => {
    expect(getFixedScaleQuickLookHref("https://steady-otter-123.convex.cloud/api/storage/abc.usdz?token=phase0")).toBe(
      "https://steady-otter-123.convex.cloud/api/storage/abc.usdz?token=phase0#allowsContentScaling=0"
    );
  });

  it("overrides stale Quick Look scaling fragments", () => {
    expect(getFixedScaleQuickLookHref("/api/ar/chicago-final-1.usdz#allowsContentScaling=1&canonicalWebPageURL=https%3A%2F%2Fexample.com")).toBe(
      "/api/ar/chicago-final-1.usdz#allowsContentScaling=0&canonicalWebPageURL=https%3A%2F%2Fexample.com"
    );
  });

  it("maps local asset extensions to expected AR delivery content types", () => {
    expect(getAssetContentType(DEFAULT_AR_SAMPLE.assets.poster)).toBe("image/png");
    expect(getAssetContentType(DEFAULT_AR_SAMPLE.assets.glb)).toBe("model/gltf-binary");
    expect(getAssetContentType(DEFAULT_AR_SAMPLE.assets.usdz)).toBe("model/vnd.usdz+zip");
  });

  it("accepts samples with absolute Convex asset URLs", () => {
    expect(
      hasReadyArAssetUrls({
        ...DEFAULT_AR_SAMPLE,
        assets: {
          poster: "https://steady-otter-123.convex.cloud/api/storage/poster",
          glb: "https://steady-otter-123.convex.cloud/api/storage/glb",
          usdz: "https://steady-otter-123.convex.cloud/api/storage/usdz"
        }
      })
    ).toBe(true);
  });

  it("rejects samples without launchable GLB and USDZ URLs", () => {
    expect(
      hasReadyArAssetUrls({
        ...DEFAULT_AR_SAMPLE,
        assets: {
          poster: "/generated-poster.png",
          glb: "",
          usdz: ""
        }
      })
    ).toBe(false);
  });

  it("allows Android Chrome to launch wall placement when AR capability is available", () => {
    const accessNotice = getArAccessNotice(
      diagnostics({
        isAndroid: true,
        isLikelyPhoneOrTablet: true,
        isChrome: true,
        canActivateModelViewerAR: true
      })
    );

    expect(accessNotice).toBeNull();
    expect(getArActionLabel(diagnostics({ isAndroid: true, isLikelyPhoneOrTablet: true, isChrome: true }), accessNotice)).toBe(
      "Place on wall"
    );
  });

  it("allows Android Chrome to try wall placement while model-viewer capability is still unknown", () => {
    expect(
      getArAccessNotice(
        diagnostics({
          isAndroid: true,
          isLikelyPhoneOrTablet: true,
          isChrome: true,
          canActivateModelViewerAR: null
        })
      )
    ).toBeNull();
  });

  it("guides Android users in non-Chrome browsers to Chrome", () => {
    const androidFirefox = diagnostics({
      isAndroid: true,
      isLikelyPhoneOrTablet: true,
      isBrowserUnknown: true
    });
    const accessNotice = getArAccessNotice(androidFirefox);

    expect(accessNotice).toEqual({
      message: "Use Chrome on Android.",
      title: "Use Chrome on this Android phone",
      description:
        "This browser is not Chrome, so wall placement will not start here. Open this same link in Chrome on your Android phone, then tap Place on wall again.",
      blockLaunch: true
    });
    expect(getArActionLabel(androidFirefox, accessNotice)).toBe("Open in Chrome");
  });

  it("distinguishes Android Chrome from Chromium-based non-Chrome browsers", () => {
    expect(
      isChromeBrowserUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.0.0 Mobile Safari/537.36"
      )
    ).toBe(true);
    expect(
      isChromeBrowserUserAgent(
        "Mozilla/5.0 (Linux; Android 14; SM-S928U) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36"
      )
    ).toBe(false);
    expect(
      isChromeBrowserUserAgent(
        "Mozilla/5.0 (Linux; Android 14; Pixel 8 Build/AP1A; wv) AppleWebKit/537.36 Version/4.0 Chrome/143.0.0.0 Mobile Safari/537.36"
      )
    ).toBe(false);
  });

  it("recognizes Arc Search as a non-Safari iPhone browser", () => {
    expect(
      isKnownIOSNonSafariBrowserUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1 ArcSearch/1.45.0"
      )
    ).toBe(true);
    expect(
      isKnownIOSNonSafariBrowserUserAgent(
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1"
      )
    ).toBe(false);
  });

  it("shows an honest in-page fallback when Android cannot activate AR", () => {
    expect(
      getArAccessNotice(
        diagnostics({
          isAndroid: true,
          isLikelyPhoneOrTablet: true,
          isChrome: true,
          canActivateModelViewerAR: false
        })
      )
    ).toEqual({
      message: "AR is not available here.",
      title: "AR not available on this device",
      description:
        "This device can preview the artwork here. For wall placement, open this link on a recent iPhone or an AR-capable Android phone.",
      blockLaunch: true
    });
  });

  it("keeps capable iPhone Safari allowed and iPhone non-Safari guidance blocked", () => {
    expect(
      getArAccessNotice(
        diagnostics({
          quickLookRel: true,
          isIPhone: true,
          isIOS: true,
          isLikelyPhoneOrTablet: true,
          isSafari: true
        })
      )
    ).toBeNull();

    expect(
      getArAccessNotice(
        diagnostics({
          isIPhone: true,
          isIOS: true,
          isLikelyPhoneOrTablet: true,
          isChrome: true
        })
      )
    ).toMatchObject({
      title: "Use Safari on this iPhone",
      blockLaunch: true
    });
  });

  it("fails closed for Safari-shaped iPhone browsers without native Quick Look support", () => {
    expect(
      getArAccessNotice(
        diagnostics({
          quickLookRel: false,
          isIPhone: true,
          isIOS: true,
          isLikelyPhoneOrTablet: true,
          isSafari: true
        })
      )
    ).toMatchObject({
      title: "Use Safari on this iPhone",
      blockLaunch: true
    });
  });

  it("fails closed for Safari-shaped iPhone WKWebViews even when rel=ar is reported", () => {
    expect(
      getArAccessNotice(
        diagnostics({
          quickLookRel: true,
          isIPhone: true,
          isIOS: true,
          isLikelyPhoneOrTablet: true,
          isSafari: true,
          isWKWebViewLike: true
        })
      )
    ).toMatchObject({
      title: "Use Safari on this iPhone",
      blockLaunch: true
    });
  });

  it("keeps desktop launch blocked behind the iPhone handoff", () => {
    expect(getArAccessNotice(diagnostics())).toMatchObject({
      title: "Open this on your iPhone",
      blockLaunch: true
    });
  });
});
