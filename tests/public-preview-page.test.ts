import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/convex-public-preview", () => ({
  getPublicPreview: vi.fn().mockResolvedValue({ status: "unavailable" })
}));

import PublicPreviewPage from "@/app/preview/[slug]/page";

describe("public preview fallback", () => {
  it("uses the fallback title as the page h1", async () => {
    const page = await PublicPreviewPage({
      params: Promise.resolve({ slug: "not-a-real-preview" })
    });
    const html = renderToStaticMarkup(createElement(() => page));

    expect(html).toMatch(/<h1[^>]*>This client preview is not available\.<\/h1>/);
  });
});
