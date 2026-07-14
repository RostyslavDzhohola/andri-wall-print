import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("on-site estimate request page", () => {
  const pageSource = readFileSync("app/request/page.tsx", "utf8");
  const formSource = readFileSync("components/request/public-request-form.tsx", "utf8");

  it("uses a single-column estimate introduction without internal labels or demo artwork", () => {
    expect(pageSource).toContain("Start a wall print request.");
    expect(pageSource).toContain("Reserve an on-site estimate.");
    expect(pageSource).not.toContain("Contact gated draft");
    expect(pageSource).not.toContain("/artworks/chicago-final-1.png");
    expect(pageSource).not.toContain("md:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]");
  });

  it("removes customer-entered print size and offers paid priority scheduling", () => {
    expect(formSource).not.toContain("PrintSizeFields");
    expect(formSource).not.toContain("Approximate print size");
    expect(formSource).not.toContain("I want to reserve priority review");
    expect(formSource).toContain("Reserve priority estimate — $100");
    expect(formSource).toContain("Request an on-site estimate");
  });
});
