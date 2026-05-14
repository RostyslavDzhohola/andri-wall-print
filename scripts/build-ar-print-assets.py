#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import struct
import zipfile
from pathlib import Path

from PIL import Image


def align(value: int, boundary: int = 4) -> int:
    return (value + boundary - 1) // boundary * boundary


def padded(data: bytes, boundary: int = 4, pad: bytes = b" ") -> bytes:
    return data + pad * (align(len(data), boundary) - len(data))


def normalize_artwork(source: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as image:
        image = image.convert("RGBA")
        source_width, source_height = image.size
        target_ratio = 1 / 2
        current_ratio = source_width / source_height

        if current_ratio > target_ratio:
            crop_width = int(source_height * target_ratio)
            left = (source_width - crop_width) // 2
            box = (left, 0, left + crop_width, source_height)
        else:
            crop_height = int(source_width / target_ratio)
            top = (source_height - crop_height) // 2
            box = (0, top, source_width, top + crop_height)

        image.crop(box).resize((1024, 2048), Image.Resampling.LANCZOS).save(output, "PNG")


def make_glb(texture_path: Path, output: Path, width_meters: float, height_meters: float) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    texture = texture_path.read_bytes()

    half_width = width_meters / 2
    half_height = height_meters / 2
    positions = [
        -half_width,
        -half_height,
        0.0,
        half_width,
        -half_height,
        0.0,
        half_width,
        half_height,
        0.0,
        -half_width,
        half_height,
        0.0,
    ]
    uvs = [0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0]
    indices = [0, 1, 2, 0, 2, 3]

    position_bytes = struct.pack("<12f", *positions)
    uv_bytes = struct.pack("<8f", *uvs)
    index_bytes = struct.pack("<6H", *indices)

    chunks: list[tuple[str, bytes]] = []
    offset = 0
    for name, data in [
        ("positions", position_bytes),
        ("uvs", uv_bytes),
        ("indices", index_bytes),
        ("texture", texture),
    ]:
        offset = align(offset)
        chunks.append((name, data))
        offset += len(data)

    bin_blob = bytearray()
    offsets: dict[str, int] = {}
    for name, data in chunks:
        bin_blob.extend(b"\x00" * (align(len(bin_blob)) - len(bin_blob)))
        offsets[name] = len(bin_blob)
        bin_blob.extend(data)
    bin_chunk = padded(bytes(bin_blob), 4, b"\x00")

    gltf = {
        "asset": {"version": "2.0", "generator": "preview-picture build-ar-print-assets.py"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "Dragon Wall Print"}],
        "meshes": [
            {
                "primitives": [
                    {
                        "attributes": {"POSITION": 0, "TEXCOORD_0": 1},
                        "indices": 2,
                        "material": 0,
                        "mode": 4,
                    }
                ]
            }
        ],
        "materials": [
            {
                "name": "Printed Artwork",
                "doubleSided": True,
                "pbrMetallicRoughness": {
                    "baseColorTexture": {"index": 0},
                    "metallicFactor": 0,
                    "roughnessFactor": 0.74,
                },
            }
        ],
        "textures": [{"source": 0}],
        "images": [{"mimeType": "image/png", "bufferView": 3, "name": texture_path.name}],
        "samplers": [{"magFilter": 9729, "minFilter": 9987, "wrapS": 33071, "wrapT": 33071}],
        "buffers": [{"byteLength": len(bin_chunk)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": offsets["positions"], "byteLength": len(position_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": offsets["uvs"], "byteLength": len(uv_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": offsets["indices"], "byteLength": len(index_bytes), "target": 34963},
            {"buffer": 0, "byteOffset": offsets["texture"], "byteLength": len(texture)},
        ],
        "accessors": [
            {
                "bufferView": 0,
                "componentType": 5126,
                "count": 4,
                "type": "VEC3",
                "min": [-half_width, -half_height, 0],
                "max": [half_width, half_height, 0],
            },
            {"bufferView": 1, "componentType": 5126, "count": 4, "type": "VEC2"},
            {"bufferView": 2, "componentType": 5123, "count": 6, "type": "SCALAR"},
        ],
    }

    json_chunk = padded(json.dumps(gltf, separators=(",", ":")).encode("utf-8"), 4, b" ")
    total_length = 12 + 8 + len(json_chunk) + 8 + len(bin_chunk)
    glb = bytearray()
    glb.extend(struct.pack("<III", 0x46546C67, 2, total_length))
    glb.extend(struct.pack("<I4s", len(json_chunk), b"JSON"))
    glb.extend(json_chunk)
    glb.extend(struct.pack("<I4s", len(bin_chunk), b"BIN\x00"))
    glb.extend(bin_chunk)
    output.write_bytes(glb)


def usda_text(texture_name: str, title: str, width_meters: float, height_meters: float) -> str:
    half_width = width_meters / 2
    half_height = height_meters / 2
    return f'''#usda 1.0
(
    defaultPrim = "Print"
    metersPerUnit = 1
    upAxis = "Y"
)

def Xform "Print"
{{
    def Mesh "ArtworkPlane"
    {{
        uniform token subdivisionScheme = "none"
        point3f[] points = [({-half_width}, {-half_height}, 0), ({half_width}, {-half_height}, 0), ({half_width}, {half_height}, 0), ({-half_width}, {half_height}, 0)]
        int[] faceVertexCounts = [4]
        int[] faceVertexIndices = [0, 1, 2, 3]
        normal3f[] normals = [(0, 0, 1), (0, 0, 1), (0, 0, 1), (0, 0, 1)] (
            interpolation = "vertex"
        )
        texCoord2f[] primvars:st = [(0, 0), (1, 0), (1, 1), (0, 1)] (
            interpolation = "vertex"
        )
        rel material:binding = </Print/Materials/PrintedArtwork>
    }}

    def Scope "Materials"
    {{
        def Material "PrintedArtwork"
        {{
            token outputs:surface.connect = </Print/Materials/PrintedArtwork/PreviewSurface.outputs:surface>

            def Shader "PreviewSurface"
            {{
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor.connect = </Print/Materials/PrintedArtwork/Texture.outputs:rgb>
                float inputs:metallic = 0
                float inputs:roughness = 0.74
                token outputs:surface
            }}

            def Shader "Texture"
            {{
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @{texture_name}@
                token inputs:sourceColorSpace = "sRGB"
                float2 inputs:st.connect = </Print/Materials/PrintedArtwork/StReader.outputs:result>
                color3f outputs:rgb
            }}

            def Shader "StReader"
            {{
                uniform token info:id = "UsdPrimvarReader_float2"
                token inputs:varname = "st"
                float2 outputs:result
            }}
        }}
    }}
}}
'''


def write_usdz(output: Path, files: list[tuple[str, bytes]]) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as raw:
        with zipfile.ZipFile(raw, "w", compression=zipfile.ZIP_STORED) as archive:
            for name, data in files:
                info = zipfile.ZipInfo(name)
                info.compress_type = zipfile.ZIP_STORED
                info.external_attr = 0o644 << 16
                header_size = 30 + len(name.encode("utf-8"))
                offset = raw.tell()
                padding = (64 - ((offset + header_size) % 64)) % 64
                info.extra = b"\x00" * padding
                archive.writestr(info, data)


def make_usdz(texture_path: Path, output: Path, title: str, width_meters: float, height_meters: float) -> None:
    usda = usda_text(texture_path.name, title, width_meters, height_meters).encode("utf-8")
    write_usdz(output, [("model.usda", usda), (texture_path.name, texture_path.read_bytes())])


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--id", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument("--width-meters", required=True, type=float)
    parser.add_argument("--height-meters", required=True, type=float)
    args = parser.parse_args()

    texture_path = Path("public/artworks") / f"{args.id}.png"
    glb_path = Path("public/ar") / f"{args.id}.glb"
    usdz_path = Path("public/ar") / f"{args.id}.usdz"

    normalize_artwork(args.source, texture_path)
    make_glb(texture_path, glb_path, args.width_meters, args.height_meters)
    make_usdz(texture_path, usdz_path, args.title, args.width_meters, args.height_meters)

    print(f"Wrote {texture_path}")
    print(f"Wrote {glb_path}")
    print(f"Wrote {usdz_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
