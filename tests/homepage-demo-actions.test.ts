import { describe, expect, it } from "vitest";

import {
  canRetryConceptStatusPollFailure,
  canStartHomepageConceptGeneration,
  CONCEPT_STATUS_MAX_CONSECUTIVE_FETCH_FAILURES
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
});
