#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <video_path> [model]"
  exit 1
fi

VIDEO_PATH="$1"
MODEL="${2:-qwen3-vl:4b}"

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_BASE="$ROOT_DIR/playtest_vlm"
STAMP="$(date +%Y%m%d_%H%M%S)"
RUN_DIR="$OUT_BASE/$STAMP"
FRAMES_DIR="$RUN_DIR/frames"
OUT_JSON="$RUN_DIR/analysis.json"

mkdir -p "$RUN_DIR"

"$ROOT_DIR/scripts/vlm_playtest/extract_frames.sh" "$VIDEO_PATH" "$FRAMES_DIR" 2

python3 "$ROOT_DIR/scripts/vlm_playtest/analyze_frames.py" \
  --frames "$FRAMES_DIR" \
  --out "$OUT_JSON" \
  --model "$MODEL" \
  --sample-every 2 \
  --max-frames 120

cat <<MSG
Done.
- Frames: $FRAMES_DIR
- Analysis: $OUT_JSON
MSG
