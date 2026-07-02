import { describe, expect, it } from "vitest";

import { resolveGalleryInitialDesignId } from "@/lib/gallery-page-defaults";

describe("gallery page defaults", () => {
  it("uses a valid design id as the initial public gallery artwork", () => {
    expect(resolveGalleryInitialDesignId({ designId: "chicago-final-2" })).toBe("chicago-final-2");
  });

  it("uses the first supplied design id when the query param is repeated", () => {
    expect(resolveGalleryInitialDesignId({ designId: ["dragon-wall-print", "chicago-final-1"] })).toBe("dragon-wall-print");
  });

  it("ignores unknown design ids instead of falling back from user input", () => {
    expect(resolveGalleryInitialDesignId({ designId: "missing-design" })).toBeUndefined();
  });
});
