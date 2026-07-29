#!/usr/bin/env python3
"""Create the ranked Wall Print Pro client-media catalog and staging folders."""

from __future__ import annotations

import csv
import json
import os
from collections import Counter
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MEDIA_ROOT = ROOT / "assets" / "wall-print-pro-media"
ORIGINALS = MEDIA_ROOT / "originals"
CATALOG = MEDIA_ROOT / "catalog"
ORGANIZED = MEDIA_ROOT / "organized"
METADATA_CSV = CATALOG / "inventory-metadata.csv"


RANKING = [
    "IMG_1646.HEIC",
    "IMG_1598.HEIC",
    "IMG_1591.HEIC",
    "IMG_1597.HEIC",
    "IMG_1642.MOV",
    "IMG_1635.MOV",
    "IMG_0028.MOV",
    "IMG_0024.MOV",
    "IMG_1595.HEIC",
    "IMG_1594.HEIC",
    "IMG_1596.HEIC",
    "IMG_1644.HEIC",
    "IMG_1643.HEIC",
    "IMG_1631.MOV",
    "IMG_1097.HEIC",
    "IMG_1084.MOV",
    "IMG_1096.HEIC",
    "IMG_69553977-6292-4757-8270-14DD2E01CA21.JPEG",
    "IMG_0773.MOV",
    "IMG_0253.HEIC",
    "IMG_0229.MOV",
    "IMG_0187.MOV",
    "147415BF-D18F-4D9F-A265-B3ED4B3447AB.jpg",
    "IMG_0196.HEIC",
    "IMG_0262.MOV",
    "IMG_0331.MOV",
    "IMG_0996.MOV",
    "IMG_1083.MOV",
    "IMG_1001.HEIC",
    "IMG_0999.HEIC",
    "IMG_1094.HEIC",
    "IMG_1095.HEIC",
    "IMG_1086.HEIC",
    "IMG_1087.HEIC",
    "IMG_1088.HEIC",
    "IMG_1085.HEIC",
    "IMG_1090.HEIC",
    "IMG_0763.MOV",
    "IMG_0769.HEIC",
    "IMG_0770.HEIC",
    "IMG_0771.HEIC",
    "IMG_0768.HEIC",
    "IMG_0258.HEIC",
    "IMG_0259.HEIC",
    "IMG_0260.HEIC",
    "IMG_0247.HEIC",
    "IMG_0248.HEIC",
    "IMG_0237.HEIC",
    "IMG_0213.HEIC",
    "IMG_0227.JPG",
    "IMG_1002.HEIC",
    "IMG_0998.HEIC",
    "IMG_0997.HEIC",
    "IMG_0761.MOV",
    "IMG_0772.HEIC",
    "IMG_0767.HEIC",
    "IMG_0766.HEIC",
    "IMG_0765.HEIC",
    "IMG_1E734EB7-76CE-4EBD-96E5-D4BE2EC29780.JPEG",
    "IMG_0254.HEIC",
    "IMG_0255.HEIC",
    "IMG_0256.HEIC",
    "IMG_0251.HEIC",
    "IMG_0252.HEIC",
    "IMG_0249.HEIC",
    "IMG_0250.HEIC",
    "IMG_0246.HEIC",
    "IMG_0245.HEIC",
    "IMG_0228.JPG",
    "IMG_0224.HEIC",
    "IMG_0226.JPG",
    "IMG_0236.HEIC",
    "IMG_0234.HEIC",
    "IMG_0233.HEIC",
    "IMG_0212.HEIC",
    "IMG_0211.HEIC",
    "IMG_0205.MOV",
    "IMG_0202.JPG",
    "IMG_0201.HEIC",
    "IMG_0186.MOV",
    "IMG_0184.MOV",
    "IMG_0189.HEIC",
    "IMG_0188.HEIC",
    "IMG_1093.HEIC",
    "IMG_1092.HEIC",
    "IMG_1091.HEIC",
    "IMG_1089.HEIC",
    "IMG_1592.HEIC",
    "IMG_1634.HEIC",
    "IMG_1633.HEIC",
    "IMG_1632.HEIC",
    "IMG_1593.jpg",
    "IMG_0764.mov",
    "Copy of IMG_0028.MOV",
    "IMG_0996(1).MOV",
    "IMG_0997(1).HEIC",
    "IMG_0764(1).mov",
    "D076C1AB-2474-40BB-8EF1-A9BFA4FF82F4.jpg",
    "IMG_4C0D1196-1080-4922-B13A-55F40C0DADB4.jpeg",
    "IMG_B45497E1-A8B3-4755-88C7-B465ABA0F02C.jpeg",
]


