// Single source of truth for the site's public base URL. Keep `www` canonical;
// the zone apex redirects there in next.config.ts.
const PRODUCTION_SITE_URL = "https://www.thewallprintpro.com";

// MUST use a bracket-based dynamic env read (not a bare process.env.X literal)
// to avoid the Turbopack prod-build env-folding pitfall (see lib/runtime-env.ts).
const SITE_URL_ENV_KEY = "NEXT_PUBLIC" + "_SITE_URL";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function getSiteUrl() {
  const configured = process.env[SITE_URL_ENV_KEY]?.trim();

  if (!configured) {
    return PRODUCTION_SITE_URL;
  }

  try {
    const url = new URL(configured);
    const isApprovedHostname =
      url.hostname === "thewallprintpro.com" || url.hostname === "www.thewallprintpro.com";

    if (url.protocol === "https:" && isApprovedHostname) {
      return normalizeBaseUrl(configured);
    }
  } catch {
    // Invalid configured URLs must not poison canonical, sitemap, or social URLs.
  }

  return PRODUCTION_SITE_URL;
}

export function absoluteUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${getSiteUrl()}${normalizedPath}`;
}
