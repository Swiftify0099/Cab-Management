$root = "c:\Users\panka\OneDrive\Desktop\CabBooking"
$env:PYTHONPATH = "$root\backend\common;$root\backend"

Write-Host "PYTHONPATH = $env:PYTHONPATH" -ForegroundColor Cyan
Write-Host "Starting auth-service on http://localhost:8001 ..." -ForegroundColor Green

Set-Location "$root\backend\auth-service"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
