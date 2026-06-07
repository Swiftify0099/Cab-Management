Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  CabBooking - Starting All Services      " -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Starting Backend Microservices and Web Frontends via Docker Compose..." -ForegroundColor Green
docker-compose up -d --build

Write-Host ""
Write-Host "All Docker services are starting up in the background." -ForegroundColor Green
Write-Host "Web Frontends will be available at:" -ForegroundColor Yellow
Write-Host "  - Admin Web:    http://localhost:5173"
Write-Host "  - Customer Web: http://localhost:5174"
Write-Host ""
Write-Host "To start the Mobile Apps manually, open two new terminals and run:" -ForegroundColor Yellow
Write-Host "  - cd apps/customer-app && npx expo start -c"
Write-Host "  - cd apps/driver-app && npx expo run:android"
Write-Host "==========================================" -ForegroundColor Cyan
