@echo off
title CabBooking — Stop All Services
color 0C

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║       🛑  CabBooking — Stopping All Services        ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: Kill all uvicorn (Python backend) processes
echo  [STOP] Stopping all Python/uvicorn services...
taskkill /F /IM "python.exe" /T >nul 2>&1
taskkill /F /IM "uvicorn.exe" /T >nul 2>&1
echo  [OK]   Backend services stopped.

:: Kill Node.js processes (Expo / Vite)
echo  [STOP] Stopping all Node.js/Expo/Vite processes...
taskkill /F /IM "node.exe" /T >nul 2>&1
echo  [OK]   Frontend apps stopped.

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║   ✅  All CabBooking services have been stopped.    ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
pause
exit /b 0
