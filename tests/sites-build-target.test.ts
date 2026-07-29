import { describe, expect, it } from "vitest";

import packageJson from "@/package.json";

describe("Sites build target", () => {
  it("keeps the production build on Vinext", () => {
    expect(packageJson.scripts.build).toContain("vinext build");
    expect(packageJson.scripts).not.toHaveProperty("build:next");
  });
});
