import { describe, expect, it } from "vitest";

import {
  canRetryConceptStatusPollFailure,
  canStartHomepageConceptGeneration,
  CONCEPT_STATUS_MAX_CONSECUTIVE_FETCH_FAILURES,
  resolveAbsoluteShareUrl,
  resolveCompositeShareTarget
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

  it("encodes the concept poster (not a /gallery href) in the composite_only QR", () => {
    const posterUrl = "https://steady-otter-123.convex.cloud/api/storage/poster-abc";

    // composite_only never has a public preview URL, so the QR falls back to the
    // concept's own poster — never the stock /gallery sample.
    const target = resolveCompositeShareTarget({ shareUrl: null, posterUrl });

    expect(target).not.toBeNull();
    expect(target?.url).toBe(posterUrl);
    expect(target?.url).not.toContain("/gallery");
    expect(target?.title).toBe("Scan to open your concept image on your phone");
  });

  it("prefers the public share URL over the poster when the draft is ready", () => {
    const target = resolveCompositeShareTarget({
      shareUrl: "https://www.wallprintpro.com/preview/xyz",
      posterUrl: "https://steady-otter-123.convex.cloud/api/storage/poster-abc"
    });

    expect(target?.url).toBe("https://www.wallprintpro.com/preview/xyz");
    expect(target?.title).toBe("Scan to open this concept on your phone");
  });

  it("renders no QR when neither a share URL nor a poster exists", () => {
    expect(resolveCompositeShareTarget({ shareUrl: null, posterUrl: null })).toBeNull();
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
