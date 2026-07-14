import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/site-url";
import { getWorkSlugs } from "@/lib/work-content";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${siteUrl}/`, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/gallery`, lastModified, changeFrequency: "weekly", priority: 0.8 },
    { url: `${siteUrl}/work`, lastModified, changeFrequency: "weekly", priority: 0.8 }
  ];

  const workRoutes: MetadataRoute.Sitemap = getWorkSlugs().map((slug) => ({
    url: `${siteUrl}/work/${slug}`,
    lastModified,
    changeFrequency: "monthly",
    priority: 0.7
  }));

  return [...staticRoutes, ...workRoutes];
}
