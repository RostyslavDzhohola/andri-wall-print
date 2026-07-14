import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type WorkPhoto = {
  src: string;
  alt: string;
};

export type WorkJob = {
  slug: string;
  title: string;
  neighborhood: string;
  area: string;
  size: string;
  surface: string;
  story: string;
  photos: WorkPhoto[];
  needsClientConfirmation: boolean;
  clientConfirmationNote?: string;
};

const WORK_CONTENT_DIR = join(process.cwd(), "content", "work");

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parsePhoto(value: unknown, file: string): WorkPhoto {
  if (typeof value !== "object" || value === null) {
    throw new Error(`work content ${file}: photo must be an object`);
  }

  const photo = value as Record<string, unknown>;

  if (!isNonEmptyString(photo.src)) {
    throw new Error(`work content ${file}: photo.src must be a non-empty string`);
  }

  if (!isNonEmptyString(photo.alt)) {
    throw new Error(`work content ${file}: photo.alt (descriptive alt text) is required`);
  }

  return { src: photo.src, alt: photo.alt };
}

export function parseWorkJob(raw: unknown, file: string): WorkJob {
  if (typeof raw !== "object" || raw === null) {
    throw new Error(`work content ${file}: expected a JSON object`);
  }

  const data = raw as Record<string, unknown>;

  for (const key of ["slug", "title", "neighborhood", "area", "size", "surface", "story"] as const) {
    if (!isNonEmptyString(data[key])) {
      throw new Error(`work content ${file}: "${key}" must be a non-empty string`);
    }
  }

  if (!Array.isArray(data.photos) || data.photos.length === 0) {
    throw new Error(`work content ${file}: at least one photo is required`);
  }

  if (typeof data.needsClientConfirmation !== "boolean") {
    throw new Error(`work content ${file}: "needsClientConfirmation" must be a boolean`);
  }

  return {
    slug: data.slug as string,
    title: data.title as string,
    neighborhood: data.neighborhood as string,
    area: data.area as string,
    size: data.size as string,
    surface: data.surface as string,
    story: data.story as string,
    photos: data.photos.map((photo) => parsePhoto(photo, file)),
    needsClientConfirmation: data.needsClientConfirmation,
    clientConfirmationNote: isNonEmptyString(data.clientConfirmationNote)
      ? data.clientConfirmationNote
      : undefined
  };
}

export function loadWorkJobs(): WorkJob[] {
  const files = readdirSync(WORK_CONTENT_DIR)
    .filter((name) => name.endsWith(".json"))
    .sort();

  const jobs = files.map((file) => {
    const raw = JSON.parse(readFileSync(join(WORK_CONTENT_DIR, file), "utf8")) as unknown;
    const job = parseWorkJob(raw, file);

    if (job.slug !== file.replace(/\.json$/, "")) {
      throw new Error(`work content ${file}: slug "${job.slug}" must match the file name`);
    }

    return job;
  });

  const slugs = new Set<string>();
  for (const job of jobs) {
    if (slugs.has(job.slug)) {
      throw new Error(`work content: duplicate slug "${job.slug}"`);
    }
    slugs.add(job.slug);
  }

  return jobs;
}

export function getWorkJob(slug: string): WorkJob | undefined {
  return loadWorkJobs().find((job) => job.slug === slug);
}

export function getWorkSlugs(): string[] {
  return loadWorkJobs().map((job) => job.slug);
}
