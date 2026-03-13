# Video Obfuscation CLI

`video_obfuscate.py` recursively scans all `.mp4` files and generates 5 obfuscated variants for each source video:

- `original_v1.mp4`
- `original_v2.mp4`
- `original_v3.mp4`
- `original_v4.mp4`
- `original_v5.mp4`

Each variant applies:

- slight brightness perturbation (random in `[-0.02, 0.02]`, equivalent to 0.98~1.02 micro-variation intent)
- slight zoom (`1.01x`) + crop back
- a top-right `1x1` transparent pixel overlay
- frame rate change to `29.97fps (30000/1001)`
- metadata + chapters stripping

MD5 uniqueness is enforced **per source video** across its 5 variants.  
If an MD5 collision occurs, the script retries with new random parameters.

## Prerequisites

- Python 3.9+
- `ffmpeg` and `ffprobe` available in PATH

## Usage

From repository root:

```bash
python tools/video_obfuscate.py /path/to/input_dir
```

Optional output root (preserve folder structure under output root):

```bash
python tools/video_obfuscate.py /path/to/input_dir --output-root /path/to/output_dir
```

Useful options:

```bash
python tools/video_obfuscate.py /path/to/input_dir \
  --max-retries 12 \
  --seed 42 \
  --overwrite
```

## Output

- Variant videos are written next to source files by default (or under `--output-root`).
- A JSON manifest is generated:
  - default: `<input_dir>/obfuscation_manifest.json`
  - with output root: `<output_root>/obfuscation_manifest.json`

Manifest fields include source path, output path, variant index, retry attempt, MD5, and brightness value.
