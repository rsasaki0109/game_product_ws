#!/usr/bin/env bash
set -euo pipefail

SCENARIO="${1:-startup_bypass}"
SETUP_WAIT_SECONDS="${2:-12}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
PREFIX="/tmp/unityhub_${SCENARIO}_${TIMESTAMP}"
RUN_LOG="${PREFIX}.run.log"
STRACE_BASE="${PREFIX}.strace"
TARGETS_BEFORE="${PREFIX}.targets.before.json"
TARGETS_AFTER="${PREFIX}.targets.after.json"
DOM_LOG="${PREFIX}.dom.jsonl"
WMCTRL_LOG="${PREFIX}.wmctrl.log"
SUMMARY_LOG="${PREFIX}.summary.log"
PORT="$(shuf -i 9200-9999 -n 1)"
CONFIG_DIR=""

needs_bypass_config() {
  case "$1" in
    startup_bypass|learn_nav|community_nav|install_editor_open|install_editor_modules|install_download_start|licenses_preferences|license_add_modal|license_request_flow|license_request_create_dialog|license_request_portal_open|license_file_picker_open|license_activate_invalid_file|license_activate_invalid_file_direct|license_activate_invalid_serial)
      return 0
      ;;
  esac

  return 1
}

if needs_bypass_config "$SCENARIO"; then
  CONFIG_DIR="$(mktemp -d /tmp/unityhub_cfg_XXXXXX)"
  cat > "${CONFIG_DIR}/services-config.json" <<'JSON'
{"hubDisableSignin":true,"hubDisableSignInRequired":true}
JSON
fi

cleanup() {
  if [[ -n "${TRACE_PID:-}" ]] && kill -0 "${TRACE_PID}" >/dev/null 2>&1; then
    kill -TERM -- "-${TRACE_PID}" >/dev/null 2>&1 || kill "${TRACE_PID}" >/dev/null 2>&1 || true
    wait "${TRACE_PID}" >/dev/null 2>&1 || true
  fi

  if [[ -n "${CONFIG_DIR}" && -d "${CONFIG_DIR}" ]]; then
    rm -rf "${CONFIG_DIR}"
  fi
}

trap cleanup EXIT

stop_trace() {
  if [[ -n "${TRACE_PID:-}" ]] && kill -0 "${TRACE_PID}" >/dev/null 2>&1; then
    kill -TERM -- "-${TRACE_PID}" >/dev/null 2>&1 || kill "${TRACE_PID}" >/dev/null 2>&1 || true
    wait "${TRACE_PID}" >/dev/null 2>&1 || true
  fi
}

wait_for_devtools() {
  local retries=40
  local delay=0.5

  for _ in $(seq 1 "${retries}"); do
    if curl -fsS "http://127.0.0.1:${PORT}/json/list" >/dev/null 2>&1; then
      return 0
    fi

    sleep "${delay}"
  done

  echo "devtools endpoint did not become ready on port ${PORT}" >&2
  return 1
}

LAUNCH_CMD=(/home/autoware/bin/unityhub "--remote-debugging-port=${PORT}")
if [[ -n "${CONFIG_DIR}" ]]; then
  setsid env CONFIG_PATH="${CONFIG_DIR}" \
    strace -ff -tt -s 512 -e trace=network -o "${STRACE_BASE}" \
    "${LAUNCH_CMD[@]}" >"${RUN_LOG}" 2>&1 &
else
  setsid strace -ff -tt -s 512 -e trace=network -o "${STRACE_BASE}" \
    "${LAUNCH_CMD[@]}" >"${RUN_LOG}" 2>&1 &
fi
TRACE_PID=$!

sleep "${SETUP_WAIT_SECONDS}"
wait_for_devtools

curl -fsS "http://127.0.0.1:${PORT}/json/list" > "${TARGETS_BEFORE}" || true
node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
  --port "${PORT}" \
  dump:initial > "${DOM_LOG}" || true

