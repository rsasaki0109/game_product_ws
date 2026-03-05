# Unity Hub Communication Analysis (2026-03-05)

## Scope
- Target: user-space extracted Unity Hub binary at `/home/autoware/.local/opt/unityhub/unityhub`
- Method: `strace -ff -e trace=network` on startup, then endpoint/domain extraction
- Time: 2026-03-05 11:09 - 2026-03-06 08:55 JST

## Evidence Files
- `/tmp/unityhub_strace2_20260305_110933.log`
- `/tmp/unityhub_run2_20260305_110933.log`
- `/tmp/unityhub_strace4_20260305_111129.log.*`
- `/tmp/unityhub_run4_20260305_111129.log`
- `/tmp/unityhub_gpu_strace_20260305_141157.log.*`
- `/tmp/unityhub_gpu_run_20260305_141157.log`
- `/tmp/unityhub_gpu_stable_strace_20260305_141535.log.*`
- `/tmp/unityhub_gpu_stable_run_20260305_141535.log`
- `/tmp/unityhub_trace_20260306_082309.strace.*`
- `/tmp/unityhub_trace_20260306_082309.run.log`
- `/tmp/unityhub_connections_20260306_085454.run.log`
- `/tmp/unityhub_connections_20260306_085454.ss.log`
- `/tmp/unityhub_connections_20260306_085454.lsof.log`
- `/tmp/unityhub_ordering_20260306_090346.log`
- `~/.config/unityhub/logs/info-log.json`

## Launcher Changes
- `/home/autoware/bin/unityhub` now launches the extracted Unity Hub binary directly.
- The wrapper no longer goes through `AppRun`, which previously had an argument-handling bug.
- Default launch flags are now:
  - `--disable-gpu-sandbox`
  - `--ignore-gpu-blocklist`
- Reusable capture helper added:
  - `/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_network.sh`
  - `/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_sample_connections.sh`

## Key Findings

### 1) Network shape
- Outbound connections are primarily:
  - DNS: destination `127.0.0.53:53` (systemd-resolved)
  - HTTPS: destination `*:443`
- Port count across collected traces:
  - `53`: 37
  - `443`: 37
  - `0`: 106 (address-probing/connect-reset patterns, not remote service ports)

### 2) Confirmed Unity endpoints (from DNS/TLS/URL traces)
- `license.unity3d.com`
  - TLS SNI visible in trace:
    - `/tmp/unityhub_strace4_20260305_111129.log.3009582:12`
    - `/tmp/unityhub_strace2_20260305_110933.log:8005`
- `cdp.cloud.unity3d.com`
  - DNS/TLS visible:
    - `/tmp/unityhub_strace4_20260305_111129.log.3009575:9`
    - `/tmp/unityhub_strace4_20260305_111129.log.3009575:10`
    - `/tmp/unityhub_strace4_20260305_111129.log.3009575:16`
    - `/tmp/unityhub_strace2_20260305_110933.log:7634`
- `public-cdn.cloud.unity3d.com`
  - TLS SNI visible:
    - `/tmp/unityhub_strace2_20260305_110933.log:5392`
- `cloud.unity.com`
  - URL payload visible:
    - `/tmp/unityhub_strace4_20260305_111129.log.3009459:1420`
    - `/tmp/unityhub_strace4_20260305_111129.log.3009459:1421`

### 3) Analytics/auxiliary endpoints seen in traces
- `api2.amplitude.com` (analytics events)
- `cdn.wootric.com` (feedback/survey SDK)
- `redirector.gvt1.com`, `r1---sn-ajogu5-5x.gvt1.com` (Google delivery/update paths)
- `ocsp.pki.goog`, `pki.goog` URLs also appear in captured strings (certificate/PKI path)

### 4) Remote IP infrastructure (top observed `:443` targets)
- High frequency:
  - `23.211.14.170`, `23.211.14.82` (Akamai PTR)
  - `2404:6800:4004:1::1`, `2404:6800:4004:806::200e` (Google/1e100 PTR)
  - `52.13.208.61`, `44.242.3.172`, `44.226.42.160`, `54.212.51.15`, `35.161.73.14`, `100.20.224.28`, `100.22.226.176` (AWS us-west-2 PTR)
  - `34.120.134.125`, `34.96.110.71`, `34.107.172.168`, `34.81.246.144` (Google Cloud PTR)

## Runtime Limitation
- Unity Hub repeatedly crashes due GPU process failure:
  - `/tmp/unityhub_run4_20260305_111129.log:21`
  - `/tmp/unityhub_run4_20260305_111129.log:22`
  - `/tmp/unityhub_run4_20260305_111129.log:28`
- Crash string: `GPU process isn't usable. Goodbye.`
- Because of this, capture is startup-focused; long-session behavioral traffic was not observed.

## GPU Re-Run (User Reported GPU Available)

### A) Normal launch re-test (`/home/autoware/bin/unityhub`)
- GPU was present on host (`NVIDIA GeForce RTX 3060`, driver `580.126.09`).
- Normal launch still ended with the same fatal pattern:
  - `/tmp/unityhub_gpu_run_20260305_141157.log:7`
  - `/tmp/unityhub_gpu_run_20260305_141157.log:8`
  - `/tmp/unityhub_gpu_run_20260305_141157.log:17`

### B) Stable capture with GPU flags
- Launch flags used:
  - `--disable-gpu-sandbox --ignore-gpu-blocklist`
- Result:
  - 90-second capture completed until timeout (`EC=124`) with no fatal line.
  - `/tmp/unityhub_gpu_stable_run_20260305_141535.log` contains only non-fatal errors.
  - `exit_code=15` appears at timeout boundary, consistent with external termination by `timeout`:
    - `/tmp/unityhub_gpu_stable_run_20260305_141535.log:5`

### C) Stable-run communication summary
- Port counts:
  - `53`: 14
  - `443`: 13
  - `0`: 44
