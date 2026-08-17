import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import RequestPage, { RequestSetupMissing } from "@/app/request/page";

describe("request route without a Convex runtime", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("renders a friendly non-collecting recovery screen", () => {
    const html = renderToStaticMarkup(createElement(RequestSetupMissing));

    expect(html).toContain("Request form unavailable");
    expect(html).toContain("Wall Print Pro requests are unavailable.");
    expect(html).toContain("The estimate form is temporarily unavailable");
    expect(html).toContain("Browse the gallery and check back later");
    expect(html).toContain('href="/gallery"');
    expect(html).not.toContain("Get estimate");
    expect(html).not.toContain("<form");
  });

  it("selects the recovery screen when both Convex URLs are absent", async () => {
    vi.stubEnv("CONVEX_URL", "");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");

    const html = renderToStaticMarkup(await RequestPage({}));

    expect(html).toContain("Request form unavailable");
    expect(html).toContain('href="/gallery"');
    expect(html).not.toContain("<form");
  });
});