DUPLICATE_OF = {
    "Copy of IMG_0028.MOV": "IMG_0028.MOV",
    "IMG_0996(1).MOV": "IMG_0996.MOV",
    "IMG_0997(1).HEIC": "IMG_0997.HEIC",
    "IMG_0764(1).mov": "IMG_0764.mov",
}


TOP_NOTES = {
    "IMG_1646.HEIC": "Clean, colorful finished train mural; strongest single proof image with no printer blocking the artwork.",
    "IMG_1598.HEIC": "Clean, straight-on finished lakefront mural; excellent detail and minimal distractions.",
    "IMG_1591.HEIC": "Tight finished lakefront detail with clean color and strong vertical composition.",
    "IMG_1597.HEIC": "Wide finished lakefront mural showing real wall scale; minor outlet and unfinished floor remain visible.",
    "IMG_1642.MOV": "Short 4K vertical process video of the real-office train mural; strong social/reel material.",
    "IMG_1635.MOV": "4K vertical train-mural printing sequence; longer alternate for process edits.",
    "IMG_0028.MOV": "Real-office Pathways mural being printed; compelling process proof, though only 720p.",
    "IMG_0024.MOV": "Workers set up and operate the printer in the office; strongest human/process authenticity.",
    "IMG_1595.HEIC": "Pathways mural with readable message and printer context; blue alignment tape is visible.",
    "IMG_1594.HEIC": "Wide Pathways mural plus printer; good technology/process proof, with tape and work area visible.",
    "IMG_1596.HEIC": "Wide Pathways mural and full machine; useful service-explainer image.",
    "IMG_1644.HEIC": "Train mural in progress with good color and useful machine context.",
    "IMG_1643.HEIC": "Nearly complete train mural with printer visible; strong supporting process still.",
    "IMG_1631.MOV": "4K vertical train-mural setup/start; useful lead-in for a before-to-after sequence.",
    "IMG_1097.HEIC": "Vibrant finished beach test print; workshop clutter limits homepage use.",
    "IMG_1084.MOV": "Short 4K vertical beach-print process video with vivid color.",
    "IMG_1096.HEIC": "Straight, detailed beach result with printer visible; good secondary gallery image.",
    "IMG_69553977-6292-4757-8270-14DD2E01CA21.JPEG": "Detailed Chicago River result; tape, pins, test marks, and edge crop reduce polish.",
    "IMG_0773.MOV": "4K vertical Chicago River printing footage; useful variety for a process reel.",
    "IMG_0253.HEIC": "Clean close-up of the Volvo test result; good print-detail proof but lacks room context.",
    "IMG_0229.MOV": "4K vertical black-rose printing footage with strong contrast.",
    "IMG_0187.MOV": "4K vertical neon car-headlight print; visually dramatic workshop process footage.",
    "147415BF-D18F-4D9F-A265-B3ED4B3447AB.jpg": "Finished black-rose sample board held in the workshop; useful detail proof, not a wall installation.",
    "IMG_0196.HEIC": "Finished neon car-headlight sample board; vivid but clearly workshop/test material.",
    "IMG_0262.MOV": "4K vertical sweep across several test prints; useful variety montage with workshop clutter.",
    "IMG_0331.MOV": "Short 4K horizontal mixed-sample walkthrough; useful as secondary B-roll.",
    "IMG_0996.MOV": "Long vertical forest-print process clip; good edit source but only 1080p and visually repetitive.",
    "IMG_1083.MOV": "Short 4K vertical beach result/process clip; alternate to IMG_1084.",
    "IMG_1592.HEIC": "Empty room and printer before the office murals; useful only as a before/setup frame.",
    "IMG_1593.jpg": "Low-resolution Wall Print Pro logo graphic, not client work; keep out of the work gallery.",
    "IMG_0764.mov": "Only 1.6 seconds and nearly static; too short to be useful without a specialized edit.",
    "D076C1AB-2474-40BB-8EF1-A9BFA4FF82F4.jpg": "Laptop/reference screen rather than a finished print; exclude from public gallery.",
    "IMG_4C0D1196-1080-4922-B13A-55F40C0DADB4.jpeg": "Laptop/reference screen rather than client work; exclude from public gallery.",
    "IMG_B45497E1-A8B3-4755-88C7-B465ABA0F02C.jpeg": "Editing/reference screen rather than a finished result; exclude from public gallery.",
}


