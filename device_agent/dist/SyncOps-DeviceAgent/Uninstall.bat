@echo off
title SyncOps Device Agent - Uninstall
cd /d "%~dp0"

net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Please allow Administrator permission...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

echo.
echo Uninstalling SyncOps Device Agent...
echo.

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0app\_uninstall.ps1"
if errorlevel 1 (
  echo.
  echo Uninstall failed.
  pause
  exit /b 1
)

echo.
echo Uninstall complete.
pause
