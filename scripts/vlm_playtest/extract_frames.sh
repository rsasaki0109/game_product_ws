#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
  echo "Usage: $0 <video_path> <output_dir> [fps]"
  exit 1
fi

VIDEO_PATH="$1"
OUT_DIR="$2"
FPS="${3:-2}"

if [[ ! -f "$VIDEO_PATH" ]]; then
  echo "video not found: $VIDEO_PATH" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

ffmpeg -hide_banner -loglevel warning \
  -i "$VIDEO_PATH" \
  -vf "fps=${FPS},scale='min(1280,iw)':-2:flags=lanczos" \
  "$OUT_DIR/frame_%05d.jpg"

COUNT=$(find "$OUT_DIR" -maxdepth 1 -name 'frame_*.jpg' | wc -l)
echo "extracted_frames=$COUNT"
