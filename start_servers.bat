@echo off
title SRU Smart Hostel Management Platform - Launcher
echo ============================================================
echo   SRU Smart Hostel and Residential Management Platform
echo ============================================================
echo.

echo [1/2] Starting Flask REST Backend on port 5000...
start "SRU Backend (Port 5000)" cmd /k "cd /d "%~dp0backend" && .\venv\Scripts\python.exe app.py"

timeout /t 3 /nobreak >nul

echo [2/2] Starting React Vite Frontend on port 3000...
start "SRU Frontend (Port 3000)" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo ============================================================
echo   Both servers launched successfully!
echo   Frontend URL : http://localhost:3000
echo   Backend URL  : http://localhost:5000/api/health
echo ============================================================
echo.
timeout /t 2 /nobreak >nul
start http://localhost:3000
