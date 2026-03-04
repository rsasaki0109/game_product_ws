#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   capture_and_analyze.sh [duration_sec] [window_regex] [model]

DURATION="${1:-90}"
WINDOW_REGEX="${2:-Roblox|Studio|wine}"
MODEL="${3:-qwen3-vl:4b}"

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
STAMP="$(date +%Y%m%d_%H%M%S)"
RUN_DIR="$ROOT_DIR/playtest_vlm/$STAMP"
VIDEO_PATH="$RUN_DIR/capture.mp4"

mkdir -p "$RUN_DIR"

"$ROOT_DIR/scripts/vlm_playtest/capture_desktop.sh" "$VIDEO_PATH" "$DURATION" "$WINDOW_REGEX"
"$ROOT_DIR/scripts/vlm_playtest/run_playtest_analysis.sh" "$VIDEO_PATH" "$MODEL"

echo "capture=$VIDEO_PATH"