- Top `:443` IPs:
  - `23.208.31.183`, `23.208.31.167` (Akamai range)
  - `54.69.229.192`, `54.200.240.88`, `35.155.53.189`, `100.22.226.176` (AWS us-west-2 range)
  - `34.120.134.125`, `34.107.172.168`, `34.81.246.144`, `34.96.110.71` (Google Cloud range)
  - `151.101.66.132` (Fastly range)
- Domain frequency extracted from traces:
  - `api2.amplitude.com`: 43
  - `cdn.wootric.com`: 10
  - `cloud.unity.com`: 4
  - `license.unity3d.com`: 1
  - `cdp.cloud.unity3d.com`: 1
- Unity endpoint proof in stable run:
  - `cdp.cloud.unity3d.com`:
    - `/tmp/unityhub_gpu_stable_strace_20260305_141535.log.3173729:2`
  - `license.unity3d.com`:
    - `/tmp/unityhub_gpu_stable_strace_20260305_141535.log.3173728:16`
  - `cloud.unity.com` URLs:
    - `/tmp/unityhub_gpu_stable_strace_20260305_141535.log.3173575:1721`
    - `/tmp/unityhub_gpu_stable_strace_20260305_141535.log.3173575:1722`
  - Analytics / feedback URLs:
    - `/tmp/unityhub_gpu_stable_strace_20260305_141535.log.3173752:286`
    - `/tmp/unityhub_gpu_stable_strace_20260305_141535.log.3173752:212`

## Wrapper-Based Reproduction (2026-03-06)

### A) Wrapper smoke test
- `timeout 25s /home/autoware/bin/unityhub` completed without a fatal GPU line.
- Observed only non-fatal startup errors:
  - `/tmp/unityhub_wrapper_smoke_20260306_082118.log:5`
  - `/tmp/unityhub_wrapper_smoke_20260306_082118.log:6`

### B) Helper script smoke test (`30s`)
- Command:
  - `/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_network.sh 30`
- Summary:
  - `53`: 19
  - `443`: 17
  - `0`: 44
  - top URLs remained:
    - `https://api2.amplitude.com/2/httpapi`
    - `https://cdn.wootric.com/wootric-sdk.js`
    - `https://cloud.unity.com`

### C) Helper script longer run (`180s`)
- Command:
  - `/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_network.sh 180`
- Summary:
  - `53`: 23
  - `443`: 18
  - `0`: 44
  - top `:443` IPs:
    - `34.160.81.0` (Google Cloud PTR)
    - `23.56.0.199` (Akamai PTR)
    - `44.241.99.111`, `35.161.252.216` (AWS us-west-2 PTR)
    - `151.101.2.132` (Fastly range)
  - top URLs:
    - `https://api2.amplitude.com/2/httpapi`
    - `https://api2.amplitude.com/2/http`
    - `https://cdn.wootric.com/wootric-sdk.js`
    - `https://cloud.unity.com`
- No materially new endpoint family appeared relative to the earlier stable captures.
- Unity / analytics proof in this run:
  - `cdp.cloud.unity3d.com`:
    - `/tmp/unityhub_trace_20260306_082309.strace.29795:15`
  - `license.unity3d.com`:
    - `/tmp/unityhub_trace_20260306_082309.strace.28399:26`
  - `cloud.unity.com` URLs:
    - `/tmp/unityhub_trace_20260306_082309.strace.28259:1793`
    - `/tmp/unityhub_trace_20260306_082309.strace.28259:1794`
  - `cdn.wootric.com` URL:
    - `/tmp/unityhub_trace_20260306_082309.strace.28421:214`
  - `api2.amplitude.com` URL:
    - `/tmp/unityhub_trace_20260306_082309.strace.28421:288`
- Run log shows no fatal line before timeout; termination remained non-fatal:
  - `/tmp/unityhub_trace_20260306_082309.run.log:4`
  - `/tmp/unityhub_trace_20260306_082309.run.log:6`

## Established Connection Sampling (2026-03-06)

### A) Method
- Command:
  - `/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_sample_connections.sh 60 5`
- This helper launches Unity Hub and samples:
  - `ss -tpn state established`
  - `lsof -a -iTCP -sTCP:ESTABLISHED -c unityhub`

### B) Result
- `ss` and `lsof` agreed on the same two sustained `443` connections for the full 60-second window:
  - `35.81.139.44:443` (`ec2-35-81-139-44.us-west-2.compute.amazonaws.com`)
  - `34.160.81.0:443` (`0.81.160.34.bc.googleusercontent.com`)
- Repeated samples:
  - `/tmp/unityhub_connections_20260306_085454.ss.log`
  - `/tmp/unityhub_connections_20260306_085454.lsof.log`
- Example `ss` lines:
  - `/tmp/unityhub_connections_20260306_085454.ss.log:2`
  - `/tmp/unityhub_connections_20260306_085454.ss.log:3`
- The run log showed only the recurring shared-image startup errors and no fatal line:
  - `/tmp/unityhub_connections_20260306_085454.run.log:2`
  - `/tmp/unityhub_connections_20260306_085454.run.log:3`

### C) Interpretation
- `strace` shows many outbound attempts across Unity, analytics, and feedback endpoints.
- `ss/lsof` adds that at least two HTTPS sessions remain established over time.
- Based on the IP ownership and earlier `strace` results, these sustained sessions are consistent with long-lived Unity/analytics connection pools.
- This last point is an inference from combined evidence, not a direct domain-to-socket attribution.

## Startup Log Correlation (2026-03-06)

### A) Fresh wrapper run
- Command:
  - `timeout 20s /home/autoware/bin/unityhub`
- Fresh stderr capture:
  - `/tmp/unityhub_ordering_20260306_090346.log`
- Observed stderr in that run:
  - `APPIMAGE env is not defined, current application is not an AppImage`
  - recurring shared-image creation errors
- Not observed in that run:
  - no `No handler registered for ...` lines

### B) Main-process log sequence
- Same startup window is visible in:
  - `~/.config/unityhub/logs/info-log.json`
