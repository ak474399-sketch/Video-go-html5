#!/usr/bin/env python3
"""
Generate 5 obfuscated variants for every MP4 file in a directory tree.

Per-variant transforms:
- slight brightness perturbation
- slight zoom + crop back
- 1x1 top-right transparent watermark
- frame rate set to 30000/1001 (29.97 fps)
- strip metadata and chapters

Each variant is retried until a unique MD5 is produced (per source file),
or until max retries is reached.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import random
import shutil
import subprocess
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Iterable


TARGET_VARIANTS = 5
TARGET_FPS = "30000/1001"


@dataclass
class VariantRecord:
    source: str
    output: str
    variant: int
    attempt: int
    md5: str
    brightness: float


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate 5 obfuscated MP4 variants per input video."
    )
    parser.add_argument(
        "input_dir",
        type=Path,
        help="Input directory to recursively scan for .mp4 files",
    )
    parser.add_argument(
        "--output-root",
        type=Path,
        default=None,
        help=(
            "Optional output root. If omitted, variants are written next to source files. "
            "If set, original folder structure is preserved under this root."
        ),
    )
    parser.add_argument(
        "--max-retries",
        type=int,
        default=12,
        help="Max retries per variant when MD5 duplicates happen (default: 12)",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="Optional random seed for reproducibility",
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing output variants if they already exist",
    )
    return parser.parse_args()


def ensure_ffmpeg() -> None:
    if shutil.which("ffmpeg") is None:
        raise RuntimeError("ffmpeg not found in PATH.")
    if shutil.which("ffprobe") is None:
        raise RuntimeError("ffprobe not found in PATH.")


def find_mp4_files(root: Path) -> Iterable[Path]:
    for p in root.rglob("*"):
        if p.is_file() and p.suffix.lower() == ".mp4":
            yield p


def compute_md5(path: Path, chunk_size: int = 1024 * 1024) -> str:
    h = hashlib.md5()
    with path.open("rb") as f:
        while True:
            chunk = f.read(chunk_size)
            if not chunk:
                break
            h.update(chunk)
    return h.hexdigest()


def output_path_for(
    src: Path, input_root: Path, output_root: Path | None, variant_idx: int
) -> Path:
    name = f"{src.stem}_v{variant_idx}.mp4"
    if output_root is None:
        return src.with_name(name)
    rel_parent = src.parent.relative_to(input_root)
    out_parent = output_root / rel_parent
    out_parent.mkdir(parents=True, exist_ok=True)
    return out_parent / name


def run_ffmpeg_variant(src: Path, dst: Path, brightness_shift: float) -> None:
    # brightness shift is in [-0.02, 0.02] (eq brightness domain)
    vf = ",".join(
        [
            f"eq=brightness={brightness_shift:.6f}",
            "scale=iw*1.01:ih*1.01",
            "crop=iw:ih",
            "drawbox=x=iw-1:y=0:w=1:h=1:color=white@0.01:t=fill",
            f"fps={TARGET_FPS}",
        ]
    )

    cmd = [
        "ffmpeg",
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-i",
        str(src),
        "-vf",
        vf,
        "-r",
        TARGET_FPS,
        "-map_metadata",
        "-1",
        "-map_chapters",
        "-1",
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-b:a",
        "128k",
        str(dst),
    ]
    subprocess.run(cmd, check=True)


def process_one_file(
    src: Path,
    input_root: Path,
    output_root: Path | None,
    max_retries: int,
    overwrite: bool,
) -> list[VariantRecord]:
    records: list[VariantRecord] = []
    seen_md5: set[str] = set()

    for variant_idx in range(1, TARGET_VARIANTS + 1):
        dst = output_path_for(src, input_root, output_root, variant_idx)
        if dst.exists() and not overwrite:
            raise FileExistsError(f"Output exists (use --overwrite): {dst}")

        success = False
        for attempt in range(1, max_retries + 1):
            brightness_shift = random.uniform(-0.02, 0.02)
            run_ffmpeg_variant(src, dst, brightness_shift)
            md5 = compute_md5(dst)

            if md5 in seen_md5:
                dst.unlink(missing_ok=True)
                continue

            seen_md5.add(md5)
            records.append(
                VariantRecord(
                    source=str(src),
                    output=str(dst),
                    variant=variant_idx,
                    attempt=attempt,
                    md5=md5,
                    brightness=brightness_shift,
                )
            )
            success = True
            break

        if not success:
            raise RuntimeError(
                f"Failed to generate unique MD5 for {src.name} variant v{variant_idx} "
                f"after {max_retries} retries."
            )

    return records


def main() -> int:
    args = parse_args()
    if args.seed is not None:
        random.seed(args.seed)

    input_dir: Path = args.input_dir.resolve()
    output_root: Path | None = (
        args.output_root.resolve() if args.output_root is not None else None
    )

    if not input_dir.exists() or not input_dir.is_dir():
        print(f"[ERROR] input_dir is invalid: {input_dir}", file=sys.stderr)
        return 2

    try:
        ensure_ffmpeg()
    except RuntimeError as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        return 2

    mp4_files = sorted(find_mp4_files(input_dir))
    if not mp4_files:
        print("[INFO] No .mp4 files found.")
        return 0

    print(f"[INFO] Found {len(mp4_files)} mp4 file(s).")
    all_records: list[VariantRecord] = []

    for idx, src in enumerate(mp4_files, start=1):
        print(f"[INFO] ({idx}/{len(mp4_files)}) Processing: {src}")
        try:
            records = process_one_file(
                src=src,
                input_root=input_dir,
                output_root=output_root,
                max_retries=args.max_retries,
                overwrite=args.overwrite,
            )
            all_records.extend(records)
            print(f"[OK] Generated {len(records)} variants for: {src.name}")
        except Exception as e:  # pylint: disable=broad-except
            print(f"[ERROR] {src}: {e}", file=sys.stderr)
            return 1

    manifest_base = output_root if output_root is not None else input_dir
    manifest_path = manifest_base / "obfuscation_manifest.json"
    with manifest_path.open("w", encoding="utf-8") as f:
        json.dump([asdict(r) for r in all_records], f, ensure_ascii=False, indent=2)

    print(f"[DONE] Generated {len(all_records)} variants total.")
    print(f"[DONE] Manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
