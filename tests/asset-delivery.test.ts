import { existsSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  AR_ASSET_SIZE_BUDGET_BYTES,
  AR_SAMPLE_TOTAL_SIZE_BUDGET_BYTES,
  checkAssetDelivery,
  getAssetKindFromHref
} from "@/lib/ar-launcher";
import { AR_SAMPLES } from "@/lib/ar-sample";

function publicPath(pathname: string) {
  return join(process.cwd(), "public", pathname.replace(/^\//, ""));
}

function readGlbJson(pathname: string) {
  const glb = readFileSync(publicPath(pathname));
  const jsonLength = glb.readUInt32LE(12);
  const jsonType = glb.toString("ascii", 16, 20);

  expect(jsonType, `${pathname} should start with a JSON chunk`).toBe("JSON");

  return JSON.parse(glb.subarray(20, 20 + jsonLength).toString("utf8").trim());
}

describe("Phase 0 AR asset delivery contract", () => {
  it("keeps checked-in mobile AR assets under the initial size budget", () => {
    for (const sample of AR_SAMPLES) {
      let totalBytes = 0;

      for (const asset of Object.values(sample.assets)) {
        const kind = getAssetKindFromHref(asset);
        const file = publicPath(asset);
        const size = statSync(file).size;

        expect(existsSync(file), `${asset} should exist`).toBe(true);
        expect(size, `${asset} should stay under the ${kind} budget`).toBeLessThanOrEqual(AR_ASSET_SIZE_BUDGET_BYTES[kind]);
        totalBytes += size;
      }

      expect(totalBytes, `${sample.id} should stay under the per-sample mobile budget`).toBeLessThanOrEqual(AR_SAMPLE_TOTAL_SIZE_BUDGET_BYTES);
    }
  });

  it("validates status, redirects, content type, and size from a HEAD response", async () => {
    const check = await checkAssetDelivery("usdz", "https://steady-otter-123.convex.cloud/api/storage/example", async (_url, init) => {
      expect(init).toEqual({ method: "HEAD", redirect: "follow" });

      return {
        ok: true,
        redirected: true,
        status: 200,
        headers: new Headers({
          "content-type": "model/vnd.usdz+zip",
          "content-length": "2500000"
        })
      };
    });

    expect(check).toMatchObject({
      kind: "usdz",
      status: 200,
      redirected: true,
      contentType: "model/vnd.usdz+zip",
      contentLength: 2_500_000,
      ok: true,
      problems: []
    });
  });

  it("uses hard alpha cutouts for the Chicago wall-placement models", () => {
    for (const sample of AR_SAMPLES.slice(0, 3)) {
      const glb = readGlbJson(sample.assets.glb);
      const material = glb.materials[0];
      const usdz = readFileSync(publicPath(sample.assets.usdz), "utf8");

      expect(material.alphaMode, `${sample.assets.glb} should discard transparent edge pixels`).toBe("MASK");
      expect(material.alphaCutoff, `${sample.assets.glb} should avoid blended translucent edges`).toBe(0.5);
      expect(usdz, `${sample.assets.usdz} should avoid blended translucent edges`).toContain("float inputs:opacityThreshold = 0.5");
    }
  });

  it("reports bad Convex delivery headers before device QA", async () => {
    const check = await checkAssetDelivery("glb", "https://steady-otter-123.convex.cloud/api/storage/example", async () => ({
      ok: true,
      redirected: false,
      status: 200,
      headers: new Headers({
        "content-type": "application/octet-stream",
        "content-length": "6000000"
      })
    }));

    expect(check.ok).toBe(false);
    expect(check.problems).toEqual([
      "Expected model/gltf-binary, received application/octet-stream.",
      "Expected glb under 4250000 bytes, received 6000000."
    ]);
  });
});
