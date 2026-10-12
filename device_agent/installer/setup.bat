@echo off
title SyncOps Device Agent Setup
cd /d "%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Requesting Administrator permission...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo Installing SyncOps Device Agent (background service)...
echo Cloud: https://www.beautora.app
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-service.ps1" -OpenFirewall
if errorlevel 1 (
  echo.
  echo Setup failed. See errors above.
  pause
  exit /b 1
)

echo.
echo Setup finished. Agent will start every time Windows boots.
pause
