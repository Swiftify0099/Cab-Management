param (
    [string]$Action = "connect",
    [string]$PairAddress,   # e.g. 192.168.43.123:37123
    [string]$PairCode,      # e.g. 123456
    [string]$ConnectAddress # e.g. 192.168.43.123:38456
)

$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"

if (-not (Test-Path $adb)) {
    Write-Host "ERROR: adb not found at: $adb" -ForegroundColor Red
    exit 1
}

switch ($Action) {

    "devices" {
        Write-Host "=== Connected ADB Devices ===" -ForegroundColor Cyan
        & $adb devices -l
    }

    "pair" {
        if (-not $PairAddress -or -not $PairCode) {
            Write-Host "Usage: .\wireless_debug.ps1 -Action pair -PairAddress 192.168.x.x:PORT -PairCode 123456" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "On your phone:" -ForegroundColor Cyan
            Write-Host "  Settings -> Developer Options -> Wireless Debugging" -ForegroundColor White
            Write-Host "  Tap 'Pair device with pairing code'" -ForegroundColor White
            Write-Host "  Use the IP:PORT and 6-digit code shown" -ForegroundColor White
            exit 1
        }
        Write-Host "Pairing with $PairAddress using code $PairCode ..." -ForegroundColor Cyan
        & $adb pair $PairAddress $PairCode
    }

    "connect" {
        if (-not $ConnectAddress) {
            Write-Host "Usage: .\wireless_debug.ps1 -Action connect -ConnectAddress 192.168.x.x:PORT" -ForegroundColor Yellow
            Write-Host ""
            Write-Host "On your phone:" -ForegroundColor Cyan
            Write-Host "  Settings -> Developer Options -> Wireless Debugging" -ForegroundColor White
            Write-Host "  The IP address and Port shown at the TOP of the Wireless Debugging screen" -ForegroundColor White
            exit 1
        }
        Write-Host "Connecting to $ConnectAddress ..." -ForegroundColor Cyan
        & $adb connect $ConnectAddress
        Write-Host ""
        Write-Host "=== Devices after connect ===" -ForegroundColor Cyan
        & $adb devices -l
    }

    "run" {
        Write-Host "=== Devices ===" -ForegroundColor Cyan
        & $adb devices -l
        Write-Host ""
        Write-Host "Running app on physical device (skipping emulator)..." -ForegroundColor Green
        Set-Location "c:\Users\panka\OneDrive\Desktop\CabBooking\apps\driver-app"
        npx expo run:android --device
    }

    default {
        Write-Host "Actions: devices | pair | connect | run" -ForegroundColor Yellow
    }
}
