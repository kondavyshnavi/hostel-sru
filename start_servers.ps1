# PowerShell Launcher for SRU Smart Hostel Management Platform
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "   SRU Smart Hostel and Residential Management Platform" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$backendPath = Join-Path $PSScriptRoot "backend"
$frontendPath = Join-Path $PSScriptRoot "frontend"

Write-Host "[1/2] Starting Flask Backend (Port 5000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; .\venv\Scripts\python.exe app.py"

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting React Vite Frontend (Port 3000)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm run dev"

Write-Host "`nServers are running! Launching browser..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
Start-Process "http://localhost:3000"
