import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { RequestSetupMissing } from "@/app/request/page";

describe("request route without a Convex runtime", () => {
  it("renders a friendly non-collecting recovery screen", () => {
    const html = renderToStaticMarkup(createElement(RequestSetupMissing));

    expect(html).toContain("Request form unavailable");
    expect(html).toContain("Wall Print Pro requests are unavailable.");
    expect(html).toContain("refresh the request setup before collecting leads");
    expect(html).toContain('href="/gallery"');
    expect(html).not.toContain("Get estimate");
    expect(html).not.toContain("<form");
  });
});
