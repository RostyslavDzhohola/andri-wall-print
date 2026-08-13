import { afterEach, describe, expect, it, vi } from "vitest";

import { POST as postHomepageArtwork } from "@/app/api/homepage-artwork/route";

const originalEnv = { ...process.env };

describe("private API response hardening", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  it("rejects malformed homepage create payloads before calling Convex and disables caching", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const response = await postHomepageArtwork(new Request("https://example.test/api/homepage-artwork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", input: null })
    }));

    expect(response.status).toBe(400);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, message: "Wall preview request is invalid." });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does not return upstream Convex error details", async () => {
    process.env.CONVEX_URL = "https://convex.example.test";
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      status: "error",
      errorMessage: "secret upstream stack and internal data"
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    const response = await postHomepageArtwork(new Request("https://example.test/api/homepage-artwork", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "upload_url" })
    }));
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(JSON.stringify(body)).not.toContain("secret upstream");
    expect(body).toEqual({ ok: false, message: "Wall preview could not be prepared." });
  });
});
