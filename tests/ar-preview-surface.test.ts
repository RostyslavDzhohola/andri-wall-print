import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ArPreviewSurface } from "@/components/ar/ar-preview-surface";
import { DEFAULT_AR_SAMPLE } from "@/lib/ar-sample";

describe("AR preview surface", () => {
  it("keeps the poster visible but disables AR launch when GLB and USDZ URLs are missing", () => {
    const html = renderToStaticMarkup(
      createElement(ArPreviewSurface, {
        heading: "Preview",
        samples: [
          {
            ...DEFAULT_AR_SAMPLE,
            id: "concept-composite-only",
            title: "Composite-only concept",
            assets: {
              poster: "/generated-concept-poster.png",
              glb: "",
              usdz: ""
            }
          }
        ]
      })
    );

    expect(html).toContain('src="/generated-concept-poster.png"');
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain('decoding="async"');
    expect(html).toContain('width="1200"');
    expect(html).toContain('height="1600"');
    expect(html).toContain('data-testid="ar-preview-unavailable"');
    expect(html).toContain("Preview only");
    expect(html).not.toContain('data-testid="quick-look-link"');
    expect(html).not.toContain('rel="ar"');
    expect(html).not.toContain("#allowsContentScaling=0");
  });
});
