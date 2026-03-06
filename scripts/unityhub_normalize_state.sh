#!/usr/bin/env bash
set -euo pipefail

config_dir="${HOME}/.config/unityhub"
unity_dir="${HOME}/.local/share/unity3d"
prefs_path="${unity_dir}/prefs"

mkdir -p "${config_dir}" "${unity_dir}"

write_json_if_missing() {
  local path="$1"
  local contents="$2"
  if [[ ! -e "${path}" ]]; then
    printf '%s\n' "${contents}" > "${path}"
    echo "created ${path}"
  else
    echo "kept ${path}"
  fi
}

migrate_or_create_json() {
  local file_name="$1"
  local contents="$2"
  local destination="${config_dir}/${file_name}"
  local legacy_storage_path="${config_dir}/storage/${file_name}"

  if [[ -e "${destination}" ]]; then
    echo "kept ${destination}"
    return
  fi

  if [[ -e "${legacy_storage_path}" ]]; then
    cp "${legacy_storage_path}" "${destination}"
    echo "migrated ${legacy_storage_path} -> ${destination}"
    return
  fi

  write_json_if_missing "${destination}" "${contents}"
}

migrate_or_create_json "skipRemoveConfirmation.json" '{"always":false,"timestamp":0}'
migrate_or_create_json "skipInstallInProgressWarning.json" '{"value":false}'
migrate_or_create_json "skipSignOutConfirmation.json" '{"shouldSkip":false}'
migrate_or_create_json "projectOrganizationSetting.json" '{"organization":""}'

if [[ ! -e "${prefs_path}" ]]; then
  cat > "${prefs_path}" <<'EOF'
<unity_prefs version_major="1" version_minor="0"/>
EOF
  echo "created ${prefs_path}"
else
  echo "kept ${prefs_path}"
fi
