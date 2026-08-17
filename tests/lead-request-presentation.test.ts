import { describe, expect, it } from "vitest";

import {
  formatAiConceptDraftStatus,
  formatLeadRequestResultMessage,
  makeConceptDraftTitle
} from "@/lib/lead-request-presentation";

describe("lead request presentation", () => {
  it("builds PII-neutral concept draft titles", () => {
    expect(makeConceptDraftTitle()).toBe("Wall print concept draft");
    expect(makeConceptDraftTitle()).not.toContain("Lakefront Studio");
  });

  it("labels every public AI concept draft state", () => {
    expect(formatAiConceptDraftStatus("disabled")).toBe("Concept drafting offline");
    expect(formatAiConceptDraftStatus("queued")).toBe("Concept draft queued");
    expect(formatAiConceptDraftStatus("failed")).toBe("Concept draft failed");
    expect(formatAiConceptDraftStatus("ready")).toBe("Concept draft ready");
    expect(formatAiConceptDraftStatus("composite_only")).toBe("Concept poster ready");
    expect(formatAiConceptDraftStatus("rejected")).toBe("Concept draft rejected");
    expect(formatAiConceptDraftStatus("rate_limited")).toBe("Daily concept draft limit reached");
  });

  it("covers in-progress and empty draft states", () => {
    expect(formatAiConceptDraftStatus("generating")).toBe("Concept draft in progress");
    expect(formatAiConceptDraftStatus(undefined)).toBe("No concept draft");
    expect(formatAiConceptDraftStatus("mystery")).toBe("Concept draft status unavailable");
  });

  it("uses the Convex result message before falling back to a draft status label", () => {
    expect(
      formatLeadRequestResultMessage({
        message: "Request saved. We'll review it and text you to schedule your estimate.",
        aiDraftStatus: "queued"
      })
    ).toBe("Request saved. We'll review it and text you to schedule your estimate.");

    expect(formatLeadRequestResultMessage({ aiDraftStatus: "rate_limited" })).toBe("Daily concept draft limit reached");
  });
});
