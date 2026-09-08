param(
    [string]$FilePath,
    [string]$OutputPath,
    [string]$GoExecutable = "go",
    [switch]$Rebuild
)
$ErrorActionPreference = "Stop"
$repoRoot = Split-Path -Parent $PSScriptRoot
$binaryPath = Join-Path $repoRoot 'bin\route-compare.exe'
if ($Rebuild -or -not (Test-Path -LiteralPath $binaryPath)) {
    New-Item -ItemType Directory -Path (Join-Path $repoRoot 'bin') -Force | Out-Null
    Push-Location (Join-Path $repoRoot 'backend\go')
    try {
        & $GoExecutable build -o $binaryPath ./cmd/compare
        if ($LASTEXITCODE -ne 0) { throw 'Build failed. Install a complete Go 1.25+ toolchain or pass -GoExecutable with its full path.' }
    } finally { Pop-Location }
}
if (-not $FilePath) { $FilePath = (Read-Host 'Enter the full JSON file path').Trim().Trim('"') }
if (-not (Test-Path -LiteralPath $FilePath -PathType Leaf)) { throw "File not found: $FilePath" }
$cliArgs = @('-file', (Resolve-Path -LiteralPath $FilePath).Path)
if ($OutputPath) { $cliArgs += @('-out', $OutputPath) }
& $binaryPath @cliArgs
if ($LASTEXITCODE -ne 0) { throw 'Comparison failed or contained invalid scenarios; inspect the messages above.' }
