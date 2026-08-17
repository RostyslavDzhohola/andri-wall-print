import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/dev-public-origin/route";

describe("development public-origin route", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns a no-store 404 outside development", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const response = await GET();

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).toBe("");
  });

  it("returns the configured preview origin in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_CLIENT_PREVIEW_BASE_URL", "https://phone-preview.example/path");

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      origin: "https://phone-preview.example",
      source: "configured"
    });
  });

  it("uses the active HTTPS ngrok tunnel when no origin is configured", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_CLIENT_PREVIEW_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PUBLIC_PREVIEW_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({
          tunnels: [
            { proto: "http", public_url: "http://ignored.example" },
            { proto: "https", public_url: "https://wall-print.ngrok.app/path" }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const response = await GET();

    await expect(response.json()).resolves.toEqual({
      origin: "https://wall-print.ngrok.app",
      source: "ngrok"
    });
  });

  it("returns a no-store empty result when no configured origin or tunnel is reachable", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("NEXT_PUBLIC_CLIENT_PREVIEW_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_PUBLIC_PREVIEW_BASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("ngrok inspector unavailable"));

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ origin: null, source: "none" });
  });
});
