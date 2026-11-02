# ==============================================================================
# Travel Memory Vault - Full Stack Launcher
# Starts the Spring Boot backend on port 8080 and the Vite frontend on port 5173
# ==============================================================================

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$wifiIp = Get-NetIPAddress -InterfaceAlias "Wi-Fi" -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } |
    Select-Object -ExpandProperty IPAddress -First 1
if ([string]::IsNullOrWhiteSpace($wifiIp)) {
    throw "No active Wi-Fi IPv4 address found. Connect this PC to Wi-Fi and try again."
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " Starting Travel Memory Vault Full Stack" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. Environment and database configuration
$username = if ($env:DB_USERNAME) { $env:DB_USERNAME } else { "root" }
$password = $env:DB_PASSWORD
if ([string]::IsNullOrWhiteSpace($password)) {
    $password = [Environment]::GetEnvironmentVariable("DB_PASSWORD", "User")
}
if ([string]::IsNullOrWhiteSpace($password)) {
    $password = [Environment]::GetEnvironmentVariable("DB_PASSWORD", "Machine")
}
if ([string]::IsNullOrWhiteSpace($password)) {
    throw "DB_PASSWORD must be set in the environment."
}

$dbUrl = if ($env:DB_URL) { $env:DB_URL } else { "jdbc:mysql://localhost:3306/travel_memory_vault?serverTimezone=UTC" }
$photoPath = Join-Path $env:LOCALAPPDATA "TravelMemoryVault\private-photos"
if (-not (Test-Path $photoPath)) {
    New-Item -ItemType Directory -Force -Path $photoPath | Out-Null
}

# Generate cryptographically secure JWT secret
$jwtBytes = New-Object byte[] 64
$random = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
    $random.GetBytes($jwtBytes)
    $jwtSecret = [Convert]::ToBase64String($jwtBytes)
}
finally {
    $random.Dispose()
    [Array]::Clear($jwtBytes, 0, $jwtBytes.Length)
}

Write-Host "[1/3] Launching Spring Boot backend on http://127.0.0.1:8080..." -ForegroundColor Yellow

$backendDir = Join-Path $root "Backend"
$env:DB_URL = $dbUrl
$env:DB_USERNAME = $username
$env:DB_PASSWORD = $password
$env:JWT_SECRET = $jwtSecret
$env:PHOTO_STORAGE_PATH = $photoPath
$backendCmd = @"
`$host.UI.RawUI.WindowTitle = 'Travel Memory Vault - Backend (8080)'
Write-Host 'Starting Spring Boot backend...' -ForegroundColor Cyan
& '.\mvnw.cmd' -f 'backend\pom.xml' spring-boot:run
"@

try {
    $backendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$backendDir'; $backendCmd" -PassThru
}
finally {
    Remove-Item Env:DB_URL, Env:DB_USERNAME, Env:DB_PASSWORD, Env:JWT_SECRET, Env:PHOTO_STORAGE_PATH -ErrorAction SilentlyContinue
}

# 2. Wait for backend to be ready
Write-Host "Waiting for backend to respond on port 8080..." -ForegroundColor Gray
$attempts = 0
$maxAttempts = 30
$backendReady = $false

while (-not $backendReady -and $attempts -lt $maxAttempts) {
    Start-Sleep -Seconds 2
    $attempts++
    try {
        $res = Invoke-WebRequest -Uri "http://127.0.0.1:8080/" -TimeoutSec 2 -UseBasicParsing
        if ($res.StatusCode -eq 200 -or $res.StatusCode -eq 401) {
            $backendReady = $true
        }
    } catch {
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) {
            $backendReady = $true
        } else {
            Write-Host "." -NoNewline -ForegroundColor Gray
        }
    }
}
Write-Host ""

if ($backendReady) {
    Write-Host "[Backend Ready] Spring Boot is active on http://127.0.0.1:8080" -ForegroundColor Green
} else {
    Write-Host "[Warning] Backend took longer than expected to report ready. Proceeding with frontend..." -ForegroundColor Yellow
}

# 3. Start Frontend
Write-Host "[2/3] Starting Vite frontend on http://${wifiIp}:5173..." -ForegroundColor Yellow
$frontendDir = Join-Path $root "Frontend\travel-memory-vault-frontend"

$frontendCmd = @"
`$host.UI.RawUI.WindowTitle = 'Travel Memory Vault - Frontend (5173)'
Write-Host 'Starting Vite Frontend dev server...' -ForegroundColor Cyan
npx vite --port 5173 --host $wifiIp
"@

$frontendProcess = Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$frontendDir'; $frontendCmd" -PassThru

Start-Sleep -Seconds 3

# 4. Open in default browser
Write-Host "[3/3] Opening application in browser..." -ForegroundColor Green
Start-Process "http://127.0.0.1:5173"

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Application connected and running:" -ForegroundColor Green
Write-Host "   Frontend : http://127.0.0.1:5173" -ForegroundColor White
Write-Host "   Phone    : http://${wifiIp}:5173 (same Wi-Fi)" -ForegroundColor White
Write-Host "   Backend  : http://127.0.0.1:8080" -ForegroundColor White
Write-Host "   API Docs : http://127.0.0.1:8080/swagger-ui.html" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Cyan