def project_for(filename: str) -> str:
    if filename in {"IMG_1591.HEIC", "IMG_1597.HEIC", "IMG_1598.HEIC", "IMG_0024.MOV"}:
        return "chicago-office-lakefront"
    if filename in {"IMG_1594.HEIC", "IMG_1595.HEIC", "IMG_1596.HEIC", "IMG_0028.MOV", "Copy of IMG_0028.MOV"}:
        return "chicago-office-pathways"
    if filename in {"IMG_1631.MOV", "IMG_1632.HEIC", "IMG_1633.HEIC", "IMG_1634.HEIC", "IMG_1635.MOV", "IMG_1642.MOV", "IMG_1643.HEIC", "IMG_1644.HEIC", "IMG_1646.HEIC"}:
        return "chicago-office-train"
    if filename == "IMG_1592.HEIC":
        return "chicago-office-setup"
    if filename == "IMG_1593.jpg":
        return "brand-graphic"
    if filename.startswith("IMG_108") or filename.startswith("IMG_109"):
        return "workshop-beach"
    if filename.startswith("IMG_099") or filename.startswith("IMG_100"):
        return "workshop-forest"
    if filename.startswith("IMG_076") or filename.startswith("IMG_077") or filename.startswith("IMG_1E734") or filename.startswith("IMG_695"):
        return "workshop-chicago-river"
    if filename in {"IMG_0262.MOV", "IMG_0331.MOV"}:
        return "workshop-mixed-showcase"
    if filename.startswith("IMG_024") or filename.startswith("IMG_025") or filename.startswith("IMG_026"):
        return "workshop-volvo"
    if filename.startswith("IMG_018") or filename.startswith("IMG_019"):
        return "workshop-neon-headlight"
    return "workshop-black-rose"


def stage_for(filename: str, project: str) -> str:
    if filename in DUPLICATE_OF:
        return "duplicate"
    if filename in {"D076C1AB-2474-40BB-8EF1-A9BFA4FF82F4.jpg", "IMG_4C0D1196-1080-4922-B13A-55F40C0DADB4.jpeg", "IMG_B45497E1-A8B3-4755-88C7-B465ABA0F02C.jpeg"}:
        return "reference-screen"
    if filename == "IMG_1593.jpg":
        return "brand-graphic"
    if filename == "IMG_1592.HEIC":
        return "setup-before"
    if project == "workshop-mixed-showcase":
        return "mixed-showcase"
    if Path(filename).suffix.lower() == ".mov":
        return "process-video"
    if filename in {"IMG_1646.HEIC", "IMG_1598.HEIC", "IMG_1591.HEIC", "IMG_1597.HEIC"}:
        return "clean-finished-result"
    if filename in {"147415BF-D18F-4D9F-A265-B3ED4B3447AB.jpg", "IMG_0196.HEIC", "IMG_0253.HEIC"}:
        return "finished-sample-board"
    return "result-with-equipment"


