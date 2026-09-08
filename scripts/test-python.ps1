$ErrorActionPreference = 'Stop'
Push-Location (Join-Path $PSScriptRoot '../backend/python')
try {
    $pythonCommand = if (Test-Path '.venv/Scripts/python.exe') { '.venv/Scripts/python.exe' } else { 'python' }
    & $pythonCommand -m ruff check .
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $pythonCommand -m ruff format --check .
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
    & $pythonCommand -m pytest
    if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally { Pop-Location }
