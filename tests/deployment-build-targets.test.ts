import { describe, expect, it } from "vitest";

import packageJson from "@/package.json";
import vercelConfig from "@/vercel.json";

describe("deployment build targets", () => {
  it("keeps Sites and Vercel on their compatible build commands", () => {
    expect(packageJson.scripts.build).toContain("vinext build");
    expect(packageJson.scripts["build:next"]).toBe("next build");
    expect(vercelConfig).toEqual({
      buildCommand: "pnpm build:next",
      framework: "nextjs",
    });
  });
});
