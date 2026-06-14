# Local API Gateway Proxy
# Routes all API requests to the correct backend service based on path prefix.
# Runs on port 8080 — no admin privileges needed.
#
# USAGE: Run this in a new terminal after starting all backend services.
#   .\start_proxy.ps1
#
# The mobile app .env files must point to:
#   EXPO_PUBLIC_API_URL=http://<YOUR_IP>:8080/api/v1

$root = "c:\Users\panka\OneDrive\Desktop\CabBooking"
$env:PYTHONPATH = "$root\backend\common;$root\backend"

# Try to automatically get the local IP address
$localIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
if (-not $localIp) {
    $localIp = "YOUR_ROUTER_IP"
}

Write-Host "PYTHONPATH = $env:PYTHONPATH" -ForegroundColor Cyan
Write-Host "Starting Local API Gateway Proxy to listen on all interfaces (0.0.0.0) ..." -ForegroundColor Green
Write-Host "Mobile apps should use EXPO_PUBLIC_API_URL=http://$localIp:8080/api/v1" -ForegroundColor Yellow

Set-Location "$root\backend"
python -m uvicorn gateway_proxy:app --host 0.0.0.0 --port 8080 --reload
