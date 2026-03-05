#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EDITOR="${EDITOR:-/home/autoware/Unity/Hub/Editor/6000.3.10f1/Editor/Unity}"
BUILD_PATH="$ROOT_DIR/Builds/ColorTurfClashLinux/ColorTurfClash.x86_64"
OUTPUT_DIR="$ROOT_DIR/captures"
STAMP="$(date +%Y%m%d_%H%M%S)"
FRAME_DIR="$OUTPUT_DIR/frames_$STAMP"
OUTPUT_FILE="$OUTPUT_DIR/color_turf_clash_demo_$STAMP.mp4"
BUILD_LOG="/tmp/color_turf_linux_build_capture.log"
APP_LOG="/tmp/color_turf_capture_app.log"
APP_PID=""

mkdir -p "$OUTPUT_DIR" "$FRAME_DIR"

cleanup() {
  if [[ -n "$APP_PID" ]] && kill -0 "$APP_PID" >/dev/null 2>&1; then
    kill "$APP_PID" >/dev/null 2>&1 || true
    wait "$APP_PID" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

"$EDITOR" -batchmode -quit -nographics \
  -projectPath "$ROOT_DIR" \
  -executeMethod ColorTurfClash.Editor.ColorTurfBuild.BuildLinuxPlayer \
  -logFile "$BUILD_LOG"

timeout 180 "$BUILD_PATH" \
  -screen-fullscreen 0 \
  -screen-width 1280 \
  -screen-height 720 \
  -demoCapture \
  -captureDir "$FRAME_DIR" \
  -captureFrames 240 \
  -captureFrameRate 30 \
  -logFile "$APP_LOG" >/dev/null 2>&1 &
APP_PID=$!
wait "$APP_PID"
APP_PID=""

FRAME_COUNT="$(find "$FRAME_DIR" -maxdepth 1 -type f -name 'frame_*.png' | wc -l)"
if [[ "$FRAME_COUNT" -eq 0 ]]; then
  echo "capture failed: no frames were produced" >&2
  echo "app log: $APP_LOG" >&2
  exit 1
fi

ffmpeg -y -framerate 30 -i "$FRAME_DIR/frame_%05d.png" -c:v libx264 -pix_fmt yuv420p "$OUTPUT_FILE" >/tmp/color_turf_ffmpeg_capture.log 2>&1
rm -rf "$FRAME_DIR"

printf '%s\n' "$OUTPUT_FILE"
