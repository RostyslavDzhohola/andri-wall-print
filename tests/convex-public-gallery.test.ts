import { describe, expect, it, vi } from "vitest";

import { getPublicGalleryPage, getPublishedGalleryEntryBySlug } from "@/lib/convex-public-gallery";

const publicValue = {
  id: "safe-slug",
  title: "Community AI concept",
  description: "Anonymous concept",
  sourceKind: "community_ai",
  print: { aspectRatio: "1:1", widthMeters: 1, heightMeters: 1, label: "1 m square" },
  assets: {
    poster: "https://storage.example/poster",
    glb: "https://storage.example/glb",
    usdz: "https://storage.example/usdz"
  },
  contactEmail: "must-not-pass@example.com",
  prompt: "must not pass",
  providerMetadata: "must not pass",
  leadRequestId: "must-not-pass"
};

describe("public community gallery client", () => {
  it("parses only the public ArSample projection", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({
        status: "success",
        value: { page: [publicValue], continueCursor: "next", isDone: false }
      })
    ) as typeof fetch;

    const result = await getPublicGalleryPage(undefined, {
      convexUrl: "https://example.convex.cloud",
      enabled: true,
      fetcher
    });

    expect(result).toMatchObject({ continueCursor: "next", isDone: false });
    expect(result.samples).toEqual([
      {
        id: "safe-slug",
        title: "Community AI concept",
        description: "Anonymous concept",
        sourceKind: "community_ai",
        print: { aspectRatio: "1:1", widthMeters: 1, heightMeters: 1, label: "3.3 ft x 3.3 ft" },
        assets: publicValue.assets
      }
    ]);
    expect(JSON.stringify(result)).not.toMatch(/contactEmail|prompt|providerMetadata|leadRequestId/);
  });

  it("returns an empty curated-gallery fallback when Convex is unavailable", async () => {
    const result = await getPublicGalleryPage(undefined, {
      convexUrl: "https://example.convex.cloud",
      enabled: true,
      fetcher: vi.fn(async () => {
        throw new Error("offline");
      }) as typeof fetch
    });

    expect(result).toEqual({ samples: [], continueCursor: null, isDone: true });
  });

  it("resolves a request design only from the published slug response", async () => {
    const sample = await getPublishedGalleryEntryBySlug(" safe-slug ", {
      convexUrl: "https://example.convex.cloud",
      enabled: true,
      fetcher: vi.fn(async () => Response.json({ status: "success", value: publicValue })) as typeof fetch
    });

    expect(sample).toMatchObject({ id: "safe-slug", sourceKind: "community_ai" });
    expect(JSON.stringify(sample)).not.toContain("must not pass");
  });
});
