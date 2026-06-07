import { describe, expect, it } from "vitest";

import { PHASE0_DEVICE_MATRIX } from "@/lib/device-qa";

describe("Phase 0 device acceptance matrix", () => {
  it("requires the iPhone Safari and Android Chrome native AR passes", () => {
    expect(PHASE0_DEVICE_MATRIX).toEqual([
      expect.objectContaining({
        platform: "ios",
        browser: "Safari",
        expectedViewer: "USDZ Quick Look"
      }),
      expect.objectContaining({
        platform: "android",
        browser: "Chrome",
        expectedViewer: "Scene Viewer"
      })
    ]);
  });
});
