param (
    [string]$IpAddress
)

$root = "c:\Users\panka\OneDrive\Desktop\CabBooking"

# Try to get the IP address from the user, or auto-detect if not provided

if (-not $IpAddress) {
    Write-Host "No IP provided. Auto-detecting local IP address..." -ForegroundColor Cyan
    $IpAddress = (Get-NetIPAddress -AddressFamily IPv4 -InterfaceAlias Wi-Fi -ErrorAction SilentlyContinue | Select-Object -First 1).IPAddress
    if (-not $IpAddress) {
        $IpAddress = (Test-Connection -ComputerName (hostname) -Count 1 -ErrorAction SilentlyContinue).IPV4Address.IPAddressToString
    }
    
    if (-not $IpAddress) {
        Write-Host "Could not auto-detect IP. Please provide it manually:" -ForegroundColor Red
        Write-Host ".\update_ip.ps1 -IpAddress 192.168.x.x" -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "Updating all configs to use IP: $IpAddress" -ForegroundColor Green

# ── 1. Update Expo .env files ──────────────────────────────────────────────────
$apps = @("driver-app", "customer-app")

foreach ($app in $apps) {
    $envPath = "$root\apps\$app\.env"
    if (Test-Path $envPath) {
        $content = Get-Content $envPath
        
        $newContent = $content | ForEach-Object {
            if ($_ -match "^EXPO_PUBLIC_API_URL=") {
                "EXPO_PUBLIC_API_URL=http://$($IpAddress)/api/v1"
            } elseif ($_ -match "^EXPO_PUBLIC_WS_URL=") {
                "EXPO_PUBLIC_WS_URL=http://$($IpAddress):8010"
            } else {
                $_
            }
        }
        
        Set-Content -Path $envPath -Value $newContent
        Write-Host "  Updated $envPath" -ForegroundColor DarkGreen
    }
}

# ── 2. Update app.json extra block (driver-app) ────────────────────────────────
$appJsonPath = "$root\apps\driver-app\app.json"
if (Test-Path $appJsonPath) {
    $json = Get-Content $appJsonPath -Raw
    $json = $json -replace '"apiUrl":\s*"http://[^"]+/api/v1"', """apiUrl"": ""http://$($IpAddress)/api/v1"""
    $json = $json -replace '"wsUrl":\s*"http://[^"]+:8010"',         """wsUrl"":  ""http://$($IpAddress):8010"""
    Set-Content -Path $appJsonPath -Value $json -NoNewline
    Write-Host "  Updated $appJsonPath" -ForegroundColor DarkGreen
}

# ── 3. Update backend CORS config ──────────────────────────────────────────────
$corsPath = "$root\backend\common\config.py"
if (Test-Path $corsPath) {
    $content = Get-Content $corsPath -Raw
    # Replace any 192.168.x.x or 172.x.x.x LAN IP patterns in CORS list
    $content = $content -replace '192\.\d+\.\d+\.\d+', $IpAddress
    $content = $content -replace '172\.\d+\.\d+\.\d+', $IpAddress
    Set-Content -Path $corsPath -Value $content -NoNewline
    Write-Host "  Updated $corsPath" -ForegroundColor DarkGreen
}

# ── 4. Update start_all.ps1 hint ──────────────────────────────────────────────
$startPath = "$root\backend\start_all.ps1"
if (Test-Path $startPath) {
    $content = Get-Content $startPath -Raw
    $content = $content -replace '192\.\d+\.\d+\.\d+', $IpAddress
    $content = $content -replace '172\.\d+\.\d+\.\d+', $IpAddress
    Set-Content -Path $startPath -Value $content -NoNewline
    Write-Host "  Updated $startPath" -ForegroundColor DarkGreen
}

Write-Host "`nAll done! Restart Metro bundler for .env changes to take effect." -ForegroundColor Cyan
Write-Host "If your router IP changes again, just run:" -ForegroundColor Cyan
Write-Host ".\update_ip.ps1" -ForegroundColor Yellow
Write-Host "And it will auto-detect and update everything automatically!" -ForegroundColor Yellow
