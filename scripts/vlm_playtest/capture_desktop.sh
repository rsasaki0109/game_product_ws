#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   capture_desktop.sh <output_mp4> [duration_sec] [window_name_regex]
# Example:
#   capture_desktop.sh captures/playtest.mp4 120 "Roblox|Studio|wine"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <output_mp4> [duration_sec] [window_name_regex]" >&2
  exit 1
fi

OUT_MP4="$1"
DURATION="${2:-90}"
WINDOW_REGEX="${3:-Roblox|Studio|wine}"
FPS="${FPS:-30}"
DISPLAY_NAME="${DISPLAY:-:0}"
WAIT_FOR_WINDOW="${WAIT_FOR_WINDOW:-0}"
WAIT_TIMEOUT="${WAIT_TIMEOUT:-120}"

mkdir -p "$(dirname "$OUT_MP4")"

find_window_geom() {
  local wid
  wid="$(xdotool search --name "$WINDOW_REGEX" 2>/dev/null | head -n 1 || true)"
  if [[ -z "$wid" ]]; then
    return 1
  fi

  local geo
  geo="$(xwininfo -id "$wid" 2>/dev/null || true)"
  if [[ -z "$geo" ]]; then
    return 1
  fi

  local x y w h
  x="$(awk -F': ' '/Absolute upper-left X/{print $2}' <<<"$geo" | tr -d ' ')"
  y="$(awk -F': ' '/Absolute upper-left Y/{print $2}' <<<"$geo" | tr -d ' ')"
  w="$(awk -F': ' '/Width/{print $2}' <<<"$geo" | tr -d ' ')"
  h="$(awk -F': ' '/Height/{print $2}' <<<"$geo" | tr -d ' ')"

  if [[ -z "$x" || -z "$y" || -z "$w" || -z "$h" ]]; then
    return 1
  fi

  echo "$w" "$h" "$x" "$y"
  return 0
}

find_screen_geom() {
  local line
  line="$(xrandr --current | awk '/ connected primary /{print $4; exit} / connected /{print $3; exit}')"
  if [[ -z "$line" ]]; then
    line="1920x1080+0+0"
  fi

  local wh xy w h x y
  wh="${line%%+*}"
  xy="${line#*+}"
  w="${wh%x*}"
  h="${wh#*x}"
  x="${xy%%+*}"
  y="${xy#*+}"

  echo "$w" "$h" "$x" "$y"
}

geom=""
if geom="$(find_window_geom || true)"; then
  :
fi

if [[ -z "$geom" && "$WAIT_FOR_WINDOW" == "1" ]]; then
  echo "waiting_for_window regex=$WINDOW_REGEX timeout=${WAIT_TIMEOUT}s"
  start_ts="$(date +%s)"
  while true; do
    geom="$(find_window_geom || true)"
    if [[ -n "$geom" ]]; then
      break
    fi
    now_ts="$(date +%s)"
    if (( now_ts - start_ts >= WAIT_TIMEOUT )); then
      echo "window_not_found_within_timeout" >&2
      exit 1
    fi
    sleep 1
  done
fi

if [[ -n "$geom" ]]; then
  read -r CAP_W CAP_H CAP_X CAP_Y <<<"$geom"
  echo "capture_mode=window"
  echo "window_regex=$WINDOW_REGEX"
else
  read -r CAP_W CAP_H CAP_X CAP_Y <<<"$(find_screen_geom)"
  echo "capture_mode=screen"
fi

# libx264 requires even dimensions for yuv420p.
if (( CAP_W % 2 == 1 )); then
  CAP_W=$((CAP_W - 1))
fi
if (( CAP_H % 2 == 1 )); then
  CAP_H=$((CAP_H - 1))
fi

echo "geometry=${CAP_W}x${CAP_H}+${CAP_X},${CAP_Y}"
echo "duration=${DURATION}s fps=${FPS} output=${OUT_MP4}"

ffmpeg -hide_banner -loglevel warning -y \
  -f x11grab \
  -framerate "$FPS" \
  -video_size "${CAP_W}x${CAP_H}" \
  -i "${DISPLAY_NAME}+${CAP_X},${CAP_Y}" \
  -t "$DURATION" \
  -c:v libx264 -preset veryfast -crf 23 -pix_fmt yuv420p \
  "$OUT_MP4"

echo "saved=$OUT_MP4"
