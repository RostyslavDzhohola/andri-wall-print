import { describe, expect, it } from "vitest";

import { loadWorkJobs } from "@/lib/work-content";
import { buildWorkJobMetadata } from "@/lib/work-metadata";

describe("work job generateMetadata", () => {
  it("returns per-job title, description, and OG image from the first photo", () => {
    const jobs = loadWorkJobs();

    const seenTitles = new Set<string>();
    const seenImages = new Set<string>();

    for (const job of jobs) {
      const metadata = buildWorkJobMetadata(job);

      expect(metadata.title).toContain(job.title);
      expect(typeof metadata.description).toBe("string");
      expect((metadata.description as string).length).toBeGreaterThan(0);
      expect(metadata.description).toContain(job.neighborhood);

      const images = metadata.openGraph?.images;
      const ogImage = Array.isArray(images) ? images[0] : images;
      const ogUrl =
        typeof ogImage === "object" && ogImage !== null && "url" in ogImage
          ? String((ogImage as { url: unknown }).url)
          : String(ogImage);

      expect(ogUrl).toContain(job.photos[0].src);
      expect(ogUrl.startsWith("http")).toBe(true);

      const canonical = metadata.alternates?.canonical;
      expect(String(canonical)).toContain(`/work/${job.slug}`);

      seenTitles.add(metadata.title as string);
      seenImages.add(ogUrl);
    }

    // Per-job: titles and OG images are distinct across jobs.
    expect(seenTitles.size).toBe(jobs.length);
    expect(seenImages.size).toBe(jobs.length);
  });
});
