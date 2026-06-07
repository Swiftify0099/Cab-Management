$root = "c:\Users\panka\OneDrive\Desktop\CabBooking"
$env:PYTHONPATH = "$root\backend\common;$root\backend"

Write-Host "PYTHONPATH = $env:PYTHONPATH" -ForegroundColor Cyan
Write-Host "Starting matching-service on http://localhost:8003 ..." -ForegroundColor Green

Set-Location "$root\backend\matching-service"
python -m uvicorn app.main:app --host 0.0.0.0 --port 8003 --reload
