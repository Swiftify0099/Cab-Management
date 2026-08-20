$root = (Resolve-Path "$PSScriptRoot\..").Path
$env:PYTHONPATH = "$root\backend\common;$root\backend"
$localIp = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
if (-not $localIp) { $localIp = "127.0.0.1" }
Write-Host "PYTHONPATH = $env:PYTHONPATH" -ForegroundColor Cyan
Write-Host "Starting Local API Gateway Proxy on port 8080..." -ForegroundColor Green
Set-Location "$root\backend"
python -m uvicorn gateway_proxy:app --host 0.0.0.0 --port 8080 --reload
