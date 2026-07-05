import { describe, expect, it } from "vitest";

import robots from "@/app/robots";
import { getSiteUrl } from "@/lib/site-url";

describe("robots", () => {
  it("allows all public routes and points at the sitemap", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules[0] : result.rules;

    expect(rules?.userAgent).toBe("*");
    expect(rules?.allow).toBe("/");
    expect(rules?.disallow).toBeUndefined();
    expect(result.sitemap).toBe(`${getSiteUrl()}/sitemap.xml`);
  });
});
