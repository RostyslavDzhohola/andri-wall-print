import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { getSiteUrl } from "@/lib/site-url";

describe("sitemap", () => {
  it("lists the approved public index routes but not retired work details or /reserved", () => {
    const siteUrl = getSiteUrl();
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain(`${siteUrl}/`);
    expect(urls).toContain(`${siteUrl}/gallery`);
    expect(urls).toContain(`${siteUrl}/privacy`);
    expect(urls).toContain(`${siteUrl}/terms`);
    expect(urls).toContain(`${siteUrl}/work`);
    expect(urls).not.toContain(`${siteUrl}/reserved`);
    expect(urls.some((url) => url.startsWith(`${siteUrl}/work/`))).toBe(false);

    // No duplicate URLs.
    expect(new Set(urls).size).toBe(urls.length);
  });
});
