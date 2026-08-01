import { describe, expect, it, vi } from "vitest";

vi.mock("vinext/server/app-router-entry", () => ({
  default: { fetch: vi.fn() },
}));

vi.mock("vinext/server/image-optimization", () => ({
  DEFAULT_DEVICE_SIZES: [],
  DEFAULT_IMAGE_SIZES: [],
  handleImageOptimization: vi.fn(),
}));

const { withSecurityHeaders } = await import("../worker/index");

describe("withSecurityHeaders", () => {
  it("adds security headers to HTML while preserving existing headers", () => {
    const response = withSecurityHeaders(
      new Response("<html></html>", {
        headers: {
          "content-type": "text/html; charset=utf-8",
          "x-existing-header": "kept",
        },
      }),
    );

    expect(response.headers.get("Strict-Transport-Security")).toBe(
      "max-age=31536000; includeSubDomains",
    );
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(response.headers.get("X-Frame-Options")).toBe("SAMEORIGIN");
    expect(response.headers.get("Permissions-Policy")).toBe(
      "camera=(self), microphone=(), geolocation=()",
    );
    expect(response.headers.get("x-existing-header")).toBe("kept");
  });

  it.each(["model/gltf-binary", "application/json"])(
    "does not add security headers to %s responses",
    (contentType) => {
      const original = new Response("payload", {
        headers: { "content-type": contentType },
      });
      const response = withSecurityHeaders(original);

      expect(response).toBe(original);
      expect(response.headers.has("Strict-Transport-Security")).toBe(false);
    },
  );
});
