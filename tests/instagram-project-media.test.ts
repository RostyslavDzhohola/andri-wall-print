import { afterEach, describe, expect, it, vi } from "vitest";

import { GET } from "@/app/api/instagram-projects/route";
import { resolveInstagramProjectMedia } from "@/lib/instagram-project-media";

const originalEnv = { ...process.env };
const originalFetch = globalThis.fetch;

describe("Instagram project media", () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("matches only approved seller-owned posts and preserves catalog order and context", () => {
    const projects = resolveInstagramProjectMedia({
      data: [
        {
          id: "label808_media",
          media_type: "CAROUSEL_ALBUM",
          permalink: "https://www.instagram.com/p/DY0fWs8jcoi/",
          children: {
            data: [
              {
                media_type: "VIDEO",
                media_url: "https://scontent.example/label808.mp4",
                thumbnail_url: "https://scontent.example/label808.jpg"
              }
            ]
          }
        },
        {
          id: "unverified_collaborator_media",
          media_type: "IMAGE",
          media_url: "https://scontent.example/collaborator.jpg",
          permalink: "https://www.instagram.com/p/DYfNmX-kf05/"
        },
        {
          id: "logo_media",
          media_type: "IMAGE",
          media_url: "https://scontent.example/logo.jpg",
          permalink: "https://www.instagram.com/reel/DZLMtbGseuj/"
        }
      ]
    });

    expect(projects).toEqual([
      {
        projectId: "business-logo-wall",
        mediaId: "logo_media",
        kind: "image",
        mediaUrl: "https://scontent.example/logo.jpg",
        posterUrl: null,
        canonicalUrl: "https://www.instagram.com/wall_printpro/reel/DZLMtbGseuj/",
        title: "A business logo, printed directly on the wall",
        summary: "A branding example for offices, studios, restaurants, and retail spaces."
      },
      {
        projectId: "label808-studio",
        mediaId: "label808_media",
        kind: "video",
        mediaUrl: "https://scontent.example/label808.mp4",
        posterUrl: "https://scontent.example/label808.jpg",
        canonicalUrl: "https://www.instagram.com/wall_printpro/p/DY0fWs8jcoi/",
        title: "A recording studio brought to life",
        summary: "A commercial wall-printing project created for the Label808 music studio."
      }
    ]);
    expect(projects.some((project) => project.projectId === "first-client-story")).toBe(false);
  });

  it("returns a private fallback response when the seller API connection is absent", async () => {
    delete process.env.WALL_PRINT_PRO_INSTAGRAM_USER_ID;
    delete process.env.WALL_PRINT_PRO_INSTAGRAM_ACCESS_TOKEN;
    delete process.env.WALL_PRINT_PRO_INSTAGRAM_GRAPH_VERSION;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await GET();

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: false, reason: "not-configured" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not call an unversioned Meta endpoint", async () => {
    process.env.WALL_PRINT_PRO_INSTAGRAM_USER_ID = "seller_123";
    process.env.WALL_PRINT_PRO_INSTAGRAM_ACCESS_TOKEN = "secret_meta_token";
    delete process.env.WALL_PRINT_PRO_INSTAGRAM_GRAPH_VERSION;
    const fetchMock = vi.fn();
    globalThis.fetch = fetchMock as typeof fetch;

    const response = await GET();

    expect(response.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the Meta token server-side while returning matched project media", async () => {
    process.env.WALL_PRINT_PRO_INSTAGRAM_USER_ID = "seller_123";
    process.env.WALL_PRINT_PRO_INSTAGRAM_ACCESS_TOKEN = "secret_meta_token";
    process.env.WALL_PRINT_PRO_INSTAGRAM_GRAPH_VERSION = "v26.0";
    const requests: Array<{ url: string; authorization: string | null }> = [];
    globalThis.fetch = vi.fn(async (input, init) => {
      requests.push({
        url: String(input),
        authorization: new Headers(init?.headers).get("Authorization")
      });
      return Response.json({
        data: [
          {
            id: "label808_media",
            media_type: "VIDEO",
            media_url: "https://scontent.example/label808.mp4",
            thumbnail_url: "https://scontent.example/label808.jpg",
            permalink: "https://www.instagram.com/p/DY0fWs8jcoi/"
          }
        ]
      });
    }) as typeof fetch;

    const response = await GET();
    const serializedBody = JSON.stringify(await response.json());

    expect(response.status).toBe(200);
    expect(requests).toHaveLength(1);
    expect(requests[0].url).toContain("https://graph.instagram.com/v26.0/seller_123/media?");
    expect(requests[0].url).not.toContain("secret_meta_token");
    expect(requests[0].authorization).toBe("Bearer secret_meta_token");
    expect(serializedBody).toContain("label808_media");
    expect(serializedBody).not.toContain("secret_meta_token");
  });
});