- The main process completed its normal service initialization sequence:
  - bootstrap at `2026-03-06T00:03:47.806Z`
  - licensing client launched and connected by `2026-03-06T00:03:50.716Z`
  - `HubIPCService` initialized at `2026-03-06T00:03:51.016Z`
  - renderer startup-queue events were delivered at `2026-03-06T00:03:52.048Z`

### C) Interpretation
- The earlier `No handler registered for ...` stderr lines are not currently reproducible.
- Current evidence does not support a persistent `ipcMain.handle(...)` registration failure.
- The more likely explanation is a transient startup race or an earlier state-specific condition.
- This point is an inference from comparing the fresh stderr capture with the main-process initialization log.

## Persistent Local Warnings

### A) Settings and preference warnings
- `ProjectsPreferencesService` and `ProfileService` repeatedly log:
  - `Malformed skip remove confirmation setting object. Received: {}`
  - `Malformed skip install in progress warning setting object. Received: {}`
  - `Malformed skip sign out confirmation setting object. Received: {}`
- The generic settings file is currently:
  - `~/.config/unityhub/Settings` -> `{}`
- The per-key storage directory is currently empty:
  - `~/.config/unityhub/storage/`
- The services use `electron-json-storage` via `jsonStoragePromisified`, so these warnings are consistent with unset preference keys resolving to empty objects rather than typed payloads.

### B) Editor preference warning
- Repeated non-fatal warning:
  - missing `/home/autoware/.local/share/unity3d/prefs`
- Follow-on stack trace:
  - `EditorPrefLinux._buildPrefsData (...) Cannot read properties of undefined (reading 'major')`
- This is logged from `LocalProject` during recent-project refresh and does not stop Hub startup.

### C) Other recurring warnings
- `LicensingSDK is accessed but has not been initialized yet!`
  - appears once early during startup, before licensing initialization completes
  - startup still proceeds normally afterward
- `SystemInfo` logs `Unknown OS` twice even though the same startup logs the host correctly as Linux.
  - This suggests a narrower platform-detection path is failing while the broader system-info path succeeds.

## Local State Normalization (2026-03-06 09:41 JST)

### A) Root cause of the malformed preference warnings
- Extracting `build/main/app.js` from `app.asar` shows that Unity Hub calls:
  - `electron-json-storage.setDataPath(app.getPath('userData'))`
- This means the per-key preference files are read from the userData directory root, not from the default `storage/` subdirectory.
- A confirming `strace` run showed direct opens against:
  - `/home/autoware/.config/unityhub/skipRemoveConfirmation.json`
  - `/home/autoware/.config/unityhub/skipInstallInProgressWarning.json`
  - `/home/autoware/.config/unityhub/skipSignOutConfirmation.json`
  - `/home/autoware/.config/unityhub/projectOrganizationSetting.json`
- Evidence:
  - `/tmp/unityhub_storage_path_20260306_094050.log`

### B) Normalization action
- Added a local helper script:
  - `scripts/unityhub_normalize_state.sh`
- The script now:
  - creates or migrates the four per-key JSON files into `~/.config/unityhub/`
  - preserves the existing `Settings` file used by `electron-settings`
  - ensures `/home/autoware/.local/share/unity3d/prefs` exists with minimal XML root attributes so `EditorPrefLinux` can parse version metadata

### C) Verification after normalization
- Verification command:
  - `timeout 25s /home/autoware/bin/unityhub`
- Fresh stderr capture:
  - `/tmp/unityhub_post_root_normalize_20260306_094150.log`
- In that run, stderr only showed:
  - `APPIMAGE env is not defined, current application is not an AppImage`
  - recurring shared-image creation errors
- The new main-process log window no longer contains:
  - `Malformed skip remove confirmation setting object. Received: {}`
  - `Malformed skip install in progress warning setting object. Received: {}`
  - `Malformed skip sign out confirmation setting object. Received: {}`
  - `EditorPrefLinux` ENOENT warnings for `/home/autoware/.local/share/unity3d/prefs`
  - `LocalProject` `prefsData.version.major` stack traces
- The remaining warnings in the new startup window are:
  - `LicensingSDK is accessed but has not been initialized yet!`
  - `SystemInfo` -> `Unknown OS` (twice)
- Evidence:
  - `/tmp/unityhub_post_root_normalize_20260306_094150.log`
  - `~/.config/unityhub/logs/info-log.json` lines 1711-1817

### D) Interpretation
- The earlier malformed setting errors were caused by writing valid JSON payloads to the wrong directory.
- The `EditorPrefLinux` warning was a local state issue and is now resolved by providing a minimal prefs file.
- `Unknown OS` remains and appears to be an implementation limitation in Unity Hub's Linux path, not a local configuration defect.

## Scenario-Specific Navigation Captures (2026-03-06 10:11 JST)

### A) Capture method
- Added reusable local helpers:
  - `scripts/unityhub_cdp_control.js`
  - `scripts/unityhub_trace_scenario.sh`
- The navigation scenarios use a temporary `services-config.json` with:
  - `hubDisableSignin: true`
  - `hubDisableSignInRequired: true`
- This reproduces Unity Hub's own `bypassSignin` test strategy and exposes the signed-out navigation UI without a manual login flow.
- The DevTools target list also includes a YouTube `webview`, so the main renderer target must be selected by the `file:///.../build/renderer/index.html` URL rather than by list position.
- The scenario helper now waits for the DevTools endpoint to become ready before dispatching CDP actions, which avoids early-startup race failures.

### B) Startup baseline with sign-in bypass
- Scenario:
  - `startup_bypass`
- DOM state:
  - signed-out navigation visible: `Projects`, `Installs`, `Learn`, `Community`, `Downloads`
  - main content defaults to the `Installs` page content even though the URL is still `#!projects`
- Evidence:
  - `/tmp/unityhub_startup_bypass_20260306_100947.dom.jsonl`
  - `/tmp/unityhub_startup_bypass_20260306_100947.summary.log`
