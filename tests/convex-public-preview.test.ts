import { describe, expect, it } from "vitest";

import { assertValidAssetMeta, assertValidPrint } from "@/convex/validators";
import { getPublicPreview, parseConvexPreviewValue, type PublicPreviewOptions } from "@/lib/convex-public-preview";

function jsonResponse(body: unknown, options: { ok?: boolean; status?: number } = {}) {
  return {
    ok: options.ok ?? true,
    status: options.status ?? 200,
    json: async () => body
  };
}

describe("Convex public preview adapter", () => {
  it("rejects invalid seed dimensions and byte sizes before writing Convex records", () => {
    expect(() => assertValidPrint({ widthMeters: 0, heightMeters: 1 })).toThrow("print.widthMeters must be a positive finite number.");
    expect(() => assertValidPrint({ widthMeters: 1, heightMeters: Number.POSITIVE_INFINITY })).toThrow(
      "print.heightMeters must be a positive finite number."
    );

    expect(() =>
      assertValidAssetMeta({
        poster: { byteLength: 1 },
        glb: { byteLength: -1 },
        usdz: { byteLength: 1 }
      })
    ).toThrow("assetMeta.glb.byteLength must be a non-negative integer.");

    expect(() =>
      assertValidAssetMeta({
        poster: { byteLength: 1 },
        glb: { byteLength: 1.25 },
        usdz: { byteLength: 1 }
      })
    ).toThrow("assetMeta.glb.byteLength must be a non-negative integer.");
  });

  it("parses ready Convex storage URLs into an AR sample", () => {
    expect(
      parseConvexPreviewValue({
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
          poster: "https://steady-otter-123.convex.cloud/api/storage/poster",
          glb: "https://steady-otter-123.convex.cloud/api/storage/glb",
          usdz: "https://steady-otter-123.convex.cloud/api/storage/usdz"
        }
      })
    ).toEqual({
      id: "chicago-final-1",
      title: "Chicago Final 1",
      description: "Client proof",
      print: {
        aspectRatio: "6:5",
        widthMeters: 1.524,
        heightMeters: 1.27,
        label: "5 ft x 4.2 ft"
      },
      assets: {
        poster: "https://steady-otter-123.convex.cloud/api/storage/poster",
        glb: "https://steady-otter-123.convex.cloud/api/storage/glb",
        usdz: "https://steady-otter-123.convex.cloud/api/storage/usdz"
      }
    });
  });

  it("drops internal price fields from buyer-ready preview values", () => {
    const parsed = parseConvexPreviewValue({
      slug: "client-proof-abc",
      title: "Client Proof",
      description: "Client proof",
      print: {
        aspectRatio: "6:5",
        widthMeters: 1.524,
        heightMeters: 1.27,
        label: "152 x 127 cm"
      },
      assets: {
        poster: "https://steady-otter-123.convex.cloud/api/storage/poster",
        glb: "https://steady-otter-123.convex.cloud/api/storage/glb",
        usdz: "https://steady-otter-123.convex.cloud/api/storage/usdz"
      },
      pricing: {
        areaSquareFeet: 20.83,
        pricePerSquareFootCents: 4200,
        estimateCents: 87503
      },
      rate: 42,
      internalEstimateCents: 87503
    });

    expect(JSON.stringify(parsed)).not.toMatch(/price|pricing|rate|estimate/i);
    expect(parsed?.print.label).toBe("5 ft x 4.2 ft");
  });

  it("calls the Convex public HTTP query endpoint", async () => {
    const calls: Array<{ url: string; body: unknown }> = [];
    const fetcher: PublicPreviewOptions["fetcher"] = async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });

      return jsonResponse({
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
            poster: "https://steady-otter-123.convex.cloud/api/storage/poster",
            glb: "https://steady-otter-123.convex.cloud/api/storage/glb",
            usdz: "https://steady-otter-123.convex.cloud/api/storage/usdz"
          }
        }
      });
    };

    await expect(
      getPublicPreview("chicago-final-1", {
        convexUrl: "https://steady-otter-123.convex.cloud/",
        fetcher
      })
    ).resolves.toMatchObject({
      status: "ready",
      source: "convex",
      sample: {
        id: "chicago-final-1"
      }
    });

    expect(calls).toEqual([
      {
        url: "https://steady-otter-123.convex.cloud/api/query",
        body: {
          path: "arPreviews:getPublicPreview",
          args: { slug: "chicago-final-1" },
          format: "json"
        }
      }
    ]);
  });

  it("parses preparing bundle responses without exposing artwork", async () => {
    const fetcher: PublicPreviewOptions["fetcher"] = async () =>
      jsonResponse({
        status: "success",
        value: {
          id: "client-proof-abc",
          slug: "client-proof-abc",
          status: "preparing"
        }
      });

    await expect(
      getPublicPreview("client-proof-abc", {
        convexUrl: "https://steady-otter-123.convex.cloud",
        fetcher
      })
    ).resolves.toEqual({
      status: "preparing",
      slug: "client-proof-abc",
      reason: "This client preview is being prepared. Check back shortly."
    });
  });

  it("preserves AI concept source kind for public warning labels", async () => {
    const fetcher: PublicPreviewOptions["fetcher"] = async () =>
      jsonResponse({
        status: "success",
        value: {
          slug: "client-proof-abc",
          title: "Concept Draft",
          description: "Client proof",
          sourceKind: "ai_concept",
          print: {
            aspectRatio: "1:1",
            widthMeters: 1,
            heightMeters: 1,
            label: "100 x 100 cm"
          },
          assets: {
            poster: "https://steady-otter-123.convex.cloud/api/storage/poster",
            glb: "https://steady-otter-123.convex.cloud/api/storage/glb",
            usdz: "https://steady-otter-123.convex.cloud/api/storage/usdz"
          }
        }
      });

    await expect(
      getPublicPreview("client-proof-abc", {
        convexUrl: "https://steady-otter-123.convex.cloud",
        fetcher
      })
    ).resolves.toMatchObject({
      status: "ready",
      sourceKind: "ai_concept",
      sample: {
        id: "client-proof-abc"
      }
    });
  });

  it("parses unavailable bundle responses without exposing artwork", async () => {
    const fetcher: PublicPreviewOptions["fetcher"] = async () =>
      jsonResponse({
        status: "success",
        value: {
          id: "client-proof-abc",
          slug: "client-proof-abc",
          status: "unavailable"
        }
      });

    await expect(
      getPublicPreview("client-proof-abc", {
        convexUrl: "https://steady-otter-123.convex.cloud",
        fetcher
      })
    ).resolves.toEqual({
      status: "unavailable",
      slug: "client-proof-abc",
      reason: "This client preview is unavailable."
    });
  });

  it("returns unavailable when Convex returns a null asset URL", async () => {
    const fetcher: PublicPreviewOptions["fetcher"] = async () =>
      jsonResponse({
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
            poster: "https://steady-otter-123.convex.cloud/api/storage/poster",
            glb: "https://steady-otter-123.convex.cloud/api/storage/glb",
            usdz: null
          }
        }
      });

    await expect(
      getPublicPreview("chicago-final-1", {
        convexUrl: "https://steady-otter-123.convex.cloud",
        fetcher
      })
    ).resolves.toEqual({
      status: "unavailable",
      slug: "chicago-final-1",
      reason: "This client preview is not available."
    });
  });

  it("keeps local fallback explicit", async () => {
    await expect(getPublicPreview("chicago-final-1", { allowLocalFallback: true })).resolves.toMatchObject({
      status: "ready",
      source: "local-fallback"
    });

    await expect(getPublicPreview("chicago-final-1", { allowLocalFallback: false })).resolves.toEqual({
      status: "unavailable",
      slug: "chicago-final-1",
      reason: "This client preview is unavailable."
    });
  });
});
