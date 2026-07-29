import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// The shared header uses usePathname() to drive active-route + the /reserved
// confirmation variant. Mock it per-test.
let mockPathname = "/";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname
}));

async function renderHeader(pathname: string) {
  mockPathname = pathname;
  const { SiteHeader } = await import("@/components/site/site-header");

  return renderToStaticMarkup(createElement(SiteHeader, { estimateHref: "/request" }));
}

afterEach(() => {
  mockPathname = "/";
});

describe("shared site header", () => {
  it("renders the brand nav links and the estimate CTA on a normal route", async () => {
    const html = await renderHeader("/gallery");

    expect(html).toContain('data-testid="site-header"');
    expect(html).toContain('href="/"');
    expect(html).toContain('href="/gallery"');
    expect(html).toContain('href="/work"');
    expect(html).toContain("Home");
    expect(html).toContain("Gallery");
    expect(html).toContain("Our work");
    expect(html).toContain("border-0");
    expect(html).toContain("focus-visible:outline-none");
    expect(html).not.toContain("focus-visible:outline-2");
    expect(html).toContain('href="/request"');
    expect(html).toContain("Get an estimate");
    expect(html).toContain("Estimate");
    expect(html).not.toContain("$100");
    expect(html).toContain('data-testid="home-nav-reserve"');
    // Not the /reserved confirmation chip.
    expect(html).not.toContain('data-testid="site-reserve-confirmation"');
  });

  it("marks the active nav route with aria-current", async () => {
    const html = await renderHeader("/work/some-job");

    expect(html).toContain('aria-current="page"');
  });

  it("marks only the Home item active on the homepage", async () => {
    const html = await renderHeader("/");

    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  it("swaps the CTA for a non-link confirmation chip on /reserved (no reserve link)", async () => {
    const html = await renderHeader("/reserved");

    expect(html).toContain('data-testid="site-reserve-confirmation"');
    expect(html).toContain("Spot reserved");
    // The paying customer is never shown the reserve payment link again.
    expect(html).not.toContain('href="/request"');
    expect(html).not.toContain('data-testid="home-nav-reserve"');
  });

  it("keeps brand nav but hides the price CTA on private /preview routes", async () => {
    const html = await renderHeader("/preview/chicago-final-1");

    expect(html).toContain('href="/"');
    expect(html).toContain('href="/gallery"');
    expect(html).not.toContain('href="/request"');
    expect(html).not.toContain('data-testid="home-nav-reserve"');
    expect(html).not.toContain('data-testid="site-reserve-confirmation"');
  });
});
