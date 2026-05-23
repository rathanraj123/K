@echo off
echo ================================================
echo  AgriCosmo - Local Dev Launcher (No Docker)
echo ================================================

REM ── Prerequisites check ──────────────────────────
where python >nul 2>&1
if errorlevel 1 (echo [ERROR] Python not found. Install Python 3.10+ & add to PATH. & pause & exit /b 1)

where node >nul 2>&1
if errorlevel 1 (echo [ERROR] Node.js not found. Install Node.js 18+ from nodejs.org & pause & exit /b 1)

REM ── Backend setup ────────────────────────────────
echo.
echo [1/4] Setting up Python virtual environment...
cd /d "%~dp0backend"

if not exist ".venv" (
    python -m venv .venv
    echo     Created .venv
)

call .venv\Scripts\activate.bat

echo [2/4] Installing Python dependencies...
pip install -r requirements.txt --quiet

echo [3/4] Running database setup (tables + seed users)...
python scripts\setup_local.py
if errorlevel 1 (
    echo.
    echo [ERROR] DB setup failed.
    echo Make sure PostgreSQL is running and your .env has correct credentials:
    echo   POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_SERVER, POSTGRES_DB
    pause
    exit /b 1
)

echo.
echo [4/4] Starting FastAPI backend on http://localhost:8000 ...
echo       API Docs: http://localhost:8000/api/v1/docs
echo       Press Ctrl+C to stop.
echo.
start "AgriCosmo Backend" cmd /k "cd /d %~dp0backend && .venv\Scripts\activate && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

REM ── Frontend setup ────────────────────────────────
echo Starting React frontend on http://localhost:5173 ...
cd /d "%~dp0frontend"

if not exist "node_modules" (
    echo Installing npm packages...
    npm install
)

start "AgriCosmo Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ================================================
echo  Both servers are running!
echo.
echo  Frontend : http://localhost:5173
echo  Backend  : http://localhost:8000
echo  API Docs : http://localhost:8000/api/v1/docs
echo.
echo  Login credentials:
echo    Farmer  ->  demo@agricosmo.com  /  demo1234
echo    Admin   ->  admin@agricosmo.com /  Admin@1234
echo ================================================
pause
