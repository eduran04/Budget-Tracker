# Starts the Budget Tracker app (Vite dev server).
# Usage: .\run.ps1

$ErrorActionPreference = "Stop"
Set-Location -Path $PSScriptRoot

if (-not (Test-Path "node_modules")) {
    Write-Host "node_modules not found - installing dependencies..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Error "npm install failed."
        exit 1
    }
}

npm run dev
