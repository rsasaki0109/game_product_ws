#!/usr/bin/env bash
set -euo pipefail

DURATION_SECONDS="${1:-120}"
INTERVAL_SECONDS="${2:-5}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
PREFIX="/tmp/unityhub_connections_${TIMESTAMP}"
RUN_LOG="${PREFIX}.run.log"
SS_LOG="${PREFIX}.ss.log"
LSOF_LOG="${PREFIX}.lsof.log"

/home/autoware/bin/unityhub >"$RUN_LOG" 2>&1 &
LAUNCH_PID=$!

cleanup() {
  if kill -0 "$LAUNCH_PID" >/dev/null 2>&1; then
    kill "$LAUNCH_PID" >/dev/null 2>&1 || true
    wait "$LAUNCH_PID" >/dev/null 2>&1 || true
  fi
}

trap cleanup EXIT

sleep 8

ELAPSED=0
while [ "$ELAPSED" -lt "$DURATION_SECONDS" ]; do
  {
    printf '### sample_at=%ss ###\n' "$ELAPSED"
    ss -tpn state established | rg "unityhub|chrome_crashpad_handler" || true
  } >>"$SS_LOG"

  {
    printf '### sample_at=%ss ###\n' "$ELAPSED"
    lsof -nP -a -iTCP -sTCP:ESTABLISHED -c unityhub || true
  } >>"$LSOF_LOG"

  sleep "$INTERVAL_SECONDS"
  ELAPSED=$((ELAPSED + INTERVAL_SECONDS))
done

printf 'run_log=%s\n' "$RUN_LOG"
printf 'ss_log=%s\n' "$SS_LOG"
printf 'lsof_log=%s\n' "$LSOF_LOG"

printf 'ss_remote_endpoints:\n'
rg --no-filename -o "[0-9a-fA-F:.]+:[0-9]+\\s+[0-9a-fA-F:.]+:[0-9]+" "$SS_LOG" | \
  awk '{print $2}' | sort | uniq -c | sort -nr | sed -n '1,20p' || true

printf 'lsof_remote_endpoints:\n'
rg --no-filename -o -- "->[0-9A-Za-z:.\\[\\]-]+:[0-9]+" "$LSOF_LOG" | \
  sed 's/^->//' | sort | uniq -c | sort -nr | sed -n '1,20p' || true