- Baseline traffic is still dominated by:
  - embedded YouTube promotional video
  - `api2.amplitude.com`
  - `cdn.wootric.com`
  - `cloud.unity.com`

### C) Learn navigation
- Scenario:
  - `learn_nav`
- UI action:
  - dismiss `Got it`
  - click `navigation-learn`
- DOM result:
  - page content switches to Learn items such as `3D Beginner Game: Roll-a-Ball`, `Create with Code`, and `Get started with Unity DevOps`
  - URL still remains `#!projects`, so the visible content change is driven by internal application state rather than a hash change
- New route-specific network evidence:
  - repeated asset fetches from `unity-connect-prd.storage.googleapis.com/.../learn/...`
- Additional runtime evidence:
  - main process logged `Error occurred in handler for 'learn/getRecommended'`
- Evidence:
  - `/tmp/unityhub_learn_nav_20260306_101012.dom.jsonl`
  - `/tmp/unityhub_learn_nav_20260306_101012.summary.log`
  - `/tmp/unityhub_learn_nav_20260306_101012.run.log`

### D) Community navigation
- Scenario:
  - `community_nav`
- UI action:
  - dismiss `Got it`
  - click `navigation-community`
- DOM result:
  - page content switches to Community resources such as `Unity Elevate`, `Discussions`, `Unity AI`, `Unity Blog`, and `Unity Pulse`
- New route-specific network evidence:
  - direct Unity web URLs such as:
    - `https://unity.com/learn/elevate`
    - `https://unity.com/products/ai`
    - `https://unity.com/unity-pulse`
  - static resource fetches from:
    - `https://storage.googleapis.com/live-platform-resources-prd/templates/assets/...`
- Evidence:
  - `/tmp/unityhub_community_nav_20260306_101038.dom.jsonl`
  - `/tmp/unityhub_community_nav_20260306_101038.summary.log`

### E) Sign-in behavior
- Scenario:
  - `signin_open`
- UI / IPC action:
  - renderer invokes `redirect/openSignIn`
- Observed behavior:
  - Unity Hub remains on the welcome page
  - no additional Unity Hub DevTools page target appears
  - an external browser window appears instead:
    - `Unity ID Account Login | Sign in - Google Chrome`
- Network evidence inside the Hub process:
  - the authorize URL is constructed in-process:
    - `https://api.unity.com/v1/oauth2/authorize?...redirect_uri=unityhub://login`
  - after that, the actual sign-in experience is delegated to the existing browser session
- Evidence:
  - `/tmp/unityhub_signin_open_20260306_101118.dom.jsonl`
  - `/tmp/unityhub_signin_open_20260306_101118.wmctrl.log`
  - `/tmp/unityhub_signin_open_20260306_101118.summary.log`
  - `/tmp/unityhub_signin_open_20260306_101118.run.log`

### F) Install Editor dialog
- Scenario:
  - `install_editor_open`
- UI action:
  - dismiss `Got it`
  - click `install-editor`
- DOM result:
  - Hub opens the install catalog with `Official releases`, `Pre-releases`, and `Archive`
  - visible versions include `Unity 6.3 LTS (6000.3.10f1)` and `Unity 2022.3 LTS (2022.3.62f3)`
- Network evidence:
  - no major new service family beyond the startup baseline was observed
  - the clearest new URL was:
    - `https://unity3d.com/beta/`
- Interpretation:
  - the install catalog appears to rely mostly on data already prefetched during startup, so opening the dialog itself does not significantly broaden Hub's network footprint
- Evidence:
  - `/tmp/unityhub_install_editor_open_20260306_110958.dom.jsonl`
  - `/tmp/unityhub_install_editor_open_20260306_110958.summary.log`

### G) Preferences > Licenses
- Scenario:
  - `licenses_preferences`
- UI action:
  - open `account-button`
  - click `profile-manage-licenses-menu`
- DOM result:
  - Hub opens `Preferences` on the `Licenses` tab
  - visible actions are `Get help`, `Refresh`, and `Add`
  - the page also shows `No licenses, yet`
- Network evidence:
  - no separate licensing web flow was opened in this step
  - the clearest route-specific URL was:
    - `https://support.unity.com/hc/en-us/categories/201268913-Licenses`
- Interpretation:
  - opening the Licenses preferences panel is mostly a local UI transition plus support/help affordances, not a high-volume network event by itself
- Evidence:
  - `/tmp/unityhub_licenses_preferences_20260306_111024.dom.jsonl`
  - `/tmp/unityhub_licenses_preferences_20260306_111024.summary.log`

### H) Install Editor -> module selector
- Scenario:
  - `install_editor_modules`
- UI action:
  - dismiss `Got it`
  - click `install-editor`
  - click `install-editor-button-6000.3.10f1-x86_64`
- DOM result:
  - Hub opens the `Add modules` selector for `Unity 6.3 LTS (6000.3.10f1)`
  - visible module entries include `Android Build Support`, `OpenJDK`, `Android SDK & NDK Tools`, `iOS Build Support`, `visionOS Build Support`, `Linux Build Support (IL2CPP)`, `Web Build Support`, and multiple Windows / Mac / server targets
- New route-specific network evidence:
  - concrete package URLs appear at this step, including:
    - `https://download.unity3d.com/download_unity/e35f0c77bd8e/MacEditorTargetInstaller/UnitySetup-Android-Support-for-Editor-6000.3.10f1.pkg`
    - `https://dl.google.com/android/repository/build-tools_r36_linux.zip`
  - `https://unity3d.com/beta/` also remains visible
- Interpretation:
  - this is the first install-related step where Hub exposes concrete payload URLs rather than only catalog metadata
  - the captured URLs include cross-platform package metadata, so the release manifest visible in the selector is not filtered strictly to the local OS
- Evidence:
  - `/tmp/unityhub_install_editor_modules_20260306_112237.dom.jsonl`
  - `/tmp/unityhub_install_editor_modules_20260306_112237.summary.log`

### I) Licenses -> Add new license modal
- Scenario:
  - `license_add_modal`
