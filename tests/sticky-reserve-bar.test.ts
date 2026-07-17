import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname
}));

async function renderStickyBar(pathname: string) {
  mockPathname = pathname;
  const { StickyReserveBar } = await import("@/components/site/sticky-reserve-bar");

  return renderToStaticMarkup(createElement(StickyReserveBar, { estimateHref: "/request" }));
}

afterEach(() => {
  mockPathname = "/";
});

describe("sticky reserve bar", () => {
  it("renders on the home, gallery, and work routes", async () => {
    for (const pathname of ["/", "/gallery", "/work", "/work/a-job"]) {
      const html = await renderStickyBar(pathname);
      expect(html, pathname).toContain('data-testid="home-sticky-reserve"');
      expect(html, pathname).toContain('href="/request"');
      expect(html, pathname).toContain("Get an estimate");
      expect(html, pathname).not.toContain("$100");
    }
  });

  it("is hidden on /request (competing submit CTA), /reserved (already paid), and /preview", async () => {
    for (const pathname of ["/request", "/reserved", "/preview/chicago-final-1"]) {
      const html = await renderStickyBar(pathname);
      expect(html, pathname).toBe("");
    }
  });
});
