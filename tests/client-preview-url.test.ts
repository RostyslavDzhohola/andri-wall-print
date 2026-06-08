import { describe, expect, it, vi } from "vitest";

import { getInitialClientPreviewUrl, resolveClientPreviewUrl } from "@/lib/client-preview-url";

function setWindowLocation(url: string) {
  vi.stubGlobal("window", {
    location: new URL(url)
  });
}

describe("client preview URL resolution", () => {
  it("does not show a localhost share URL before ngrok is resolved", () => {
    setWindowLocation("http://localhost:3000/admin/new");

    expect(getInitialClientPreviewUrl("/preview/p-abc")).toBe("");
  });

  it("uses the local ngrok tunnel when localhost resolves a public origin", async () => {
    setWindowLocation("http://localhost:3000/admin/new");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ origin: "https://example.ngrok-free.dev" })
      }))
    );

    await expect(resolveClientPreviewUrl("/preview/p-abc")).resolves.toEqual({
      url: "https://example.ngrok-free.dev/preview/p-abc",
      source: "ngrok",
      warning: null
    });
  });
});