- UI action:
  - open `account-button`
  - click `profile-manage-licenses-menu`
  - click `preference-license-add`
- DOM result:
  - Hub opens the `Add new license` modal
  - visible actions include:
    - `Activate with serial number`
    - `Activate with license request`
    - `Get a free personal license`
    - `Get a plan for your team`
    - `Get a Unity Student license`
    - `FAQ`
- New route-specific network evidence:
  - help / sales URLs appear in this step, including:
    - `https://docs.unity3d.com/hub/manual/ManageLicense.html`
    - `https://unity3d.com/unity/faq`
    - `https://unity.com/pricing?utm_medium=desktop-app&utm_source=unity-hub`
    - `https://store.unity.com/academic/unity-student`
    - `https://support.unity.com/hc/en-us/categories/201268913-Licenses`
- Interpretation:
  - the modal is primarily a launcher for activation, support, and purchase paths
  - no heavy licensing transaction is initiated merely by opening the modal
- Evidence:
  - `/tmp/unityhub_license_add_modal_20260306_112152.dom.jsonl`
  - `/tmp/unityhub_license_add_modal_20260306_112152.summary.log`

### J) Interpretation
- `Learn` and `Community` introduce materially different network destinations beyond the startup baseline.
- `Learn` is primarily associated with Unity Learn content and storage-backed image assets.
- `Community` is primarily associated with direct Unity web properties and `live-platform-resources-prd` static assets.
- `Sign in` is not an in-Hub web flow on this system; Hub prepares the authorize URL and hands the session off to an external Chrome window.
- `Install Editor` and `Preferences > Licenses` are comparatively light network transitions because much of their backing state appears to be available already at startup.
- `Install Editor -> Add modules` is the first step that exposes concrete download payload URLs and dependency artifacts.
- `Licenses -> Add new license` is still a lightweight launcher / help surface rather than an activation transaction.

## Deeper Activation and Download Flows (2026-03-06 11:37 JST)

### A) Install Editor -> download start and cancel
- Scenario:
  - `install_download_start`
- UI action:
  - dismiss `Got it`
  - click `install-editor`
  - click `install-editor-button-6000.3.10f1-x86_64`
  - click `installButton`
  - click the download cancel icon
  - confirm `Cancel download`
- DOM result:
  - Hub immediately opens the `Downloads` drawer and starts transferring the editor payload
  - the captured in-flight state shows:
    - `Unity 6.3 LTS (6000.3.10f1)`
    - `Editor application`
    - `Downloading (1%) 36.16 MB/s...`
  - after the cancel confirmation, the drawer returns to:
    - `No downloads, yet`
- New route-specific network evidence:
  - the Linux editor payload appears directly:
    - `https://download.unity3d.com/download_unity/e35f0c77bd8e/LinuxEditorInstaller/Unity-6000.3.10f1.tar.xz`
  - auxiliary tool payloads also appear in the same trace:
    - `https://dl.google.com/android/repository/cmake-3.22.1-linux.zip`
    - `https://dl.google.com/android/repository/build-tools_r36_linux.zip`
  - cross-platform package metadata remains visible as well:
    - `https://download.unity3d.com/download_unity/e35f0c77bd8e/MacEditorTargetInstaller/UnitySetup-Android-Support-for-Editor-6000.3.10f1.pkg`
- Interpretation:
  - `installButton` starts the real editor download immediately; no extra confirmation step was observed before network transfer begins
  - once the download starts, Hub also resolves additional dependency payloads beyond the main Linux editor archive
- Evidence:
  - `/tmp/unityhub_install_download_start_20260306_113723.dom.jsonl`
  - `/tmp/unityhub_install_download_start_20260306_113723.summary.log`

### B) License request activation flow
- Scenario:
  - `license_request_flow`
- UI action:
  - open `account-button`
  - click `profile-manage-licenses-menu`
  - click `preference-license-add`
  - click `activate-with-license-request-file-button`
- DOM result:
  - Hub expands the `How to activate an existing license` workflow
  - the workflow is explicitly split into:
    - `Create license request`
    - `license.unity3d.com/manual`
    - `Activate with license file`
  - the file input `activate-license-file` is present and the final `Activate` button remains disabled
  - in this captured state, `Activate with license request` is the only enabled activation path; `Activate with serial number` and `Get a free personal license` remain disabled
- New route-specific network evidence:
  - the main route-specific URL for this flow is:
    - `https://license.unity3d.com/manual`
- Interpretation:
  - request-file activation is a hybrid workflow: local file generation inside Hub, then browser-based upload to Unity's activation portal, then local file import back into Hub
- Evidence:
  - `/tmp/unityhub_license_request_flow_20260306_113509.dom.jsonl`
  - `/tmp/unityhub_license_request_flow_20260306_113509.summary.log`

### C) License request -> local save dialog
- Scenario:
  - `license_request_create_dialog`
- UI action:
  - follow the request-file flow
  - click `Create license request`
- Observed behavior:
  - a native save dialog appears instead of an in-Hub web view or external browser window
  - the observed window title is:
    - `Save license information for offline activation.`
  - the Hub renderer stays on the same request-flow stepper while the native dialog is open
- Interpretation:
  - `Create license request` is a local export step, not a network-heavy or browser-delegated action
- Evidence:
  - `/tmp/unityhub_license_request_create_dialog_20260306_113541.dom.jsonl`
  - `/tmp/unityhub_license_request_create_dialog_20260306_113541.wmctrl.log`
  - `/tmp/unityhub_license_request_create_dialog_20260306_113541.summary.log`

### D) License request -> activation portal open
- Scenario:
  - `license_request_portal_open`
- UI action:
  - follow the request-file flow
  - click `upload-license-request-file-link`
- Observed behavior:
  - Hub keeps the local request-flow UI visible
  - the actual upload step opens in an external Chrome window titled:
    - `Unity - Activation - Google Chrome`
- New route-specific network evidence:
  - the activation portal URL is repeatedly visible in the trace:
    - `https://license.unity3d.com/manual`
