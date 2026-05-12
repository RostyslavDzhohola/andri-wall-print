import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { AR_SAMPLE, formatMeters } from "@/lib/ar-sample";

function publicPath(pathname: string) {
  return join(process.cwd(), "public", pathname.replace(/^\//, ""));
}

describe("AR_SAMPLE", () => {
  it("keeps the first proof as one fixed 1:2 print size", () => {
    expect(AR_SAMPLE.print.aspectRatio).toBe("1:2");
    expect(AR_SAMPLE.print.widthMeters).toBe(0.45);
    expect(AR_SAMPLE.print.heightMeters).toBe(0.9);
    expect(AR_SAMPLE.print.label).toBe("45 x 90 cm");
  });

  it("points at checked-in AR assets", () => {
    for (const asset of Object.values(AR_SAMPLE.assets)) {
      const file = publicPath(asset);
      expect(existsSync(file), `${asset} should exist`).toBe(true);
      expect(statSync(file).size, `${asset} should not be empty`).toBeGreaterThan(100);
    }
  });

  it("formats meters for user-facing fixed-size copy", () => {
    expect(formatMeters(AR_SAMPLE.print.widthMeters)).toBe("45 cm");
    expect(formatMeters(AR_SAMPLE.print.heightMeters)).toBe("90 cm");
  });
});
