$root = (Resolve-Path "$PSScriptRoot\..").Path
$env:PYTHONPATH = "$root\backend\common;$root\backend"
Write-Host "PYTHONPATH = $env:PYTHONPATH" -ForegroundColor Cyan
Write-Host "Starting booking-service on http://localhost:8002 ..." -ForegroundColor Green
Set-Location "$root\backend\booking-service"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8002 --reload
