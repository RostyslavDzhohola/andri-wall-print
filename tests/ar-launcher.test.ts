import { describe, expect, it } from "vitest";

import { getAssetContentType, getFixedScaleQuickLookHref, hasReadyArAssetUrls } from "@/lib/ar-launcher";
import { DEFAULT_AR_SAMPLE } from "@/lib/ar-sample";

describe("AR launcher helpers", () => {
  it("builds fixed-scale Quick Look links for local USDZ assets", () => {
    expect(getFixedScaleQuickLookHref("/ar/chicago-final-1.usdz")).toBe("/ar/chicago-final-1.usdz#allowsContentScaling=0");
  });

  it("builds fixed-scale Quick Look links for absolute Convex USDZ URLs", () => {
    expect(getFixedScaleQuickLookHref("https://steady-otter-123.convex.cloud/api/storage/abc.usdz?token=phase0")).toBe(
      "https://steady-otter-123.convex.cloud/api/storage/abc.usdz?token=phase0#allowsContentScaling=0"
    );
  });

  it("overrides stale Quick Look scaling fragments", () => {
    expect(getFixedScaleQuickLookHref("/ar/chicago-final-1.usdz#allowsContentScaling=1&canonicalWebPageURL=https%3A%2F%2Fexample.com")).toBe(
      "/ar/chicago-final-1.usdz#allowsContentScaling=0&canonicalWebPageURL=https%3A%2F%2Fexample.com"
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
