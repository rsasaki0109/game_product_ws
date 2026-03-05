# Unity Hub Bundle Findings (2026-03-06)

## Scope
- Source bundle inspected:
  - `/home/autoware/.local/opt/unityhub/resources/app.asar`
- Extraction method:
  - `strings -n 8 /home/autoware/.local/opt/unityhub/resources/app.asar | rg ...`

## Findings

### Add New License gating
- The bundled `add-new-license` UI component reads:
  - `selectUserInfo`
  - `selectIsPersonalLicenseDisabled`
  - `selectIsFloatingEnabled`
  - a refresh flag from the license slice
- Derived behavior from the bundled logic:
  - `Activate with serial number` is disabled when there is no `userInfo` or while refresh is in progress.
  - `Get a free personal license` is only shown when personal-license activation is allowed and floating licensing is not enabled, and it is also disabled when there is no `userInfo` or while refresh is in progress.
  - `Activate with license request` is disabled only while refresh is in progress.
- Practical implication:
  - In the signed-out state captured in this workspace, `serial` and `personal` are disabled because there is no authenticated `userInfo`, while request-file activation remains available as the offline path.

### Serial activation modal
- The bundled `activate-serial-license` modal uses `selectUserInfo`.
- Derived behavior from the bundled logic:
  - the final `Activate license` button is disabled unless:
    - a serial has been entered
    - there is authenticated `userInfo`
    - no validation error is present
    - activation is not already in progress
- The bundled UI also references the tooltip string:
  - `SIGN_IN_TO_ACTIVATE`

### Request-file activation modal
- The bundled `activate-license-request` modal uses:
  - `saveLicenseRequest()` for `Create license request`
  - `chooseLicenseFilePath()` for the `License file` selector
  - `activateLicenseWithFile(path)` for the final `Activate`
- Practical implication:
  - the request-file workflow is intentionally split into:
    - local request export
    - external upload on the Unity activation portal
    - local file selection for the returned activation file

### File picker behavior
- The bundle exports:
  - `licenses/chooseLicenseFilePath`
  - `common/showOpenFileDialog`
- The observed runtime behavior in this workspace matches that split:
  - `Create license request` opens a native save dialog.
  - `License file` opens a native open-file dialog.

### Direct IPC implication
- Runtime direct-invoke tests confirm that the renderer can still call:
  - `licenses/activateLicense`
  - `licenses/activateLicenseWithFile`
- Observed results in this workspace:
  - fake serial returns:
    - `ERROR_LICENSE_SERIAL_ACTIVATION_GENERIC`
  - fake `.ulf` import throws:
    - `ERROR.LICENSE.SERVER.GENERIC`
- Practical implication:
  - the signed-out disabled state for `serial` and `personal` is UI-layer gating, not absence of the underlying main-process handlers
  - direct calls still reach the licensing backend, but invalid inputs fail immediately
