#!/usr/bin/env bash
set -euo pipefail

DURATION_SECONDS="${1:-90}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
TRACE_PREFIX="/tmp/unityhub_trace_${TIMESTAMP}"
STRACE_BASE="${TRACE_PREFIX}.strace"
RUN_LOG="${TRACE_PREFIX}.run.log"

timeout "${DURATION_SECONDS}s" \
  strace -ff -tt -s 512 -e trace=network -o "$STRACE_BASE" \
  /home/autoware/bin/unityhub >"$RUN_LOG" 2>&1 || true

printf 'run_log=%s\n' "$RUN_LOG"
printf 'strace_base=%s\n' "$STRACE_BASE"

if ls "${STRACE_BASE}".* >/dev/null 2>&1; then
  FILES=("${STRACE_BASE}".*)

  printf 'strace_files=%s\n' "${#FILES[@]}"

  printf 'ports:\n'
  rg "connect\\(" "${FILES[@]}" | perl -ne '
    my ($port) = /sin(?:6)?_port=htons\((\d+)\)/;
    print "$port\n" if defined $port;
  ' | sort | uniq -c | sort -nr | sed -n '1,20p' || true

  printf 'top_443_ips:\n'
  rg "connect\\(" "${FILES[@]}" | perl -ne '
    my ($port) = /sin(?:6)?_port=htons\((\d+)\)/;
    next unless defined $port && $port == 443;
    my ($ip) = /inet_addr\("([0-9.]+)"\)/;
    if (!defined $ip) {
      ($ip) = /inet_pton\(AF_INET6, "([^"]+)"/;
    }
    print "$ip\n" if defined $ip;
  ' | sort | uniq -c | sort -nr | sed -n '1,20p' || true

  printf 'top_urls:\n'
  rg --no-filename -o "https?://[A-Za-z0-9._:/-]+" "${FILES[@]}" | \
    sort | uniq -c | sort -nr | sed -n '1,20p' || true
fi
