$ErrorActionPreference = "Stop"

$version = "version-d0e8cfcd943d4ae2"
$destDir = Join-Path $env:LOCALAPPDATA ("Roblox\\Versions\\" + $version)
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

$manifestUrl = "https://setup.rbxcdn.com/$version-rbxPkgManifest.txt"
$manifest = curl.exe -s $manifestUrl
$lines = $manifest -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne "" }

if ($lines.Count -gt 0 -and $lines[0] -eq "v0") {
    $lines = $lines[1..($lines.Count - 1)]
}

for ($i = 0; $i -lt $lines.Count; $i += 4) {
    $packageName = $lines[$i]
    $tempZip = Join-Path $env:TEMP ("rbxpkg-" + $packageName)
    $packageUrl = "https://setup.rbxcdn.com/$version-$packageName"

    if (Test-Path $tempZip) {
        Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
    }

    $downloaded = $false
    for ($attempt = 1; $attempt -le 5; $attempt++) {
        Write-Output ("Downloading " + $packageName + " (attempt " + $attempt + "/5)")
        curl.exe -L $packageUrl -o $tempZip --fail | Out-Null

        if ($LASTEXITCODE -eq 0 -and (Test-Path $tempZip) -and ((Get-Item $tempZip).Length -gt 0)) {
            $downloaded = $true
            break
        }

        if (Test-Path $tempZip) {
            Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
        }
        Start-Sleep -Seconds 2
    }

    if (-not $downloaded) {
        throw ("Failed to download package: " + $packageName)
    }

    Expand-Archive -Path $tempZip -DestinationPath $destDir -Force
    Remove-Item $tempZip -Force -ErrorAction SilentlyContinue
}

$studioExe = Join-Path $destDir "RobloxStudioBeta.exe"
if (Test-Path $studioExe) {
    Write-Output ("Installed " + $studioExe)
} else {
    throw "RobloxStudioBeta.exe was not found after extraction."
}