case "${SCENARIO}" in
  startup_bypass)
    ;;
  learn_nav)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:get-started \
      sleep:1500 \
      click-testid:navigation-learn \
      sleep:4000 \
      dump:learn >> "${DOM_LOG}"
    ;;
  community_nav)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:get-started \
      sleep:1500 \
      click-testid:navigation-community \
      sleep:4000 \
      dump:community >> "${DOM_LOG}"
    ;;
  install_editor_open)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:get-started \
      sleep:1500 \
      click-testid:install-editor \
      sleep:4000 \
      dump:install >> "${DOM_LOG}"
    ;;
  install_editor_modules)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:get-started \
      sleep:1500 \
      click-testid:install-editor \
      sleep:3000 \
      click-testid:install-editor-button-6000.3.10f1-x86_64 \
      sleep:4000 \
      dump:install-modules >> "${DOM_LOG}"
    ;;
  install_download_start)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:get-started \
      sleep:1500 \
      click-testid:install-editor \
      sleep:3000 \
      click-testid:install-editor-button-6000.3.10f1-x86_64 \
      sleep:3000 \
      click-testid:installButton \
      sleep:3000 \
      dump:download-start \
      click-testid:cancel-button-Unity\ 6.3\ LTS\ \(6000.3.10f1\) \
      sleep:1500 \
      click-text:Cancel\ download \
      sleep:2500 \
      dump:download-cancelled >> "${DOM_LOG}"
    ;;
  licenses_preferences)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:account-button \
      sleep:1500 \
      click-testid:profile-manage-licenses-menu \
      sleep:4000 \
      dump:licenses >> "${DOM_LOG}"
    ;;
  license_add_modal)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:account-button \
      sleep:1500 \
      click-testid:profile-manage-licenses-menu \
      sleep:3000 \
      click-testid:preference-license-add \
      sleep:4000 \
      dump:license-add >> "${DOM_LOG}"
    ;;
  license_request_flow)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:account-button \
      sleep:1500 \
      click-testid:profile-manage-licenses-menu \
      sleep:3000 \
      click-testid:preference-license-add \
      sleep:2500 \
      click-testid:activate-with-license-request-file-button \
      sleep:3000 \
      dump:license-request-flow >> "${DOM_LOG}"
    ;;
  license_request_create_dialog)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:account-button \
      sleep:1500 \
      click-testid:profile-manage-licenses-menu \
      sleep:3000 \
      click-testid:preference-license-add \
      sleep:2500 \
      click-testid:activate-with-license-request-file-button \
      sleep:3000 \
      click-text:Create\ license\ request \
      sleep:2500 \
      dump:license-request-save-dialog >> "${DOM_LOG}"
    wmctrl -lp > "${WMCTRL_LOG}" || true
    ;;
  license_request_portal_open)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:account-button \
      sleep:1500 \
      click-testid:profile-manage-licenses-menu \
      sleep:3000 \
      click-testid:preference-license-add \
      sleep:2500 \
      click-testid:activate-with-license-request-file-button \
      sleep:3000 \
      click-testid:upload-license-request-file-link \
      sleep:2500 \
      dump:license-request-portal >> "${DOM_LOG}"
    wmctrl -lp > "${WMCTRL_LOG}" || true
    ;;
  license_file_picker_open)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:account-button \
      sleep:1500 \
      click-testid:profile-manage-licenses-menu \
      sleep:3000 \
      click-testid:preference-license-add \
      sleep:2500 \
      click-testid:activate-with-license-request-file-button \
      sleep:3000 \
      click-testid:activate-license-file \
      sleep:2500 \
      dump:license-file-picker >> "${DOM_LOG}"
    wmctrl -lp > "${WMCTRL_LOG}" || true
    ;;
  license_activate_invalid_file)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:account-button \
      sleep:1500 \
      click-testid:profile-manage-licenses-menu \
      sleep:3000 \
      click-testid:preference-license-add \
      sleep:2500 \
      click-testid:activate-with-license-request-file-button \
      sleep:3000 \
      invoke-str:licenses/activateLicenseWithFile:/tmp/fake_unity_activation.ulf \
      sleep:3500 \
      dump-all:license-invalid-file >> "${DOM_LOG}"
    ;;
  license_activate_invalid_file_direct)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:account-button \
      sleep:1500 \
      click-testid:profile-manage-licenses-menu \
      sleep:3000 \
      click-testid:preference-license-add \
      sleep:2500 \
      invoke-str:licenses/activateLicenseWithFile:/tmp/fake_unity_activation.ulf \
      sleep:3500 \
      dump-all:license-invalid-file-direct >> "${DOM_LOG}"
    ;;
  license_activate_invalid_serial)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      click-testid:account-button \
      sleep:1500 \
      click-testid:profile-manage-licenses-menu \
      sleep:3000 \
      click-testid:preference-license-add \
      sleep:2500 \
      invoke-str:licenses/activateLicense:AAAA-BBBB-CCCC-DDDD \
      sleep:3500 \
      dump-all:license-invalid-serial >> "${DOM_LOG}"
    ;;
  signin_open)
    node /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_cdp_control.js \
      --port "${PORT}" \
      invoke:open-signin \
      sleep:4000 \
      dump:signin >> "${DOM_LOG}"
    wmctrl -lp > "${WMCTRL_LOG}" || true
    ;;
  *)
    echo "unsupported scenario: ${SCENARIO}" >&2
    exit 1
    ;;
