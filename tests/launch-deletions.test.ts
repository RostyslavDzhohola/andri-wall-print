import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const deletedRoutes = [
  "app/admin",
  "app/seller",
  "app/account",
  "app/dashboard",
  "app/builder",
  "app/invite",
  "app/sign-in",
  "app/sign-up"
];

const survivingPublicRoutes = [
  "app/page.tsx",
  "app/gallery/page.tsx",
  "app/preview/[slug]/page.tsx",
  "app/request/page.tsx",
  "app/reserved/page.tsx",
  "app/work/page.tsx"
];

describe("launch route surface", () => {
  it("keeps launch-deleted route segments absent from the app router tree", () => {
    for (const route of deletedRoutes) {
      expect(existsSync(join(process.cwd(), route)), `${route} should be absent`).toBe(false);
    }
  });

  it("keeps surviving public route entrypoints present", () => {
    for (const route of survivingPublicRoutes) {
      expect(existsSync(join(process.cwd(), route)), `${route} should exist`).toBe(true);
    }
  });
});
