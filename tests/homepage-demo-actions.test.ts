import { describe, expect, it } from "vitest";

import {
  canRetryConceptStatusPollFailure,
  canStartHomepageConceptGeneration,
  CONCEPT_STATUS_MAX_CONSECUTIVE_FETCH_FAILURES,
  resolveAbsoluteShareUrl
} from "@/components/promotion/homepage-demo-actions";

describe("homepage concept generation controls", () => {
  it("blocks double-submit while a generation is in flight", () => {
    expect(
      canStartHomepageConceptGeneration({
        status: "generating",
        prompt: "Chicago skyline mural",
        email: "buyer@example.com"
      })
    ).toBe(false);
  });

  it("allows a fresh valid prompt and email", () => {
    expect(
      canStartHomepageConceptGeneration({
        status: "idle",
        prompt: "Chicago skyline mural",
        email: "BUYER@EXAMPLE.COM"
      })
    ).toBe(true);
  });

  it("retries transient status polling failures before giving up", () => {
    expect(canRetryConceptStatusPollFailure({ consecutiveFailures: 1 })).toBe(true);
    expect(canRetryConceptStatusPollFailure({ consecutiveFailures: CONCEPT_STATUS_MAX_CONSECUTIVE_FETCH_FAILURES })).toBe(true);
    expect(canRetryConceptStatusPollFailure({ consecutiveFailures: CONCEPT_STATUS_MAX_CONSECUTIVE_FETCH_FAILURES + 1 })).toBe(false);
  });

  it("always yields an absolute URL for the share QR", () => {
    // Absolute URLs pass through untouched.
    expect(resolveAbsoluteShareUrl("https://share.example/preview/abc")).toBe("https://share.example/preview/abc");
    // Relative fallback paths resolve against the provided origin.
    expect(resolveAbsoluteShareUrl("/gallery?designId=chicago-final-1", "https://www.wallprintpro.com")).toBe(
      "https://www.wallprintpro.com/gallery?designId=chicago-final-1"
    );
  });
});
