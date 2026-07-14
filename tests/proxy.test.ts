import { describe, expect, it } from "vitest";

import { shouldUseClerkProxyForPath } from "@/proxy";

describe("Clerk proxy route gating", () => {
  it("keeps public routes out of Clerk middleware", () => {
    // Regression: ISSUE-001 - public smoke routes hung when local Clerk keys were mismatched.
    // Found by /qa on 2026-06-17.
    // Report: .gstack/qa-reports/qa-report-localhost-2026-06-17.md
    for (const pathname of ["/", "/gallery", "/request", "/preview/chicago-final-1", "/sign-in"]) {
      expect(shouldUseClerkProxyForPath(pathname)).toBe(false);
    }
  });

  it("keeps account and admin routes protected", () => {
    expect(shouldUseClerkProxyForPath("/admin")).toBe(true);
    expect(shouldUseClerkProxyForPath("/admin/leads")).toBe(true);
    expect(shouldUseClerkProxyForPath("/account")).toBe(true);
    expect(shouldUseClerkProxyForPath("/account/previews")).toBe(true);
    expect(shouldUseClerkProxyForPath("/dashboard")).toBe(true);
  });
});
