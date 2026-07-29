import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { getSiteUrl } from "@/lib/site-url";
import {
  readWallPrintProPublicPhone,
  readWallPrintProReserveUrl
} from "@/lib/runtime-env";

// Regression: removing `export const dynamic = "force-dynamic"` from
// app/layout.tsx lets the homepage (and /gallery, /request, /work) prerender.
// Turbopack prod builds FOLD static `process.env.X` reads into build-time
// literals on newly-static pages. Every env read reachable from the now-static
// homepage MUST stay runtime-dynamic (bracket-based reads), or a prod build will
// bake in whatever value was present at build time.
//
// This test pins both halves: (1) the readers actually re-read process.env at
// call time, and (2) the source on the static-homepage path never uses a
// foldable bare `process.env.NEXT_PUBLIC_*` literal.
describe("env-folding regression (newly-static homepage)", () => {
  it("getSiteUrl() reads NEXT_PUBLIC_SITE_URL at call time, not at import time", () => {
    const key = "NEXT_PUBLIC" + "_SITE_URL";
    const original = process.env[key];

    try {
      process.env[key] = "https://www.thewallprintpro.com/runtime-a";
      expect(getSiteUrl()).toBe("https://www.thewallprintpro.com/runtime-a");

      // Change it AFTER first call — a folded literal would ignore this.
      process.env[key] = "https://www.thewallprintpro.com/runtime-b";
      expect(getSiteUrl()).toBe("https://www.thewallprintpro.com/runtime-b");
    } finally {
      if (original === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = original;
      }
    }
  });

  it("public phone + reserve URL readers re-read env at call time", () => {
    const phoneKey = "WALL_PRINT_PRO" + "_PUBLIC_PHONE";
    const reserveKey = "WALL_PRINT_PRO" + "_RESERVE_URL";
    const originalPhone = process.env[phoneKey];
    const originalReserve = process.env[reserveKey];

    try {
      process.env[phoneKey] = "(312) 555-9999";
      process.env[reserveKey] = "https://buy.stripe.com/runtime-link";
      expect(readWallPrintProPublicPhone()).toBe("(312) 555-9999");
      expect(readWallPrintProReserveUrl()).toBe("https://buy.stripe.com/runtime-link");

      delete process.env[phoneKey];
      delete process.env[reserveKey];
      expect(readWallPrintProPublicPhone()).toBeUndefined();
      expect(readWallPrintProReserveUrl()).toBeUndefined();
    } finally {
      if (originalPhone === undefined) delete process.env[phoneKey];
      else process.env[phoneKey] = originalPhone;
      if (originalReserve === undefined) delete process.env[reserveKey];
      else process.env[reserveKey] = originalReserve;
    }
  });

  it("no source file on the static-homepage path uses a foldable bare process.env.NEXT_PUBLIC_* literal", () => {
    // Files rendered by / (the now-static homepage) and its shared layout.
    const files = [
      "app/layout.tsx",
      "app/page.tsx",
      "lib/site-url.ts",
      "lib/runtime-env.ts"
    ];
    // Matches `process.env.NEXT_PUBLIC_FOO` and `process.env.WALL_PRINT_PRO_FOO`
    // written as a *dotted literal* — the foldable form. Bracket reads
    // (process.env[KEY]) and split-string keys are allowed.
    const foldablePattern = /process\.env\.(NEXT_PUBLIC|WALL_PRINT_PRO|CONVEX|CLERK|OPENAI)_[A-Z0-9_]+/;

    for (const relativePath of files) {
      const source = readFileSync(join(process.cwd(), relativePath), "utf8");
      expect(
        foldablePattern.test(source),
        `${relativePath} contains a foldable bare process.env.<KEY> literal; use a bracket-based/dynamic read (see lib/runtime-env.ts).`
      ).toBe(false);
    }
  });
});
