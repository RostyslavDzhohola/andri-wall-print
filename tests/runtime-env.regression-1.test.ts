import { describe, expect, it } from "vitest";

import { getPublicPreview } from "@/lib/convex-public-preview";

describe("runtime environment lookups", () => {
  it("uses the runtime Convex URL for public preview queries", async () => {
    // Regression: ISSUE-002 - production preview route ignored runtime Convex env.
    // Found by /qa on 2026-06-08.
    // Report: .gstack/qa-reports/qa-report-localhost-2026-06-08.md
    const originalFetch = global.fetch;
    const originalConvexUrl = process.env.CONVEX_URL;
    const originalPublicConvexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    const calls: string[] = [];

    process.env.CONVEX_URL = "https://runtime-convex.example";
    delete process.env.NEXT_PUBLIC_CONVEX_URL;
    global.fetch = (async (url: string) => {
      calls.push(url);

      return {
        ok: true,
        status: 200,
        json: async () => ({
          status: "success",
          value: {
            slug: "chicago-final-1",
            title: "Chicago Final 1",
            description: "Client proof",
            print: {
              aspectRatio: "6:5",
              widthMeters: 1.524,
              heightMeters: 1.27,
              label: "152 x 127 cm"
            },
            assets: {
              poster: "https://runtime-convex.example/api/storage/poster",
              glb: "https://runtime-convex.example/api/storage/glb",
              usdz: "https://runtime-convex.example/api/storage/usdz"
            }
          }
        })
      };
    }) as typeof fetch;

    try {
      await expect(getPublicPreview("chicago-final-1")).resolves.toMatchObject({
        status: "ready",
        source: "convex"
      });
      expect(calls).toEqual(["https://runtime-convex.example/api/query"]);
    } finally {
      global.fetch = originalFetch;
      process.env.CONVEX_URL = originalConvexUrl;
      process.env.NEXT_PUBLIC_CONVEX_URL = originalPublicConvexUrl;
    }
  });
});
