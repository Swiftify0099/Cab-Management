Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  CabBooking - Stopping All Services      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Stopping and removing all Docker containers..." -ForegroundColor Green
docker-compose down

Write-Host ""
Write-Host "All backend and web frontend services have been stopped." -ForegroundColor Green
Write-Host "Note: If you have Expo terminals running for your mobile apps, please close them manually." -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Cyan
