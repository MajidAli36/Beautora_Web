@echo off
title SyncOps Device Agent - Install
cd /d "%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Please allow Administrator permission...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo Installing SyncOps Device Agent...
echo This runs in the background every time Windows starts.
echo Cloud: https://www.beautora.app
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\_install.ps1"
if errorlevel 1 (
  echo.
  echo Install failed.
  pause
  exit /b 1
)

echo.
echo Install complete.
echo Agent is running and will start automatically when Windows opens.
pause
