$root = "c:\Users\panka\OneDrive\Desktop\CabBooking"
$env:PYTHONPATH = "$root\backend\common;$root\backend"

Write-Host "" 
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  CabBooking - Combined Local Gateway     " -ForegroundColor Cyan
Write-Host "  Services: auth + booking + matching     " -ForegroundColor Cyan
Write-Host "  Port: 8001                              " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Android device hits: http://10.243.212.223:8001/api/v1/..." -ForegroundColor Green
Write-Host "Emulator hits:       http://10.0.2.2:8001/api/v1/..."       -ForegroundColor Green
Write-Host "Swagger docs:        http://localhost:8001/docs"             -ForegroundColor Green
Write-Host ""

Write-Host "Starting WebSocket Gateway on port 8010..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$root\backend\websocket-gateway'; `$env:PYTHONPATH='$root\backend\common;$root\backend'; python -m uvicorn app.main:socket_app --host 0.0.0.0 --port 8010 --reload"

Set-Location "$root\backend"
python -m uvicorn local_gateway:app --host 0.0.0.0 --port 8001 --reload
