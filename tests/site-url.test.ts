import { afterEach, describe, expect, it } from "vitest";

import { getSiteUrl } from "@/lib/site-url";

const SITE_URL_ENV_KEY = "NEXT_PUBLIC" + "_SITE_URL";
const PRODUCTION_SITE_URL = "https://www.thewallprintpro.com";
const originalSiteUrl = process.env[SITE_URL_ENV_KEY];

afterEach(() => {
  if (originalSiteUrl === undefined) {
    delete process.env[SITE_URL_ENV_KEY];
  } else {
    process.env[SITE_URL_ENV_KEY] = originalSiteUrl;
  }
});

describe("getSiteUrl", () => {
  it("uses the production URL when unset", () => {
    delete process.env[SITE_URL_ENV_KEY];

    expect(getSiteUrl()).toBe(PRODUCTION_SITE_URL);
  });

  it.each([
    ["https://www.thewallprintpro.com", "https://www.thewallprintpro.com"],
    ["https://thewallprintpro.com", "https://thewallprintpro.com"],
    ["https://www.thewallprintpro.com///", "https://www.thewallprintpro.com"],
    ["https://www.thewallprintpro.com/staging", "https://www.thewallprintpro.com"],
    ["https://www.thewallprintpro.com?preview=1", "https://www.thewallprintpro.com"],
    ["https://www.thewallprintpro.com/#preview", "https://www.thewallprintpro.com"]
  ])("accepts approved HTTPS origins and strips path, query, and hash", (configured, expected) => {
    process.env[SITE_URL_ENV_KEY] = configured;

    expect(getSiteUrl()).toBe(expected);
  });

  it.each([
    "https://www.wallprintpro.com",
    "http://www.thewallprintpro.com",
    "https://www.thewallprintpro.com:8443/staging?preview=1",
    "not a URL"
  ])("falls back to production for an unapproved configured URL", (configured) => {
    process.env[SITE_URL_ENV_KEY] = configured;

    expect(getSiteUrl()).toBe(PRODUCTION_SITE_URL);
  });
});
