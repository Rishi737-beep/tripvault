$ErrorActionPreference = "Stop"

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

$env:DB_URL = if ($env:DB_URL) { $env:DB_URL } else { "jdbc:mysql://localhost:3306/travel_memory_vault?serverTimezone=UTC" }
$env:DB_USERNAME = $username
$env:DB_PASSWORD = $password

$jwtBytes = New-Object byte[] 64
$random = [Security.Cryptography.RandomNumberGenerator]::Create()

try {
    $random.GetBytes($jwtBytes)
    $env:JWT_SECRET = [Convert]::ToBase64String($jwtBytes)
}
finally {
    $random.Dispose()
    [Array]::Clear($jwtBytes, 0, $jwtBytes.Length)
}

$env:PHOTO_STORAGE_PATH = Join-Path $env:LOCALAPPDATA "TravelMemoryVault\private-photos"

try {
    & (Join-Path $PSScriptRoot "mvnw.cmd") `
        -f (Join-Path $PSScriptRoot "backend\pom.xml") spring-boot:run

    if ($LASTEXITCODE -ne 0) {
        throw "Spring Boot stopped with exit code $LASTEXITCODE."
    }
}
finally {
    Remove-Item Env:DB_PASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:DB_USERNAME -ErrorAction SilentlyContinue
    Remove-Item Env:DB_URL -ErrorAction SilentlyContinue
    Remove-Item Env:JWT_SECRET -ErrorAction SilentlyContinue
    Remove-Item Env:PHOTO_STORAGE_PATH -ErrorAction SilentlyContinue
}