esac

curl -fsS "http://127.0.0.1:${PORT}/json/list" > "${TARGETS_AFTER}" || true
sleep 2
stop_trace

if ls "${STRACE_BASE}".* >/dev/null 2>&1; then
  mapfile -t STRACE_FILES < <(printf '%s\n' "${STRACE_BASE}".*)

  {
    echo "ports:"
    rg "connect\\(" "${STRACE_FILES[@]}" | perl -ne '
      my ($port) = /sin(?:6)?_port=htons\((\d+)\)/;
      print "$port\n" if defined $port;
    ' | sort | uniq -c | sort -nr | sed -n '1,20p' || true

    echo
    echo "top_443_ips:"
    rg "connect\\(" "${STRACE_FILES[@]}" | perl -ne '
      my ($port) = /sin(?:6)?_port=htons\((\d+)\)/;
      next unless defined $port && $port == 443;
      my ($ip) = /inet_addr\("([0-9.]+)"\)/;
      if (!defined $ip) {
        ($ip) = /inet_pton\(AF_INET6, "([^"]+)"/;
      }
      print "$ip\n" if defined $ip;
    ' | sort | uniq -c | sort -nr | sed -n '1,20p' || true

    echo
    echo "top_urls:"
    rg --no-filename -o "https?://[A-Za-z0-9._:/?&=%-]+" "${STRACE_FILES[@]}" | \
      sort | uniq -c | sort -nr | sed -n '1,40p' || true
  } > "${SUMMARY_LOG}"
fi

printf 'scenario=%s\n' "${SCENARIO}"
printf 'port=%s\n' "${PORT}"
printf 'run_log=%s\n' "${RUN_LOG}"
printf 'strace_base=%s\n' "${STRACE_BASE}"
printf 'targets_before=%s\n' "${TARGETS_BEFORE}"
printf 'targets_after=%s\n' "${TARGETS_AFTER}"
printf 'dom_log=%s\n' "${DOM_LOG}"
if [[ -f "${WMCTRL_LOG}" ]]; then
  printf 'wmctrl_log=%s\n' "${WMCTRL_LOG}"
fi
if [[ -f "${SUMMARY_LOG}" ]]; then
  printf 'summary_log=%s\n' "${SUMMARY_LOG}"
fi