def tier_for(rank: int) -> tuple[str, str]:
    if rank <= 20:
        return "A", "01-select"
    if rank <= 50:
        return "B", "02-backup"
    if rank <= 90:
        return "C", "03-archive"
    return "D", "04-exclude"


def recommendation_for(rank: int, media_type: str) -> str:
    is_video = media_type == "video"
    if rank <= 4:
        return "homepage/gallery"
    if rank <= 8:
        return "homepage process reel/social cut" if is_video else "homepage/gallery"
    if rank <= 20:
        return "process reel/social cut" if is_video else "gallery/process proof"
    if rank <= 35:
        return "supporting process B-roll" if is_video else "supporting gallery"
    if rank <= 50:
        return "secondary B-roll" if is_video else "secondary gallery"
    if rank <= 75:
        return "process archive/optional social" if is_video else "archive/optional gallery"
    if rank <= 90:
        return "internal reference/low-priority B-roll" if is_video else "internal reference/low-priority still"
    return "exclude from public site"


def default_note(project: str, stage: str) -> str:
    if stage == "duplicate":
        return "Duplicate export; keep for provenance but do not upload twice."
    if stage == "process-video":
        return "Process footage from a workshop/test wall; useful as edit source, not as standalone hero content."
    if stage == "result-with-equipment":
        return "Result/process still with printer or workshop context visible; useful as supporting proof."
    if stage == "clean-finished-result":
        return "Clean finished installation image from the real Chicago office job."
    if stage == "finished-sample-board":
        return "Finished sample-board result photographed in the workshop."
    return f"Supporting asset from {project}."


def load_metadata() -> dict[str, dict[str, str]]:
    with METADATA_CSV.open(newline="", encoding="utf-8-sig") as handle:
        rows = list(csv.DictReader(handle))
    return {row["FileName"]: row for row in rows}


def build_rows(metadata: dict[str, dict[str, str]]) -> list[dict[str, object]]:
    expected = {path.name for path in ORIGINALS.iterdir() if path.is_file()}
    ranked = set(RANKING)
    if len(RANKING) != 100 or len(ranked) != 100 or ranked != expected:
        raise RuntimeError(
            "Ranking does not match the staged originals. "
            f"ranking_count={len(RANKING)}, unique_ranking_count={len(ranked)}, "
            f"missing={sorted(expected - ranked)}, extra={sorted(ranked - expected)}"
        )

    rows: list[dict[str, object]] = []
    for rank, filename in enumerate(RANKING, start=1):
        meta = metadata[filename]
        suffix = Path(filename).suffix.lower()
        media_type = "video" if suffix == ".mov" else "image"
        project = project_for(filename)
        stage = stage_for(filename, project)
        tier, tier_folder = tier_for(rank)
        duration = meta.get("Duration#", "")
        duration_seconds = round(float(duration), 2) if duration else ""
        size_bytes = int(meta["FileSize#"])
        rows.append(
            {
                "overall_rank": rank,
                "tier": tier,
                "filename": filename,
                "media_type": media_type,
                "project_category": project,
                "content_stage": stage,
                "recommended_use": recommendation_for(rank, media_type),
                "width": int(meta["ImageWidth"]),
                "height": int(meta["ImageHeight"]),
                "duration_seconds": duration_seconds,
                "size_bytes": size_bytes,
                "duplicate_of": DUPLICATE_OF.get(filename, ""),
                "review_note": TOP_NOTES.get(filename, default_note(project, stage)),
                "staging_folder": f"organized/{tier_folder}/{project}",
            }
        )
    return rows


