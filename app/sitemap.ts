import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";

// Update this only when indexable public content changes. Using request time as
// lastModified makes every sitemap fetch claim that every page changed.
export const SITEMAP_CONTENT_LAST_MODIFIED = new Date("2026-08-12T00:00:00.000Z");

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified: SITEMAP_CONTENT_LAST_MODIFIED, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/gallery`, lastModified: SITEMAP_CONTENT_LAST_MODIFIED, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/work`, lastModified: SITEMAP_CONTENT_LAST_MODIFIED, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/privacy`, lastModified: SITEMAP_CONTENT_LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 },
    { url: `${siteUrl}/terms`, lastModified: SITEMAP_CONTENT_LAST_MODIFIED, changeFrequency: "yearly", priority: 0.3 }
  ];

  return staticRoutes;
}
