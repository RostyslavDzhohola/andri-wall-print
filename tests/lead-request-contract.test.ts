import { describe, expect, it } from "vitest";

import {
  isValidLeadPhone,
  leadRequestSchema,
  makeLeadRateLimitBucket,
  normalizeLeadPhone,
  normalizeLeadRequestInput
} from "@/lib/lead-request-contract";

describe("lead request contract", () => {
  it("normalizes required contact fields and reserve intent", () => {
    expect(
      normalizeLeadRequestInput({
        contactName: "  Jane   Buyer ",
        contactEmail: " JANE@EXAMPLE.COM ",
        contactPhone: "(555) 123-4567",
        preferredContactMethod: "either",
        projectType: "  Business wall ",
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
      preferredContactMethod: "either",
      projectType: "Business wall",
      businessName: "Studio A",
      conceptPrompt: "skyline mural",
      intent: "reserve",
      reserveInterest: true
    });
  });

  it("accepts phone-only leads when phone is the preferred contact path", () => {
    expect(
      normalizeLeadRequestInput({
        contactName: "Phone Lead",
        contactPhone: "(312) 555-0101",
        preferredContactMethod: "phone"
      })
    ).toMatchObject({
      contactName: "Phone Lead",
      contactEmail: "",
      contactPhone: "(312) 555-0101",
      normalizedContactEmail: "",
      normalizedContactPhone: "3125550101",
      preferredContactMethod: "phone"
    });
  });

  it("accepts email-only leads when email is the preferred contact path", () => {
    expect(
      normalizeLeadRequestInput({
        contactName: "Email Lead",
        contactEmail: "lead@example.com",
        preferredContactMethod: "email"
      })
    ).toMatchObject({
      contactName: "Email Lead",
      contactEmail: "lead@example.com",
      normalizedContactEmail: "lead@example.com",
      preferredContactMethod: "email"
    });
  });

  it("rejects missing name and missing or malformed contact paths before persistence", () => {
    expect(() =>
      normalizeLeadRequestInput({
        contactName: "",
        contactPhone: "(555) 123-4567"
      })
    ).toThrow("Name is required.");

    expect(() =>
      normalizeLeadRequestInput({
        contactName: "Buyer"
      })
    ).toThrow("Email or phone is required.");

    expect(() =>
      normalizeLeadRequestInput({
        contactName: "Buyer",
        contactEmail: "not-email",
        contactPhone: "(555) 123-4567"
      })
    ).toThrow("Enter a valid email address.");

    expect(() =>
      normalizeLeadRequestInput({
        contactName: "Buyer",
        contactEmail: "buyer@example.com",
        preferredContactMethod: "phone"
      })
    ).toThrow("Phone is required when phone is the preferred contact method.");
  });

  it("uses Zod to require a realistic phone number", () => {
    expect(leadRequestSchema.safeParse({ contactName: "Buyer", contactPhone: "3125550101", preferredContactMethod: "phone" }).success).toBe(true);
    expect(isValidLeadPhone("+1 (312) 555-0101")).toBe(true);
    expect(isValidLeadPhone("555-0101")).toBe(false);
    expect(isValidLeadPhone("call 312-555-0101")).toBe(false);

    expect(() =>
      normalizeLeadRequestInput({
        contactName: "Buyer",
        contactPhone: "555-0101",
        preferredContactMethod: "phone"
      })
    ).toThrow("Enter a valid phone number with 10 to 15 digits.");
  });

  it("builds deterministic phone and daily rate-limit keys", () => {
    expect(normalizeLeadPhone("+1 (555) 000-1212")).toBe("15550001212");
    expect(makeLeadRateLimitBucket(Date.UTC(2026, 5, 17, 12))).toBe("2026-06-17");
  });
});
