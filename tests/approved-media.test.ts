import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import decisions from "@/assets/wall-print-pro-media-decisions-2026-07-23.json";
import manifest from "@/public/media/wall-print-pro/manifest.json";

describe("approved Sites media", () => {
  it("matches the authoritative approval export exactly and keeps sections non-overlapping", () => {
    const homepage = manifest.homepage.map((item) => item.original);
    const ourWork = manifest.ourWork.map((item) => item.original);

    expect(homepage).toEqual(decisions.homepage.keep);
    expect(ourWork).toEqual(decisions.ourWork.keep);
    expect(new Set(homepage).size).toBe(homepage.length);
    expect(new Set(ourWork).size).toBe(ourWork.length);
    expect(homepage.filter((source) => ourWork.includes(source))).toEqual([]);
  });

  it("publishes every declared derivative and labels workshop demonstrations", () => {
    const entries = [...manifest.homepage, ...manifest.ourWork];

    for (const item of entries) {
      expect(item.alt.trim().length).toBeGreaterThan(20);

      if (item.kind === "video") {
        expect(item.label).toBe("Workshop demonstration");
      }

      for (const source of Object.values(item.sources)) {
        expect(source.path).toMatch(/^\/media\/wall-print-pro\//);
        expect(source.bytes).toBeGreaterThan(0);
        expect(source.sha256).toMatch(/^[a-f0-9]{64}$/);
        expect(existsSync(join(process.cwd(), "public", source.path))).toBe(true);
      }
    }
  });

  it("does not keep the retired unapproved work-video posters in public", () => {
    expect(existsSync(join(process.cwd(), "public", "work-videos"))).toBe(false);
    expect(
      readFileSync(
        join(
          process.cwd(),
          "components",
          "promotion",
          "approved-media-showcase.tsx",
        ),
        "utf8",
      ),
    ).not.toMatch(/instagram|facebook|work-videos/i);
  });
});
