import { readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { loadWorkJobs, parseWorkJob, type WorkJob } from "@/lib/work-content";

describe("work content loader", () => {
  it("parses every job file in content/work (minimum 3 per launch cut line)", () => {
    const jobs = loadWorkJobs();
    const contentFiles = readdirSync(join(process.cwd(), "content", "work")).filter((f) => f.endsWith(".json"));

    expect(jobs.length).toBe(contentFiles.length);
    expect(jobs.length).toBeGreaterThanOrEqual(3);

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
        expect(photo.src).toMatch(/^\/work-videos\//);
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
