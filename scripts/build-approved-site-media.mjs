import { createHash } from "node:crypto";
import { mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const projectRoot = resolve(import.meta.dirname, "..");
const decisionsPath = join(
  projectRoot,
  "assets",
  "wall-print-pro-media-decisions-2026-07-23.json",
);
const originalsDir = join(
  projectRoot,
  "assets",
  "wall-print-pro-media",
  "originals",
);
const outputRoot = join(projectRoot, "public", "media", "wall-print-pro");

const homepage = [
  {
    source: "IMG_1646.HEIC",
    title: "Chicago train mural",
    label: "Finished wall print",
    alt: "Blue and orange Chicago train illustration printed directly on a light interior wall",
  },
  {
    source: "IMG_1598.HEIC",
    title: "Lakefront mural",
    label: "Finished wall print",
    alt: "Blue Chicago lakefront illustration printed directly on a light interior wall",
  },
  {
    source: "IMG_1595.HEIC",
    title: "Pathways to Success mural",
    label: "Finished wall print",
    alt: "Pathways to Success Chicago skyline illustration printed directly on an interior wall",
  },
  {
    source: "IMG_0024.MOV",
    title: "Pathways print in progress",
    label: "Workshop demonstration",
    alt: "Vertical wall printer producing the Pathways to Success design during a workshop demonstration",
  },
];

const ourWork = [
  {
    source: "IMG_1591.HEIC",
    title: "Lakefront illustration",
    label: "Finished wall print",
    alt: "Completed blue lakefront illustration printed directly on a light wall",
  },
  {
    source: "IMG_1594.HEIC",
    title: "Pathways to Success",
    label: "Finished wall print",
    alt: "Completed Pathways to Success mural beside the vertical wall printer",
  },
  {
    source: "IMG_0028.MOV",
    title: "Pathways production pass",
    label: "Workshop demonstration",
    alt: "Vertical printer applying the Pathways to Success mural in a controlled workshop demonstration",
  },
  {
    source: "IMG_1635.MOV",
    title: "Chicago mural detail pass",
    label: "Workshop demonstration",
    alt: "Close view of a vertical wall printer producing a Chicago-themed mural in the workshop",
  },
  {
    source: "IMG_1096.HEIC",
    title: "Tropical wall scene",
    label: "Workshop demonstration",
    alt: "Tropical beach mural on a white wall with the wall-printing machine beside it",
  },
  {
    source: "IMG_1084.MOV",
    title: "Tropical mural in progress",
    label: "Workshop demonstration",
    alt: "Vertical printer producing a tropical beach mural during a workshop demonstration",
  },
  {
    source: "IMG_69553977-6292-4757-8270-14DD2E01CA21.JPEG",
    title: "Chicago River wall print",
    label: "Finished wall print",
    alt: "Chicago River cityscape photograph printed directly on a white wall",
  },
  {
    source: "IMG_0773.MOV",
    title: "Panoramic city print",
    label: "Workshop demonstration",
    alt: "Vertical printer producing a panoramic city scene during a workshop demonstration",
  },
  {
    source: "IMG_1001.HEIC",
    title: "Forest wall scene",
    label: "Workshop demonstration",
    alt: "Misty evergreen forest mural on a white wall with the vertical printer beside it",
  },
  {
    source: "IMG_0996.MOV",
    title: "Forest mural in progress",
    label: "Workshop demonstration",
    alt: "Vertical printer producing a misty evergreen forest mural in the workshop",
  },
  {
    source: "IMG_0229.MOV",
    title: "Monochrome rose print",
    label: "Workshop demonstration",
    alt: "Vertical printer applying a monochrome rose image during a workshop demonstration",
  },
  {
    source: "IMG_0196.HEIC",
    title: "Arcade cabinet graphic",
    label: "Workshop demonstration",
    alt: "Colorful custom graphic printed on the side of an arcade cabinet demonstration piece",
  },
  {
    source: "IMG_0187.MOV",
    title: "Arcade graphic in progress",
    label: "Workshop demonstration",
    alt: "Wall-printing machine applying a colorful arcade graphic during a workshop demonstration",
  },
];

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} failed (${result.status ?? "unknown"}): ${result.stderr || result.stdout}`,
    );
  }
}

function normalizedStem(source) {
  return basename(source, extname(source))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function sha256(path) {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

async function fileDescriptor(path) {
  const info = await stat(path);
  const relative = `/${path.slice(join(projectRoot, "public").length + 1).replaceAll("\\", "/")}`;

  return {
    path: relative,
    bytes: info.size,
    sha256: await sha256(path),
  };
}

function assertExactDecisionSet(decisions, section, expected) {
  const approved = decisions[section]?.keep;
  const expectedSources = expected.map((item) => item.source);

  if (
    !Array.isArray(approved) ||
    approved.length !== expectedSources.length ||
    approved.some((value, index) => value !== expectedSources[index])
  ) {
    throw new Error(
      `${section} media does not exactly match ${basename(decisionsPath)}.`,
    );
  }
}

async function buildImage(item, sectionDir) {
  const sourcePath = join(originalsDir, item.source);
  const stem = normalizedStem(item.source);
  const jpegPath = join(sectionDir, `${stem}-1600.jpg`);
  const avif960Path = join(sectionDir, `${stem}-960.avif`);
  const avif1600Path = join(sectionDir, `${stem}-1600.avif`);

  run("sips", [
    "-s",
    "format",
    "jpeg",
    "-s",
    "formatOptions",
    "86",
    "--resampleHeightWidthMax",
    "1600",
    sourcePath,
    "--out",
    jpegPath,
  ]);
  run("sips", [
    "-s",
    "format",
    "avif",
    "-s",
    "formatOptions",
    "72",
    "--resampleHeightWidthMax",
    "960",
    jpegPath,
    "--out",
    avif960Path,
  ]);
  run("sips", [
    "-s",
    "format",
    "avif",
    "-s",
    "formatOptions",
    "76",
    "--resampleHeightWidthMax",
    "1600",
    jpegPath,
    "--out",
    avif1600Path,
  ]);

  return {
    original: item.source,
    kind: "image",
    title: item.title,
    label: item.label,
    alt: item.alt,
    sources: {
      avif960: await fileDescriptor(avif960Path),
      avif1600: await fileDescriptor(avif1600Path),
      jpeg1600: await fileDescriptor(jpegPath),
    },
  };
}

async function buildVideo(item, sectionDir) {
  const sourcePath = join(originalsDir, item.source);
  const stem = normalizedStem(item.source);
  const videoPath = join(sectionDir, `${stem}-480.mp4`);
  const posterPath = join(sectionDir, `${stem}-poster.jpg`);

  run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    sourcePath,
    "-map",
    "0:V:0",
    "-map",
    "0:a:0?",
    "-vf",
    "scale=480:-1:force_original_aspect_ratio=decrease,scale=trunc(iw/2)*2:trunc(ih/2)*2",
    "-c:v",
    "libx264",
    "-preset",
    "medium",
    "-crf",
    "30",
    "-pix_fmt",
    "yuv420p",
    "-profile:v",
    "high",
    "-level",
    "4.0",
    "-c:a",
    "aac",
    "-b:a",
    "64k",
    "-movflags",
    "+faststart",
    "-map_metadata",
    "-1",
    "-y",
    videoPath,
  ]);
  run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-ss",
    "1",
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-q:v",
    "3",
    "-y",
    posterPath,
  ]);

  return {
    original: item.source,
    kind: "video",
    title: item.title,
    label: item.label,
    alt: item.alt,
    sources: {
      mp4: await fileDescriptor(videoPath),
      poster: await fileDescriptor(posterPath),
    },
  };
}

async function buildSection(section, items) {
  const sectionDir = join(outputRoot, section);
  await mkdir(sectionDir, { recursive: true });

  const result = [];

  for (const item of items) {
    const extension = extname(item.source).toLowerCase();
    result.push(
      extension === ".mov"
        ? await buildVideo(item, sectionDir)
        : await buildImage(item, sectionDir),
    );
  }

  return result;
}

const decisions = JSON.parse(await readFile(decisionsPath, "utf8"));
assertExactDecisionSet(decisions, "homepage", homepage);
assertExactDecisionSet(decisions, "ourWork", ourWork);

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

const manifest = {
  format: "wall-print-pro-sites-media",
  version: 1,
  approvalSource: basename(decisionsPath),
  approvalExportedAt: decisions.exportedAt,
  generatedAt: new Date().toISOString(),
  policy:
    "Only approved client photos and videos are represented. Raw originals stay outside the published site.",
  homepage: await buildSection("homepage", homepage),
  ourWork: await buildSection("our-work", ourWork),
};

await writeFile(
  join(outputRoot, "manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
);

console.log(
  `Built ${manifest.homepage.length + manifest.ourWork.length} approved media entries in ${outputRoot}`,
);
