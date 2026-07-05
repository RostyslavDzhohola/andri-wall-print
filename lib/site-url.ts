// Single source of truth for the site's public base URL.
// LAUNCH GATE: replace the placeholder production domain below with the real
// Wall Print Pro domain before launch (used in sitemap, robots, canonical URLs,
// and OG image absolute URLs).
const PLACEHOLDER_PRODUCTION_SITE_URL = "https://www.wallprintpro.com";

// MUST use a bracket-based dynamic env read (not a bare process.env.X literal)
// to avoid the Turbopack prod-build env-folding pitfall (see lib/runtime-env.ts).
const SITE_URL_ENV_KEY = "NEXT_PUBLIC" + "_SITE_URL";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/+$/, "");
}

export function getSiteUrl() {
  const configured = process.env[SITE_URL_ENV_KEY]?.trim();

  return normalizeBaseUrl(configured && configured.length > 0 ? configured : PLACEHOLDER_PRODUCTION_SITE_URL);
}

export function absoluteUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${getSiteUrl()}${normalizedPath}`;
}
