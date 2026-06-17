import { describe, expect, it } from "vitest";

import { makeLeadRateLimitBucket, normalizeLeadPhone, normalizeLeadRequestInput } from "@/lib/lead-request-contract";

describe("lead request contract", () => {
  it("normalizes required contact fields and reserve intent", () => {
    expect(
      normalizeLeadRequestInput({
        contactName: "  Jane   Buyer ",
        contactEmail: " JANE@EXAMPLE.COM ",
        contactPhone: "(555) 123-4567",
        businessName: "  Studio   A ",
        conceptPrompt: "  skyline mural ",
        intent: "reserve"
      })
    ).toMatchObject({
      contactName: "Jane Buyer",
      contactEmail: "jane@example.com",
      normalizedContactEmail: "jane@example.com",
      contactPhone: "(555) 123-4567",
      normalizedContactPhone: "5551234567",
      businessName: "Studio A",
      conceptPrompt: "skyline mural",
      intent: "reserve",
      reserveInterest: true
    });
  });

  it("rejects missing name and malformed email before persistence", () => {
    expect(() =>
      normalizeLeadRequestInput({
        contactName: "",
        contactEmail: "buyer@example.com"
      })
    ).toThrow("Name is required.");

    expect(() =>
      normalizeLeadRequestInput({
        contactName: "Buyer",
        contactEmail: "not-email"
      })
    ).toThrow("A valid email is required.");
  });

  it("builds deterministic phone and daily rate-limit keys", () => {
    expect(normalizeLeadPhone("+1 (555) 000-1212")).toBe("15550001212");
    expect(makeLeadRateLimitBucket(Date.UTC(2026, 5, 17, 12))).toBe("2026-06-17");
  });
});
