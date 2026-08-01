#!/usr/bin/env python3
"""Build labeled contact sheets for the staged Wall Print Pro client media."""

from __future__ import annotations

import csv
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
REVIEW = ROOT / "assets" / "wall-print-pro-media" / "review"
OUTPUT = REVIEW / "contact-sheets"
CATALOG = ROOT / "assets" / "wall-print-pro-media" / "catalog" / "ranked-media.csv"


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = (
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Arial.ttf",
    )
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            pass
    return ImageFont.load_default()


def fitted_image(path: Path, width: int, height: int) -> Image.Image:
    with Image.open(path) as source:
        image = ImageOps.exif_transpose(source).convert("RGB")
        image.thumbnail((width, height), Image.Resampling.LANCZOS)
        background = Image.new("RGB", (width, height), "#18181b")
        x = (width - image.width) // 2
        y = (height - image.height) // 2
        background.paste(image, (x, y))
        return background


def build_sheets(
    paths: list[Path],
    prefix: str,
    columns: int,
    rows: int,
    cell_width: int,
    image_height: int,
    label_height: int,
) -> None:
    per_sheet = columns * rows
    label_font = font(21)
    sheet_width = columns * cell_width
    sheet_height = rows * (image_height + label_height)

    for page_index in range(math.ceil(len(paths) / per_sheet)):
        page_paths = paths[page_index * per_sheet : (page_index + 1) * per_sheet]
        sheet = Image.new("RGB", (sheet_width, sheet_height), "#09090b")
        draw = ImageDraw.Draw(sheet)

        for item_index, path in enumerate(page_paths):
            row, column = divmod(item_index, columns)
            x = column * cell_width
            y = row * (image_height + label_height)
            sheet.paste(fitted_image(path, cell_width, image_height), (x, y))
            draw.rectangle(
                (x, y + image_height, x + cell_width, y + image_height + label_height),
                fill="#f4f4f5",
            )
            label = path.stem
            draw.text(
                (x + 9, y + image_height + 7),
                label,
                font=label_font,
                fill="#18181b",
            )

        output_path = OUTPUT / f"{prefix}-{page_index + 1:02d}.jpg"
        sheet.save(output_path, quality=90, optimize=True)


def build_top_selection_sheet() -> None:
    with CATALOG.open(newline="", encoding="utf-8") as handle:
        rows = list(csv.DictReader(handle))[:20]

    columns = 4
    rows_per_sheet = 5
    cell_width = 390
    image_height = 330
    label_height = 50
    sheet = Image.new(
        "RGB",
        (columns * cell_width, rows_per_sheet * (image_height + label_height)),
        "#09090b",
    )
    draw = ImageDraw.Draw(sheet)
    label_font = font(17)

    for item_index, row in enumerate(rows):
        preview_dir = "videos" if row["media_type"] == "video" else "images"
        preview_path = REVIEW / preview_dir / f"{Path(row['filename']).stem}.jpg"
        grid_row, column = divmod(item_index, columns)
        x = column * cell_width
        y = grid_row * (image_height + label_height)
        sheet.paste(fitted_image(preview_path, cell_width, image_height), (x, y))
        draw.rectangle(
            (x, y + image_height, x + cell_width, y + image_height + label_height),
            fill="#f4f4f5",
        )
        label = f"#{row['overall_rank']} {row['filename']} ({row['media_type']})"
        draw.text(
            (x + 8, y + image_height + 9),
            label,
            font=label_font,
            fill="#18181b",
        )

    sheet.save(OUTPUT / "top-20-ranked.jpg", quality=92, optimize=True)


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    image_paths = sorted((REVIEW / "images").glob("*.jpg"))
    video_paths = sorted((REVIEW / "videos").glob("*.jpg"))

    build_sheets(
        image_paths,
        prefix="images",
        columns=4,
        rows=4,
        cell_width=390,
        image_height=330,
        label_height=42,
    )
    build_sheets(
        video_paths,
        prefix="videos",
        columns=2,
        rows=2,
        cell_width=720,
        image_height=360,
        label_height=42,
    )
    build_top_selection_sheet()

    print(f"Created image sheets: {math.ceil(len(image_paths) / 16)}")
    print(f"Created video sheets: {math.ceil(len(video_paths) / 4)}")
    print("Created ranked top-20 sheet: 1")


if __name__ == "__main__":
    main()
