import { describe, expect, it } from "vitest";

import { loadWorkJobs, parseWorkJob, type WorkJob } from "@/lib/work-content";

describe("work content loader", () => {
  it("parses exactly 5 valid jobs from content/work", () => {
    const jobs = loadWorkJobs();

    expect(jobs).toHaveLength(5);

    for (const job of jobs) {
      expect(job.slug).toMatch(/^[a-z0-9-]+$/);
      expect(job.title.length).toBeGreaterThan(0);
      expect(job.neighborhood.length).toBeGreaterThan(0);
      expect(job.area.length).toBeGreaterThan(0);
      expect(job.size.length).toBeGreaterThan(0);
      expect(job.surface.length).toBeGreaterThan(0);
      expect(job.story.length).toBeGreaterThan(0);
      expect(job.photos.length).toBeGreaterThan(0);
      for (const photo of job.photos) {
        expect(photo.src.startsWith("/")).toBe(true);
        expect(photo.alt.length).toBeGreaterThan(0);
      }
      expect(typeof job.needsClientConfirmation).toBe("boolean");
    }
  });

  it("has unique slugs across all jobs", () => {
    const slugs = loadWorkJobs().map((job) => job.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("rejects a job missing required fields", () => {
    expect(() => parseWorkJob({ slug: "x" }, "bad.json")).toThrow();
  });

  it("rejects a photo without descriptive alt text", () => {
    const partial: Partial<WorkJob> = {
      slug: "x",
      title: "t",
      neighborhood: "n",
      area: "a",
      size: "s",
      surface: "su",
      story: "st",
      needsClientConfirmation: true
    };
    expect(() =>
      parseWorkJob({ ...partial, photos: [{ src: "/x.png" }] }, "bad.json")
    ).toThrow(/alt/);
  });
});
