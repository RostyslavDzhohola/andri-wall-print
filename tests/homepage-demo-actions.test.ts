import { describe, expect, it } from "vitest";

import { canStartHomepageConceptGeneration } from "@/components/promotion/homepage-demo-actions";

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
});