def write_catalog(rows: list[dict[str, object]]) -> None:
    CATALOG.mkdir(parents=True, exist_ok=True)
    fieldnames = list(rows[0].keys())
    with (CATALOG / "ranked-media.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    with (CATALOG / "ranked-media.json").open("w", encoding="utf-8") as handle:
        json.dump(rows, handle, indent=2, ensure_ascii=False)
        handle.write("\n")


def make_staging_links(rows: list[dict[str, object]]) -> None:
    for row in rows:
        source = ORIGINALS / str(row["filename"])
        destination_dir = MEDIA_ROOT / str(row["staging_folder"])
        destination_dir.mkdir(parents=True, exist_ok=True)
        destination = destination_dir / f"{int(row['overall_rank']):03d}__{row['filename']}"
        if destination.exists():
            continue
        os.link(source, destination)


def write_readme(rows: list[dict[str, object]]) -> None:
    tier_counts = Counter(str(row["tier"]) for row in rows)
    project_counts = Counter(str(row["project_category"]) for row in rows)
    total_bytes = sum(int(row["size_bytes"]) for row in rows)
    total_video_seconds = sum(float(row["duration_seconds"] or 0) for row in rows)
    top = rows[:20]
    top_lines = "\n".join(
        f"| {row['overall_rank']} | {row['filename']} | {row['media_type']} | {row['project_category']} | {row['recommended_use']} |"
        for row in top
    )
    project_lines = "\n".join(
        f"- `{project}`: {count} files" for project, count in sorted(project_counts.items())
    )
    readme = f"""# Wall Print Pro client media review

This package contains all 100 downloaded originals, non-destructive review derivatives, a complete ranked catalog, and upload-ready staging folders. The four staging folders use hard links, so they behave like normal files without consuming another 1.03 GiB.

## Inventory

- 100 source files: 78 images and 22 videos
- {total_bytes / (1024 ** 3):.2f} GiB total source size
- {total_video_seconds / 60:.1f} minutes of video
- 96 unique assets after four duplicate exports are excluded
- Tier A/select: {tier_counts['A']} files
- Tier B/backup: {tier_counts['B']} files
- Tier C/archive: {tier_counts['C']} files
- Tier D/exclude: {tier_counts['D']} files

## Ranking method

The order prioritizes conversion value and authenticity: real installed work, a clear finished result, composition/color, useful resolution/duration, and uniqueness. Workshop clutter, printer obstruction, tape/pins, reference screens, very short clips, and duplicates lower the rank. Images and videos share one overall ranking, while `recommended_use` identifies the right role for each.

## Recommended first selection

| Rank | File | Type | Project | Best use |
| ---: | --- | --- | --- | --- |
{top_lines}

The first fourteen assets are from the real Chicago office installation and should anchor the site. The workshop/test-wall projects are useful supporting evidence and editing material, but should not be presented as finished client interiors.

## Project categories

{project_lines}

## Folder guide

- `originals/`: untouched extracted source files
- `organized/01-select/`: strongest 20 files to evaluate first
- `organized/02-backup/`: 30 useful alternatives and secondary content
- `organized/03-archive/`: 40 lower-priority process/reference assets
- `organized/04-exclude/`: 10 duplicates, reference screens, logo art, or unusably short material
- `review/images/`: lightweight JPEG review copies of all still images
- `review/videos/`: six-frame storyboard for every video
- `review/contact-sheets/`: labeled overview sheets
- `catalog/ranked-media.csv`: complete sortable ranking and notes
- `catalog/ranked-media.json`: the same data for software ingestion
- `catalog/raw-metadata.json`: full ExifTool metadata
- `catalog/sha256.txt`: source checksums
- `CDN-RECOMMENDATION.md`: production delivery recommendation based on the actual file formats, sizes, codecs, and free-tier limits

## Missing items worth requesting from the client

- Original artwork/raw print files for each real installation
- Clean, staged room photos after the printer, rails, tape, tools, and construction debris were removed
- One horizontal and one vertical final shot of each mural, including wider room context
- Customer/business name and written permission to publish each job
- Any before photos and a short customer testimonial
"""
    (MEDIA_ROOT / "README.md").write_text(readme, encoding="utf-8")


def main() -> None:
    metadata = load_metadata()
    rows = build_rows(metadata)
    write_catalog(rows)
    make_staging_links(rows)
    write_readme(rows)
    print(f"Cataloged {len(rows)} files across {len(set(row['project_category'] for row in rows))} project categories.")


if __name__ == "__main__":
    main()
