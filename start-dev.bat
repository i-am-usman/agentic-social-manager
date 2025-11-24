@echo off
REM Agentic Social Manager - Quick Start Script for Windows

echo.
echo ====================================================
echo  Agentic Social Manager - Starting Development
echo ====================================================
echo.

REM Check if .env file exists in backend
if not exist "backend\.env" (
    echo.
    echo [WARNING] .env file not found in backend folder!
    echo.
    echo Please follow these steps:
    echo 1. Copy backend\.env.example to backend\.env
    echo 2. Add your API keys:
    echo    - ANTHROPIC_API_KEY from console.anthropic.com
    echo    - UNSPLASH_API_KEY from unsplash.com/developers
    echo.
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo [1/4] Installing backend dependencies...
cd backend
pip install -r requirements.txt
cd ..

if errorlevel 1 (
    echo Failed to install backend dependencies
    pause
    exit /b 1
)

echo [2/4] Installing frontend dependencies...
cd frontend
call npm install
cd ..

if errorlevel 1 (
    echo Failed to install frontend dependencies
    pause
    exit /b 1
)

echo.
echo ====================================================
echo  Starting Backend Server (FastAPI)...
echo ====================================================
echo.
echo Backend will start on: http://localhost:8000
echo.

REM Start backend in new terminal
start cmd /k "cd backend && python -m uvicorn app.main:app --reload"

REM Wait a moment for backend to start
timeout /t 3 /nobreak

REM Offer optional DB migration (created_by -> user_id)
echo.
echo ====================================================
echo  Optional: Migrate existing documents (created_by -> user_id)
echo ====================================================
echo This will run backend\scripts\migrate_created_by_to_user_id.py
echo It supports --dry-run and --collection flags.
echo.

set /p MIGRATE="Run migration? [d=dry-run / a=apply / s=skip] (d/a/s): "
if /I "%MIGRATE%"=="d" goto DRY
if /I "%MIGRATE%"=="a" goto APPLY
if /I "%MIGRATE%"=="s" goto SKIP
echo Input not recognized, skipping migration.
goto SKIP

:LOAD_ENV
REM try to load MONGO_URI from backend\.env (if present)
set "MONGO_URI="
for /f "usebackq tokens=1* delims==" %%A in (`type backend\.env ^| findstr /R "^MONGO_URI="`) do (
    set "MONGO_URI=%%B"
)
if defined MONGO_URI (
    REM trim possible surrounding spaces and quotes
    set "MONGO_URI=%MONGO_URI:"=%"
    for /f "tokens=* delims= " %%x in ("%MONGO_URI%") do set "MONGO_URI=%%x"
    echo Found MONGO_URI in backend\.env
) else (
    echo No MONGO_URI found in backend\.env — script will use defaults or your environment.
)
goto :eof

:DRY
call :LOAD_ENV
echo Running migration in DRY-RUN mode (shows sample docs only)...
if defined MONGO_URI (
    set "MONGO_URI=%MONGO_URI%"
)
python backend\scripts\migrate_created_by_to_user_id.py --collection posts --dry-run --limit 5
echo Dry-run finished.
goto SKIP_AFTER_MIGRATE

:APPLY
call :LOAD_ENV
echo Running migration in APPLY mode (will modify documents)...
set /p COL="Which collection to migrate? [posts/content/both] (default: both): "
if /I "%COL%"=="posts" (
    set "COL_ARG=--collection posts"
) else if /I "%COL%"=="content" (
    set "COL_ARG=--collection content"
) else (
    set "COL_ARG="
)
if defined MONGO_URI (
    set "MONGO_URI=%MONGO_URI%"
)
python backend\scripts\migrate_created_by_to_user_id.py %COL_ARG%
echo Migration finished.
goto SKIP_AFTER_MIGRATE

:SKIP_AFTER_MIGRATE
echo.
echo Press Enter to continue starting the frontend...
pause >nul

:SKIP
echo.
echo ====================================================
echo  Starting Frontend Server (React)...
echo ====================================================
echo.
echo Frontend will start on: http://localhost:3000 or http://localhost:3001
echo.

REM Start frontend in new terminal
start cmd /k "cd frontend && npm start"

echo.
echo ====================================================
echo  Development servers are starting...
echo ====================================================
echo.
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000 (or 3001)
echo.
echo API Documentation: http://localhost:8000/docs
echo.
echo Press Ctrl+C in either terminal to stop the servers.
echo.
pause
