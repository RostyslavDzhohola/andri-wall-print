import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { getFacebookEmbedUrl, getInstagramEmbedPermalink, SOCIAL_PROOF_ITEMS } from "@/lib/social-proof";

const EXPECTED_URLS = [
  "https://www.facebook.com/reel/2183497552487204/",
  "https://www.instagram.com/wall_printpro/reel/DZLMtbGseuj/",
  "https://www.instagram.com/wall_printpro/reel/DX_9ifJtsPg/",
  "https://www.instagram.com/iam_sushi/p/DYfNmX-kf05/",
  "https://www.instagram.com/wall_printpro/p/DY0fWs8jcoi/",
  "https://www.instagram.com/wall_printpro/p/DXuOrnmDUG8/"
] as const;

describe("social proof catalog", () => {
  it("keeps the six approved public posts in review order", () => {
    expect(SOCIAL_PROOF_ITEMS.map((item) => item.canonicalUrl)).toEqual(EXPECTED_URLS);
    expect(new Set(SOCIAL_PROOF_ITEMS.map((item) => item.canonicalUrl)).size).toBe(6);
  });

  it("embeds only the verified Facebook customer reel", () => {
    const embedUrls = SOCIAL_PROOF_ITEMS.map((item) => getFacebookEmbedUrl(item));

    expect(embedUrls.filter(Boolean)).toHaveLength(1);
    expect(embedUrls[0]).toContain("https://www.facebook.com/plugins/video.php?");
    expect(embedUrls[0]).toContain(encodeURIComponent(EXPECTED_URLS[0]));
    expect(embedUrls.slice(1)).toEqual([null, null, null, null, null]);
  });

  it("marks every approved Instagram example for official embed.js rendering", () => {
    expect(SOCIAL_PROOF_ITEMS[0].embedStatus).toBe("verified-facebook-embed");
    expect(SOCIAL_PROOF_ITEMS.slice(1).map((item) => item.embedStatus)).toEqual(Array(5).fill("instagram-embed"));
  });

  it("normalizes profile-prefixed Instagram links into embeddable shortcode permalinks", () => {
    expect(SOCIAL_PROOF_ITEMS.map((item) => getInstagramEmbedPermalink(item))).toEqual([
      null,
      "https://www.instagram.com/reel/DZLMtbGseuj/",
      "https://www.instagram.com/reel/DX_9ifJtsPg/",
      "https://www.instagram.com/p/DYfNmX-kf05/",
      "https://www.instagram.com/p/DY0fWs8jcoi/",
      "https://www.instagram.com/p/DXuOrnmDUG8/"
    ]);
  });

  it("provides stable copy and a canonical source for every item", () => {
    for (const item of SOCIAL_PROOF_ITEMS) {
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.summary.length).toBeGreaterThan(0);
      expect(item.canonicalUrl).toMatch(/^https:\/\/(?:www\.)?(?:facebook|instagram)\.com\//);
    }
  });

  it("does not reference rehosted mp4 sources from public social-proof surfaces", () => {
    const sources = [
      "app/page.tsx",
      "app/work/page.tsx",
      "app/work/[slug]/page.tsx",
      "components/promotion/social-proof-section.tsx",
      "lib/social-proof.ts"
    ].map((path) => readFileSync(path, "utf8")).join("\n");

    expect(sources).not.toContain("r2.dev");
    expect(sources).not.toMatch(/work-videos\/wall-print-\d+\.mp4/);
  });

  it("retries failed Instagram embeds without reserving a large blank frame", () => {
    const source = readFileSync("components/promotion/social-proof-section.tsx", "utf8");

    expect(source).not.toContain("min-h-[32rem]");
    expect(source).not.toContain('onLoad={() => window.instgrm?.Embeds?.process()}');
    expect(source).toContain('data-embed-status={status}');
    expect(source).toContain('key={attempt}');
    expect(source).toContain('data-testid="instagram-proof-fallback"');
    expect(source).toContain("scheduleInstagramProcessing(250)");
  });
});
