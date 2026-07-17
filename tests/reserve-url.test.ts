import { afterEach, describe, expect, it } from "vitest";

import { FALLBACK_RESERVE_URL, resolveReserveHref } from "@/lib/reserve-url";

const ENV_KEY = "WALL_PRINT_PRO_RESERVE_URL";

afterEach(() => {
  delete process.env[ENV_KEY];
});

describe("resolveReserveHref", () => {
  it("falls back to the on-site request form when no payment link is configured", () => {
    delete process.env[ENV_KEY];
    expect(resolveReserveHref()).toBe(FALLBACK_RESERVE_URL);
  });

  it("prefers the trimmed env override when set", () => {
    process.env[ENV_KEY] = "  https://buy.stripe.com/real-link  ";
    expect(resolveReserveHref()).toBe("https://buy.stripe.com/real-link");
  });

  it("ignores a blank env override", () => {
    process.env[ENV_KEY] = "   ";
    expect(resolveReserveHref()).toBe(FALLBACK_RESERVE_URL);
  });
});
