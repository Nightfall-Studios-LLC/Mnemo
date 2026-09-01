param(
    [Parameter(Position = 0)]
    [ValidateSet("configure", "build", "test", "run", "all")]
    [string] $Action = "build",

    [Parameter(Position = 1)]
    [ValidateSet("debug", "release")]
    [string] $Preset = "debug"
)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot

if (-not $env:MNEMO_MSYS2_ROOT) {
    $knownRoots = @("C:\msys64", (Join-Path $env:LOCALAPPDATA "Programs\msys64"))
    $detectedRoot = $knownRoots | Where-Object { Test-Path -LiteralPath (Join-Path $_ "ucrt64\bin\g++.exe") } | Select-Object -First 1
    if (-not $detectedRoot) {
        throw "MSYS2 UCRT64 was not found. Install the dependencies described in docs/development.md."
    }
    $env:MNEMO_MSYS2_ROOT = $detectedRoot
}

$toolBin = Join-Path $env:MNEMO_MSYS2_ROOT "ucrt64\bin"
$env:PATH = "$toolBin;$env:PATH"
$cmake = Join-Path $toolBin "cmake.exe"
$ctest = Join-Path $toolBin "ctest.exe"

function Invoke-Configure { & $cmake --preset $Preset }
function Invoke-Build { & $cmake --build --preset $Preset }
function Invoke-Tests { & $cmake --build --preset $Preset; & $ctest --preset $Preset }

Push-Location $projectRoot
try {
    switch ($Action) {
        "configure" { Invoke-Configure }
        "build" { Invoke-Configure; Invoke-Build }
        "test" { Invoke-Configure; Invoke-Tests }
        "run" {
            Invoke-Configure
            Invoke-Build
            & (Join-Path $projectRoot "build\$Preset\bin\Mnemo.exe")
        }
        "all" { Invoke-Configure; Invoke-Build; & $ctest --preset $Preset }
    }
} finally {
    Pop-Location
}
