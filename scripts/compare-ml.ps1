param([string]$FilePath, [string]$OutputPath)
$ErrorActionPreference = 'Stop'
$repoPath = Split-Path -Parent $PSScriptRoot
$pythonPath = Join-Path $repoPath 'backend/python/.venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) { throw 'Install backend/python requirements in its .venv first.' }
$arguments = @('-m', 'training.compare_ml')
if ($FilePath) { $arguments += @('--file', (Resolve-Path -LiteralPath $FilePath).Path) }
if ($OutputPath) { $arguments += @('--out', [System.IO.Path]::GetFullPath($OutputPath)) }
Push-Location (Join-Path $repoPath 'backend/python')
try { & $pythonPath @arguments; if ($LASTEXITCODE -ne 0) { throw 'ML comparison failed; see error above.' } }
finally { Pop-Location }
