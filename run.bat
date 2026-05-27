@echo off
setlocal EnableDelayedExpansion

:: ============================================================
:: CabBooking SuperApp — Project Runner
:: Starts all backend microservices + frontend apps
:: ============================================================

title CabBooking SuperApp Launcher
color 0A

:: ─── Project root ───────────────────────────────────────────
set ROOT=%~dp0
set ROOT=%ROOT:~0,-1%

echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║       🚕  CabBooking SuperApp  — Dev Launcher       ║
echo  ╚══════════════════════════════════════════════════════╝
echo.

:: ─── Check .env file ────────────────────────────────────────
if not exist "%ROOT%\.env" (
    echo  [WARN] .env file not found!
    echo  Copying .env.example to .env ...
    copy "%ROOT%\.env.example" "%ROOT%\.env" >nul
    echo  [OK]   .env created. Edit it with your real values.
    echo.
)

:: ─── Check Python ───────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Python not found! Please install Python 3.11+
    pause
    exit /b 1
)

:: ─── Check Node ─────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo  [ERROR] Node.js not found! Please install Node.js 18+
    pause
    exit /b 1
)

echo  What would you like to start?
echo.
echo  [1] Backend microservices only (Python/FastAPI)
echo  [2] Frontend apps only (React/Expo)
echo  [3] Start EVERYTHING (Backend + Frontend)
echo  [4] Install all dependencies first, then start everything
echo  [5] Exit
echo.
set /p CHOICE="  Enter your choice (1-5): "

if "%CHOICE%"=="1" goto :START_BACKEND
if "%CHOICE%"=="2" goto :START_FRONTEND
if "%CHOICE%"=="3" goto :START_ALL
if "%CHOICE%"=="4" goto :INSTALL_AND_START
if "%CHOICE%"=="5" goto :EXIT
echo  Invalid choice. Please run again.
pause
exit /b 1


:: ============================================================
:INSTALL_AND_START
:: ============================================================
echo.
echo  ── Installing Python dependencies for all services ────
echo.

set SERVICES=auth-service booking-service matching-service payment-service parcel-service hotel-service notification-service analytics-service admin-service websocket-gateway

for %%S in (%SERVICES%) do (
    if exist "%ROOT%\backend\%%S\requirements.txt" (
        echo  [PIP] Installing: %%S
        pip install -r "%ROOT%\backend\%%S\requirements.txt" -q --no-warn-script-location
    )
)

echo.
echo  ── Installing frontend npm dependencies ────────────────
echo.

for %%A in (customer-app driver-app customer-web admin-web) do (
    if exist "%ROOT%\apps\%%A\package.json" (
        echo  [NPM] Installing: %%A
        call npm install --prefix "%ROOT%\apps\%%A" --legacy-peer-deps --silent
    )
)

echo.
echo  [OK] All dependencies installed!
echo.

goto :START_ALL


:: ============================================================
:START_ALL
:: ============================================================
call :START_BACKEND
call :START_FRONTEND
goto :DONE


:: ============================================================
:START_BACKEND
:: ============================================================
echo.
echo  ═══════════════════════════════════════════════════════
echo   🐍  Starting Backend Microservices
echo  ═══════════════════════════════════════════════════════
echo.

set PYTHONPATH=%ROOT%\backend\common;%ROOT%\backend

:: Auth Service — Port 8001
start "🔐 Auth Service :8001" cmd /k "color 0B && title Auth Service :8001 && cd /d %ROOT%\backend\auth-service && echo Starting auth-service on port 8001... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
timeout /t 2 /nobreak >nul

:: Booking Service — Port 8002
start "📋 Booking Service :8002" cmd /k "color 0B && title Booking Service :8002 && cd /d %ROOT%\backend\booking-service && echo Starting booking-service on port 8002... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload"
timeout /t 2 /nobreak >nul

:: Matching Service — Port 8003
start "🗺️ Matching Service :8003" cmd /k "color 0B && title Matching Service :8003 && cd /d %ROOT%\backend\matching-service && echo Starting matching-service on port 8003... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload"
timeout /t 2 /nobreak >nul

:: Payment Service — Port 8004
start "💳 Payment Service :8004" cmd /k "color 0B && title Payment Service :8004 && cd /d %ROOT%\backend\payment-service && echo Starting payment-service on port 8004... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8004 --reload"
timeout /t 2 /nobreak >nul

:: Parcel Service — Port 8005
start "📦 Parcel Service :8005" cmd /k "color 0B && title Parcel Service :8005 && cd /d %ROOT%\backend\parcel-service && echo Starting parcel-service on port 8005... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8005 --reload"
timeout /t 2 /nobreak >nul