- Interpretation:
  - the upload/generate step is browser-delegated, mirroring the sign-in flow pattern already observed elsewhere in Hub
- Evidence:
  - `/tmp/unityhub_license_request_portal_open_20260306_113617.dom.jsonl`
  - `/tmp/unityhub_license_request_portal_open_20260306_113617.wmctrl.log`
  - `/tmp/unityhub_license_request_portal_open_20260306_113617.summary.log`

### E) License request -> license file picker
- Scenario:
  - `license_file_picker_open`
- UI action:
  - follow the request-file flow
  - click `activate-license-file`
- Observed behavior:
  - a native open-file dialog appears with the window title:
    - `Activate with license file`
  - the Hub renderer remains on the same request-flow stepper, and the final `Activate` button stays disabled until a file is selected
- Interpretation:
  - the returned activation file is imported via a local file picker rather than through an embedded browser flow
- Evidence:
  - `/tmp/unityhub_license_file_picker_open_20260306_114439.dom.jsonl`
  - `/tmp/unityhub_license_file_picker_open_20260306_114439.wmctrl.log`
  - `/tmp/unityhub_license_file_picker_open_20260306_114439.summary.log`

### F) Bundled UI gating
- Local bundle inspection of `/home/autoware/.local/opt/unityhub/resources/app.asar` indicates:
  - `Activate with serial number` is disabled when `selectUserInfo` is absent or license refresh is in progress
  - `Get a free personal license` is likewise gated on authenticated `userInfo` and hidden entirely when personal activation is disallowed or floating licensing is enabled
  - `Activate with license request` is the only activation path in this modal that remains available without authenticated `userInfo`
  - the `License file` control triggers `chooseLicenseFilePath()`, confirming that step 3 is a native file-picker flow
- Practical implication:
  - the signed-out UI state captured in this workspace is expected behavior, not a transient rendering glitch
- Evidence:
  - [unityhub_bundle_findings_20260306.md](/media/autoware/aa/ai_coding_ws/gaming_ws/unityhub_bundle_findings_20260306.md)

### G) Direct IPC negative-path activation
- Scenarios:
  - `license_activate_invalid_serial`
  - `license_activate_invalid_file`
  - `license_activate_invalid_file_direct`
- UI action:
  - open `account-button`
  - click `profile-manage-licenses-menu`
  - click `preference-license-add`
  - invoke the licensing IPC channel directly from the renderer instead of using the disabled UI buttons
- Observed behavior:
  - direct serial activation with `AAAA-BBBB-CCCC-DDDD` returns a resolved error code:
    - `ERROR_LICENSE_SERIAL_ACTIVATION_GENERIC`
  - direct file activation with `/tmp/fake_unity_activation.ulf` throws a remote-method error:
    - `ERROR.LICENSE.SERVER.GENERIC`
  - the main-process log for the invalid file case reports:
    - `Error occurred in handler for 'licenses/activateLicenseWithFile'`
  - `strace` captures the local licensing boundary for both calls:
    - `{"messageType":"ULFActivationRequest","serial":"AAAA-BBBB-CCCC-DDDD","id":"14"}`
    - `{"messageType":"LicenseImportRequest","licensePath":"/tmp/fake_unity_activation.ulf","id":"14"}`
- Network evidence:
  - the isolated invalid-file run (`license_activate_invalid_file_direct`) does not surface `license.unity3d.com/manual` or any new route-specific Unity activation URL in `top_urls`
  - the direct serial run likewise does not add a new route-specific activation URL in `top_urls`
  - the request-flow-backed invalid-file run still shows `https://license.unity3d.com/manual`, but that URL is already part of the request-file UI route and is not sufficient to attribute to the failed import attempt itself
- Interpretation:
  - the disabled `serial` / `personal` UI is renderer-side gating; direct IPC invocation still reaches the main-process licensing service
  - both negative-path activations cross a local licensing-service boundary and fail quickly with generic activation errors
  - in these traces, the failed direct activation attempts did not reveal a new plaintext Unity activation endpoint beyond URLs already introduced by the surrounding UI state
- Evidence:
  - `/tmp/unityhub_license_activate_invalid_serial_20260306_123324.dom.jsonl`
  - `/tmp/unityhub_license_activate_invalid_serial_20260306_123324.summary.log`
  - `/tmp/unityhub_license_activate_invalid_file_20260306_123254.dom.jsonl`
  - `/tmp/unityhub_license_activate_invalid_file_20260306_123254.run.log`
  - `/tmp/unityhub_license_activate_invalid_file_20260306_123254.summary.log`
  - `/tmp/unityhub_license_activate_invalid_file_direct_20260306_123501.dom.jsonl`
  - `/tmp/unityhub_license_activate_invalid_file_direct_20260306_123501.run.log`
  - `/tmp/unityhub_license_activate_invalid_file_direct_20260306_123501.summary.log`

### H) Source and CLI inspection
- Source inspection:
  - `loadLicense(fileName)` calls `importLicense(fileName)` on the licensing SDK and collapses all failures to `LicenseError.Generic`
  - `saveLicenseRequest()` calls `generateUnityAlf(selectedFilePath)`
  - `activateLicense(serialNumber)` calls `activateUlfLicense(serial.trim())`
  - `matchIdlPeWithUlfPe()` in `licenseServiceCore` can call `activateUlfLicense()` with no serial when an assigned Personal entitlement exists but no valid ULF is present
  - `LicensingSdk.init()` spawns the bundled client binary:
    - `/home/autoware/.local/opt/unityhub/UnityLicensingClient_V1/Unity.Licensing.Client`
- Error-mapping implication:
  - serial activation only preserves a few specific response codes:
    - `20111` maximum activation limit
    - `20110` invalid serial
    - `20100` serial does not belong to user
    - `20113` serial expired
    - `20128` Personal Edition restricted
  - file import does not preserve those distinctions in Hub; the JS layer turns any failed `importLicense()` response into a generic error
