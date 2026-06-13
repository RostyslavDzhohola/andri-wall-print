import { describe, expect, it } from "vitest";

import { getAssetContentType, getResizableQuickLookHref, hasReadyArAssetUrls } from "@/lib/ar-launcher";
import { DEFAULT_AR_SAMPLE } from "@/lib/ar-sample";

describe("AR launcher helpers", () => {
  it("keeps local USDZ Quick Look links resizable by default", () => {
    expect(getResizableQuickLookHref("/ar/chicago-final-1.usdz")).toBe("/ar/chicago-final-1.usdz");
  });

  it("keeps absolute Convex USDZ Quick Look links resizable by default", () => {
    expect(getResizableQuickLookHref("https://steady-otter-123.convex.cloud/api/storage/abc.usdz?token=phase0")).toBe(
      "https://steady-otter-123.convex.cloud/api/storage/abc.usdz?token=phase0"
    );
  });

  it("removes stale fixed-scale Quick Look fragments without dropping other parameters", () => {
    expect(getResizableQuickLookHref("/ar/chicago-final-1.usdz#allowsContentScaling=0&canonicalWebPageURL=https%3A%2F%2Fexample.com")).toBe(
      "/ar/chicago-final-1.usdz#canonicalWebPageURL=https%3A%2F%2Fexample.com"
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
});