:: Hotel Service — Port 8006
start "🏨 Hotel Service :8006" cmd /k "color 0B && title Hotel Service :8006 && cd /d %ROOT%\backend\hotel-service && echo Starting hotel-service on port 8006... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8006 --reload"
timeout /t 2 /nobreak >nul

:: Notification Service — Port 8007
start "🔔 Notification Service :8007" cmd /k "color 0B && title Notification Service :8007 && cd /d %ROOT%\backend\notification-service && echo Starting notification-service on port 8007... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8007 --reload"
timeout /t 2 /nobreak >nul

:: Analytics Service — Port 8008
start "📊 Analytics Service :8008" cmd /k "color 0B && title Analytics Service :8008 && cd /d %ROOT%\backend\analytics-service && echo Starting analytics-service on port 8008... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8008 --reload"
timeout /t 2 /nobreak >nul

:: Admin Service — Port 8009
start "🛡️ Admin Service :8009" cmd /k "color 0B && title Admin Service :8009 && cd /d %ROOT%\backend\admin-service && echo Starting admin-service on port 8009... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8009 --reload"
timeout /t 2 /nobreak >nul

:: WebSocket Gateway — Port 8010
start "🌐 WebSocket Gateway :8010" cmd /k "color 0B && title WebSocket Gateway :8010 && cd /d %ROOT%\backend\websocket-gateway && echo Starting websocket-gateway on port 8010... && python -m uvicorn app.main:app --host 0.0.0.0 --port 8010 --reload"
timeout /t 2 /nobreak >nul

echo.
echo  [OK] All backend services launched in separate windows!
echo.
echo  Service URLs:
echo    Auth:         http://localhost:8001/docs
echo    Booking:      http://localhost:8002/docs
echo    Matching:     http://localhost:8003/docs
echo    Payment:      http://localhost:8004/docs
echo    Parcel:       http://localhost:8005/docs
echo    Hotel:        http://localhost:8006/docs
echo    Notification: http://localhost:8007/docs
echo    Analytics:    http://localhost:8008/docs
echo    Admin:        http://localhost:8009/docs
echo    WebSocket:    http://localhost:8010
echo.

if "%CHOICE%"=="1" goto :DONE
goto :eof


:: ============================================================
:START_FRONTEND
:: ============================================================
echo.
echo  ═══════════════════════════════════════════════════════
echo   ⚛️   Starting Frontend Apps
echo  ═══════════════════════════════════════════════════════
echo.

:: Customer Mobile App (Expo)
if exist "%ROOT%\apps\customer-app\package.json" (
    start "📱 Customer App (Expo)" cmd /k "color 0E && title Customer Mobile App && cd /d %ROOT%\apps\customer-app && echo Starting Customer App (Expo)... && npm start"
    timeout /t 3 /nobreak >nul
)

:: Driver Mobile App (Expo)
if exist "%ROOT%\apps\driver-app\package.json" (
    start "🚗 Driver App (Expo)" cmd /k "color 0E && title Driver Mobile App && cd /d %ROOT%\apps\driver-app && echo Starting Driver App (Expo)... && npm start"
    timeout /t 3 /nobreak >nul
)

:: Customer Web App (Vite/React)
if exist "%ROOT%\apps\customer-web\package.json" (
    start "🌍 Customer Web App" cmd /k "color 03 && title Customer Web App && cd /d %ROOT%\apps\customer-web && echo Starting Customer Web App... && npm run dev"
    timeout /t 3 /nobreak >nul
)

:: Admin Web Panel (Vite/React)
if exist "%ROOT%\apps\admin-web\package.json" (
    start "🛡️ Admin Web Panel" cmd /k "color 03 && title Admin Web Panel && cd /d %ROOT%\apps\admin-web && echo Starting Admin Web Panel... && npm run dev"
    timeout /t 3 /nobreak >nul
)

echo.
echo  [OK] All frontend apps launched in separate windows!
echo.
echo  Frontend URLs:
echo    Customer Web:  http://localhost:5173
echo    Admin Panel:   http://localhost:5174
echo    Customer App:  Scan QR from Expo terminal
echo    Driver App:    Scan QR from Expo terminal
echo.

if "%CHOICE%"=="2" goto :DONE
goto :eof


:: ============================================================
:DONE
:: ============================================================
echo.
echo  ╔══════════════════════════════════════════════════════╗
echo  ║   ✅  CabBooking SuperApp is Running!               ║
echo  ║                                                      ║
echo  ║   All services are now open in separate windows.    ║
echo  ║   Close this window or press any key to exit.       ║
echo  ╚══════════════════════════════════════════════════════╝
echo.
pause
exit /b 0

:EXIT
echo  Bye!
exit /b 0
