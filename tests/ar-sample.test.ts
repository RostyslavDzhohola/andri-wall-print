import { describe, expect, it } from "vitest";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

import { AR_SAMPLES, DEFAULT_AR_SAMPLE, formatMeters, formatPrintSize } from "@/lib/ar-sample";

function publicPath(pathname: string) {
  return join(process.cwd(), "public", pathname.replace(/^\//, ""));
}

describe("AR_SAMPLES", () => {
  it("keeps client proofs first, followed by the original fixed-size samples", () => {
    expect(AR_SAMPLES.map((sample) => sample.id)).toEqual([
      "chicago-final-1",
      "chicago-final-2",
      "chicago-final-3",
      "dragon-wall-print",
      "elven-wall-print",
      "cyberpunk-wall-print"
    ]);

    expect(AR_SAMPLES.slice(0, 3).map((sample) => sample.print.label)).toEqual([
      "5 ft x 4.2 ft",
      "3 ft x 5 ft",
      "4 ft x 5 ft"
    ]);

    for (const sample of AR_SAMPLES.slice(3)) {
      expect(sample.print.aspectRatio).toBe("45:90");
      expect(sample.print.widthMeters).toBe(0.45);
      expect(sample.print.heightMeters).toBe(0.9);
      expect(sample.print.label).toBe("1.5 ft x 3 ft");
    }
  });

  it("keeps the first client print as the default sample", () => {
    expect(DEFAULT_AR_SAMPLE.id).toBe("chicago-final-1");
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
    expect(formatMeters(DEFAULT_AR_SAMPLE.print.widthMeters)).toBe("5 ft");
    expect(formatMeters(DEFAULT_AR_SAMPLE.print.heightMeters)).toBe("4.2 ft");
    expect(formatPrintSize(DEFAULT_AR_SAMPLE.print)).toBe("5 ft wide x 4.2 ft tall");
  });
});