- Standalone licensing-client CLI findings:
  - `Unity.Licensing.Client --help` exposes direct commands including:
    - `--activate-ulf`
    - `--generate-alf-request`
    - `--showEntitlements`
    - `--showRemoteEntitlements`
    - `--activate-all`
  - direct CLI `--activate-ulf --serial AAAA-BBBB-CCCC-DDDD` without token exits early with:
    - `Usage: --activate-ulf should be used with --accessToken or --username and --password`
  - even in that early-fail path, the client still posts analytics to:
    - `https://cdp.cloud.unity3d.com/v1/events`
  - `--showContext` succeeds locally and prints 13 machine context values before posting the same analytics event
- Interpretation:
  - Hub-side generic activation failures are partly caused by JS-side error collapsing, especially for license-file import
  - the standalone CLI has stricter visible prerequisites than the Hub IPC path, so Hub is likely injecting session state or using a different activation path inside the SDK/client boundary
  - `cdp.cloud.unity3d.com` is confirmed as a direct endpoint of the bundled licensing client itself, not only of Hub renderer analytics
- Evidence:
  - `/tmp/unityhub_asar_extract2/licenseService.js`
  - `/tmp/unityhub_asar_extract2/licenseServiceCore.js`
  - `/tmp/unityhub_asar_extract2/licensingSdk.js`
  - `/tmp/unity_licensing_client_activate_ulf_invalid_20260306.log`
  - `/tmp/unity_licensing_client_activate_ulf_invalid_20260306.strace.log`
  - `/tmp/unity_licensing_client_show_context_20260306.log`

### I) Pre-login machine state and auth boundary snapshot
- Local machine state before the later manual browser sign-in:
  - `~/.config/unityhub/hubConfig.json` contained:
    - `"hubDisableSignin": true`
    - `"hubDisableSignInRequired": true`
  - `~/.config/unityhub/Cookies` contains only YouTube-related cookies in this capture set; no Unity auth cookies were found
  - no Unity access-token or refresh-token files were found under:
    - `~/.config/unityhub`
    - `~/.config/unity3d`
    - `~/.local/share/unity3d`
- Standalone licensing-client state:
  - `--showEntitlements` reports:
    - `No licenses were found.`
  - `--showAllEntitlements` also reports:
    - `No licenses were found.`
  - the client logs show it scans these local license locations:
    - `/home/autoware/.local/share/unity3d/Unity/*.ulf`
    - `/home/autoware/.local/share/unity3d/Unity/licenses/*.xml`
    - `/home/autoware/.config/unity3d/Unity/licenses/*.xml`
  - in this environment, the first two locations do not exist and no valid local license files are found
  - `--showRemoteEntitlements` exits with:
    - `Floating license server is not configured`
- Interpretation for this pre-login snapshot:
  - this workspace was in a forced signed-out / offline-leaning Hub state rather than a latent signed-in state with hidden credentials
  - success-path activation or remote-entitlement capture is blocked here by missing auth state and missing floating-license configuration, not by a tracing limitation
  - the remaining reproducible behaviors on this machine are therefore:
    - local license discovery
    - offline request-file generation/import paths
    - analytics emission from the licensing client
- Evidence:
  - `~/.config/unityhub/hubConfig.json`
  - `~/.config/unityhub/Cookies`
  - `/tmp/unity_licensing_client_show_entitlements_20260306.log`
  - `/tmp/unity_licensing_client_show_all_entitlements_20260306.log`
  - `/tmp/unity_licensing_client_show_remote_entitlements_20260306.log`

### J) Interpretation
- `Activate with license request` is the first licensing path observed here that progresses beyond a launcher surface.
- The request-file workflow cleanly separates into:
  - local file export inside Hub
  - external browser upload on `license.unity3d.com/manual`
  - local license file import back into Hub
- `Activate with serial number` and `Get a free personal license` are intentionally gated behind authenticated user state in this signed-out capture path.
- Direct IPC tests show that this gating is implemented in the renderer/UI layer; the main-process licensing handlers still exist and respond with generic activation failures when called directly.
- Failed direct activation attempts reveal local licensing request types (`ULFActivationRequest` and `LicenseImportRequest`) but did not expose new route-specific Unity activation URLs in the isolated traces.
- Source inspection shows that Hub itself collapses many licensing SDK failures into generic UI errors, so the renderer-visible result is less specific than the underlying licensing client behavior.
- Standalone licensing-client tests confirm that the client itself emits analytics directly to `cdp.cloud.unity3d.com/v1/events`.
- `Install Editor -> Add modules` reveals candidate payload URLs, but `Install Editor -> download start` is the first step that confirms the concrete Linux editor archive is actually requested.

### K) Signed-In Delta After Browser Login (2026-03-06)
- At 2026-03-06 13:50 JST, browser sign-in completed and returned to Hub via a `unityhub://login/?code=...` callback.
- Post-login local state changed materially:
  - `~/.config/unity3d/Unity/licenses/UnityEntitlementLicense.xml` appeared and was parsed successfully by `Unity.Licensing.Client`
  - `--showAllEntitlements` now reports:
    - `Asset Store`, `License Type: Assigned`, `Status: Valid`
    - `Unity Personal`, `License Type: Assigned`, `Status: DuplicateEntitlementGroup`
  - the XML itself contains:
    - two `Unity Personal` entitlement groups for user `20066147017760`
    - one `Asset Store` entitlement group (`organization-all-asset-store-upm-packages`)
- Hub renderer state also changed from signed-out to signed-in:
  - root nav switched to `navigation-signed-in`
  - account button text became `佐`
  - `profile-sign-out-menu` is present
- In `Preferences > Licenses`, Hub still shows the shell warning:
  - `No active licenses To create and open projects, you need an active license.`
  but the preferences pane now lists:
  - `Asset Store`
  - `Return license` (disabled)
- The add-license modal is meaningfully different in the signed-in state:
  - `Activate with serial number` is enabled
  - `Activate with license request` is enabled
  - `Get a free personal license` is enabled
  - `Get a plan for your team` / `Get a Unity Student license` are still external link paths
