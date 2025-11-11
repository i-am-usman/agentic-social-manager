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

echo [1/3] Installing backend dependencies...
cd backend
pip install -r requirements.txt
cd ..

if errorlevel 1 (
    echo Failed to install backend dependencies
    pause
    exit /b 1
)

echo [2/3] Installing frontend dependencies...
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
