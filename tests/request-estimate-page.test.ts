import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("on-site estimate request page", () => {
  const pageSource = readFileSync("app/request/page.tsx", "utf8");
  const formSource = readFileSync("components/request/public-request-form.tsx", "utf8");

  it("uses a single-column estimate introduction without internal labels or demo artwork", () => {
    expect(pageSource).toContain("Request a wall print estimate.");
    expect(pageSource).toContain("Tell us about your wall and idea.");
    expect(pageSource).toContain("Takes about 60 seconds. No spam, no obligation.");
    expect(pageSource).not.toContain("Contact gated draft");
    expect(pageSource).not.toContain("/artworks/chicago-final-1.png");
    expect(pageSource).not.toContain("md:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]");
  });

  it("removes customer-entered print size and keeps the request neutral", () => {
    expect(formSource).not.toContain("PrintSizeFields");
    expect(formSource).not.toContain("Approximate print size");
    expect(formSource).not.toContain("I want to reserve priority review");
    expect(formSource).not.toContain("Reserve priority estimate");
    expect(formSource).not.toContain("$100");
    expect(formSource).toContain("Get estimate");
  });

  it("reduces contact and project-detail friction while preserving the either-or contact requirement", () => {
    expect(formSource).toContain("Best for sending your preview + estimate.");
    expect(formSource).toContain("Only used for questions about your wall.");
    expect(formSource).toContain("isValidLeadPhone(contactPhone)");
    expect(formSource).toContain("Enter a valid phone number with 10 to 15 digits.");
    expect(formSource).toContain("Please provide at least one: email or phone.");
    expect(formSource).toContain('useState<LeadContactMethod>("email")');
    expect(formSource).toContain("Business or space name");
    expect(formSource).toContain("Ex: Joe’s Coffee lobby, kids’ playroom");
    expect(formSource).toContain("Wall &amp; idea");
    expect(formSource).toContain("Where is the wall and what are you thinking?");
    expect(formSource).not.toContain("Wall context");
    expect(formSource).not.toContain("Concept idea");
  });

  it("sets expectations beside submission and in the confirmation state", () => {
    expect(formSource).toContain("We’ll reply within 1 business day.");
    expect(formSource).toContain("Got it.");
    expect(formSource).toContain("send a ballpark estimate");
    expect(formSource).toContain("you reserve your print date.");
  });
});
