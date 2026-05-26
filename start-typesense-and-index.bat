@echo off
setlocal enabledelayedexpansion
chcp 65001 > nul
echo ============================================
echo  WhiskyHunter - Typesense Setup ^& Indexer
echo ============================================
echo.

REM Check Docker is running
docker info > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not running. Please start Docker Desktop first.
    pause
    exit /b 1
)

echo [1/4] Docker is running. Checking for existing Typesense container...

REM Remove existing container if present (to avoid port conflict)
docker rm -f typesense > nul 2>&1
if not errorlevel 1 echo       Removed existing 'typesense' container.

echo.
echo [2/4] Starting Typesense 27.0 on port 8108...
docker run -d ^
  --name typesense ^
  -p 8108:8108 ^
  -v typesense-data:/data ^
  typesense/typesense:27.0 ^
  --data-dir /data ^
  --api-key=localkey ^
  --enable-cors

if errorlevel 1 (
    echo [ERROR] Failed to start Typesense container.
    pause
    exit /b 1
)

echo       Typesense container started.
echo.
echo [3/4] Waiting 20 seconds for Typesense to initialize...
timeout /t 20 /nobreak > nul

REM Verify Typesense is healthy
curl -s "http://localhost:8108/health" > nul 2>&1
if errorlevel 1 (
    echo [WARN] Typesense health check failed - it may still be starting.
    echo        Waiting 10 more seconds...
    timeout /t 10 /nobreak > nul
)

echo       Typesense ready.
echo.
echo [4/4] Running WhiskyHunter indexer...
pushd "%~dp0"
call pnpm --filter @whisky-hunter/search index
if errorlevel 1 (
    echo.
    echo [ERROR] Indexer failed. Check output above.
    popd
    pause
    exit /b 1
)
popd

echo.
echo ============================================
echo  Done! Typesense is running on port 8108.
echo  Container name: typesense
echo  API key: localkey
echo ============================================
echo.
echo To stop Typesense later:  docker stop typesense
echo To restart later:         docker start typesense
echo.
pause