- `Activate with serial number` now opens a real signed-in form surface:
  - `license-serial-number-input`
  - `Activate license` button, initially disabled until a key is entered
  - supporting links: `Go to Unity Store`, `Help`, `FAQ`
- `Get a free personal license` no longer stays disabled; it advances to an explicit eligibility / terms gate:
  - title: `Get Unity Personal`
  - body references `Editor Software Terms`
  - terminal button: `Agree and get personal edition license`
- That final personal-license button was intentionally not pressed in this trace because it is the explicit terms-acceptance step.
- No `.ulf` active license file was created during the signed-in capture set; after the run, the license directory still contained only:
  - `UnityEntitlementLicense.xml`
  - `packages/packageAccessControlList.xml`
  - `packages/packageAccessControlList.etag`
- The entitlement XML did refresh during the signed-in capture window:
  - earlier update date observed: `2026-04-05 13:50:33 (Local)`
  - after the personal-license path was opened: `2026-04-05 13:58:48 (Local)`
- Signed-in licensing surfaces add a few new URL families compared with signed-out traces:
  - `https://unity.com/legal/editor-terms-of-service/software`
  - `https://unity3d.com/unity/faq`
  - `https://store.unity.com/academic/unity-student`
  - `https://support.unity.com/hc/en-us/categories/201268913-Licenses`
- Evidence:
  - `/tmp/unity_licensing_client_show_all_entitlements_after_login_20260306.log`
  - `/home/autoware/.config/unity3d/Unity/licenses/UnityEntitlementLicense.xml`
  - `/tmp/unityhub_licenses_preferences_signedin_20260306_135603.dom.jsonl`
  - `/tmp/unityhub_license_add_modal_signedin_20260306_135656.dom.jsonl`
  - `/tmp/unityhub_license_serial_open_signedin_20260306_135806.dom.jsonl`
  - `/tmp/unityhub_license_personal_activate_signedin_20260306_135843.dom.jsonl`
  - `/tmp/unity_licensing_client_show_entitlements_after_personal_activate_20260306.log`

## Reproduction Command
- Note: extracted `AppRun` has an argument-handling bug when options are passed directly, so use binary direct path.

```bash
APPDIR=/home/autoware/.local/opt/unityhub
timeout 40s strace -ff -tt -s 512 -e trace=network \
  -o /tmp/unityhub_strace_manual.log \
  env APPDIR="$APPDIR" \
      PATH="$APPDIR:$APPDIR/usr/sbin:$PATH" \
      XDG_DATA_DIRS="$APPDIR/usr/share/:${XDG_DATA_DIRS:-}" \
      LD_LIBRARY_PATH="$APPDIR/usr/lib:${LD_LIBRARY_PATH:-}" \
      GSETTINGS_SCHEMA_DIR="$APPDIR/usr/share/glib-2.0/schemas:${GSETTINGS_SCHEMA_DIR:-}" \
      LIBGL_ALWAYS_SOFTWARE=1 \
      "$APPDIR/unityhub" > /tmp/unityhub_run_manual.log 2>&1
```

### Stable GPU Capture Variant
```bash
APPDIR=/home/autoware/.local/opt/unityhub
timeout 90s strace -ff -tt -s 512 -e trace=network \
  -o /tmp/unityhub_gpu_stable_strace.log \
  env APPDIR="$APPDIR" \
      PATH="$APPDIR:$APPDIR/usr/sbin:$PATH" \
      XDG_DATA_DIRS="$APPDIR/usr/share/:${XDG_DATA_DIRS:-}" \
      LD_LIBRARY_PATH="$APPDIR/usr/lib:${LD_LIBRARY_PATH:-}" \
      GSETTINGS_SCHEMA_DIR="$APPDIR/usr/share/glib-2.0/schemas:${GSETTINGS_SCHEMA_DIR:-}" \
      "$APPDIR/unityhub" --disable-gpu-sandbox --ignore-gpu-blocklist \
      > /tmp/unityhub_gpu_stable_run.log 2>&1
```

### Wrapper-Based Variant
```bash
timeout 180s /media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_network.sh 180
```

### Established Connection Variant
```bash
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_sample_connections.sh 60 5
```

### Licensing Client Variant
```bash
/home/autoware/.local/opt/unityhub/UnityLicensingClient_V1/Unity.Licensing.Client --help
/home/autoware/.local/opt/unityhub/UnityLicensingClient_V1/Unity.Licensing.Client --debug --showContext
/home/autoware/.local/opt/unityhub/UnityLicensingClient_V1/Unity.Licensing.Client --debug --showEntitlements
/home/autoware/.local/opt/unityhub/UnityLicensingClient_V1/Unity.Licensing.Client --debug --showAllEntitlements
/home/autoware/.local/opt/unityhub/UnityLicensingClient_V1/Unity.Licensing.Client --debug --showRemoteEntitlements
/home/autoware/.local/opt/unityhub/UnityLicensingClient_V1/Unity.Licensing.Client --debug --activate-ulf --serial AAAA-BBBB-CCCC-DDDD
```

### Scenario Variant
```bash
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh startup_bypass
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh learn_nav
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh community_nav
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh install_editor_open
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh install_editor_modules
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh install_download_start
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh licenses_preferences
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh license_add_modal
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh license_request_flow
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh license_request_create_dialog
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh license_request_portal_open
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh license_file_picker_open
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh license_activate_invalid_file
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh license_activate_invalid_file_direct
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh license_activate_invalid_serial
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh signin_open
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh licenses_preferences_signedin
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh license_add_modal_signedin
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh license_serial_open_signedin
/media/autoware/aa/ai_coding_ws/gaming_ws/scripts/unityhub_trace_scenario.sh license_personal_activate_signedin
```

## Notes
- This method shows destinations and some plaintext metadata (DNS names, TLS SNI, some URLs), but not decrypted HTTPS contents.
