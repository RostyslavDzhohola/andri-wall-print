import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { AR_SAMPLES, DEFAULT_AR_SAMPLE, formatMeters } from "@/lib/ar-sample";

function publicPath(pathname: string) {
  return join(process.cwd(), "public", pathname.replace(/^\//, ""));
}

describe("AR_SAMPLES", () => {
  it("keeps every proof as one fixed 1:2 print size", () => {
    expect(AR_SAMPLES.map((sample) => sample.id)).toEqual([
      "dragon-wall-print",
      "terra-forms",
      "coastal-blocks",
      "botanical-study",
      "elven-wall-print",
      "cyberpunk-wall-print"
    ]);

    for (const sample of AR_SAMPLES) {
      expect(sample.print.aspectRatio).toBe("1:2");
      expect(sample.print.widthMeters).toBe(0.45);
      expect(sample.print.heightMeters).toBe(0.9);
      expect(sample.print.label).toBe("45 x 90 cm");
    }
  });

  it("keeps the dragon print as the default sample", () => {
    expect(DEFAULT_AR_SAMPLE.id).toBe("dragon-wall-print");
  });

  it("points every sample at checked-in AR assets", () => {
    for (const sample of AR_SAMPLES) {
      for (const asset of Object.values(sample.assets)) {
        const file = publicPath(asset);
        expect(existsSync(file), `${asset} should exist`).toBe(true);
        expect(statSync(file).size, `${asset} should not be empty`).toBeGreaterThan(100);
      }
    }
  });

  it("formats meters for user-facing fixed-size copy", () => {
    expect(formatMeters(DEFAULT_AR_SAMPLE.print.widthMeters)).toBe("45 cm");
    expect(formatMeters(DEFAULT_AR_SAMPLE.print.heightMeters)).toBe("90 cm");
  });
});
