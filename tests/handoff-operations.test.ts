import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const operations = readFileSync(join(process.cwd(), "docs/handoff/production-operations.md"), "utf8");
const releaseDecision = readFileSync(join(process.cwd(), "docs/handoff/release-decision.md"), "utf8");
const stripe = readFileSync(join(process.cwd(), "docs/handoff/stripe-reserve-sop.md"), "utf8");

describe("production handoff operations", () => {
  it("pins exact production identities and fail-safe deployment controls", () => {
    expect(operations).toContain("appgprj_6a6193cce8e8819180ad8b803559fb80");
    expect(operations).toContain("gregarious-kookabura-23");
    expect(operations).toContain("nautical-fox-104");
    expect(operations).toContain("Mandatory abort conditions");
    expect(operations).toContain("Rollback order");
  });

  it("documents environment rotation, moderation, daily lead SLA, spend, and incidents", () => {
    for (const required of [
      "OPENAI_IMAGE_MODEL",
      "PHASE0_SEED_TOKEN",
      "Rotation or revocation",
      "Community moderation and removal",
      "every business day",
      "within one business day",
      "OpenAI spend operations",
      "Incident matrix",
      "Log and privacy verification"
    ]) {
      expect(operations).toContain(required);
    }
  });

  it("separates Stripe payment proof and release blockers from analytics and deferred work", () => {
    expect(stripe).toContain("Stripe Dashboard payment status and the Stripe receipt are the authoritative evidence");
    expect(stripe).toContain("analytics only");
    expect(releaseDecision).toContain("Release blockers");
    expect(releaseDecision).toContain("Deferred non-blocking work");
  });
});
