import { describe, expect, it } from "vitest";

import { safeErrorName } from "@/lib/safe-logging";

describe("safe logging", () => {
  it("keeps an error class for correlation without exposing its message", () => {
    const error = new TypeError("buyer@example.com private prompt and API response");

    expect(safeErrorName(error)).toBe("TypeError");
    expect(safeErrorName(error)).not.toContain(error.message);
    expect(safeErrorName({ message: "private data" })).toBe("UnknownError");
  });
});
