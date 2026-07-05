import { describe, expect, it } from "vitest";

import sitemap from "@/app/sitemap";
import { getSiteUrl } from "@/lib/site-url";
import { getWorkSlugs } from "@/lib/work-content";

describe("sitemap", () => {
  it("lists /, /gallery, /work, every /work/[slug], and /reserved", () => {
    const siteUrl = getSiteUrl();
    const urls = sitemap().map((entry) => entry.url);

    expect(urls).toContain(`${siteUrl}/`);
    expect(urls).toContain(`${siteUrl}/gallery`);
    expect(urls).toContain(`${siteUrl}/work`);
    expect(urls).toContain(`${siteUrl}/reserved`);

    for (const slug of getWorkSlugs()) {
      expect(urls).toContain(`${siteUrl}/work/${slug}`);
    }

    // No duplicate URLs.
    expect(new Set(urls).size).toBe(urls.length);
  });
});
