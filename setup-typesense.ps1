# WhiskyHunter - Typesense Setup Script
# Run this with: powershell -ExecutionPolicy Bypass -File setup-typesense.ps1
Write-Host "============================================" -ForegroundColor Cyan
Write-Host " WhiskyHunter - Typesense Setup & Indexer" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan

# Check Docker
try {
    docker info 2>&1 | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Docker not running" }
    Write-Host "[OK] Docker is running." -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Docker is not running. Start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Remove existing container
Write-Host "[1/4] Removing any existing Typesense container..." -ForegroundColor Yellow
docker rm -f typesense 2>&1 | Out-Null

# Start Typesense
Write-Host "[2/4] Starting Typesense 27.0 on port 8108..." -ForegroundColor Yellow
docker run -d `
  --name typesense `
  -p 8108:8108 `
  -v typesense-data:/data `
  typesense/typesense:27.0 `
  --data-dir /data `
  --api-key=localkey `
  --enable-cors

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Failed to start Typesense." -ForegroundColor Red
    exit 1
}
Write-Host "      Container started." -ForegroundColor Green

# Wait for Typesense to be ready
Write-Host "[3/4] Waiting for Typesense to initialize..." -ForegroundColor Yellow
$ready = $false
for ($i = 0; $i -lt 12; $i++) {
    Start-Sleep -Seconds 5
    try {
        $r = Invoke-WebRequest -Uri "http://localhost:8108/health" -TimeoutSec 3 -UseBasicParsing
        if ($r.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {}
    Write-Host "      Still waiting... ($([int](($i+1)*5))s)" -ForegroundColor DarkGray
}

if (-not $ready) {
    Write-Host "[WARN] Typesense may still be starting. Proceeding anyway..." -ForegroundColor Yellow
} else {
    Write-Host "      Typesense is healthy!" -ForegroundColor Green
}

# Run indexer
Write-Host "[4/4] Running WhiskyHunter indexer..." -ForegroundColor Yellow
Set-Location $PSScriptRoot
pnpm --filter "@whisky-hunter/search" index

if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Indexer failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "============================================" -ForegroundColor Green
Write-Host " Done! Typesense running on localhost:8108" -ForegroundColor Green
Write-Host " API key: localkey" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "To stop:   docker stop typesense" -ForegroundColor Gray
Write-Host "To start:  docker start typesense" -ForegroundColor Gray
