@echo off
SETLOCAL EnableDelayedExpansion

echo ======================================================
echo   Supply Chain Resilience Platform - Quick Launcher
echo ======================================================
echo.

:: Check if backend venv exists
if not exist "backend\venv" (
    echo [ERROR] Backend virtual environment not found in backend\venv
    echo Please create it first: cd backend ^&^& python -m venv venv
    pause
    exit /b
)

:: Check if node_modules exists
if not exist "frontend\node_modules" (
    echo [ERROR] Frontend node_modules not found
    echo Please run 'npm install' in the frontend directory.
    pause
    exit /b
)

echo [1/2] Starting Backend (FastAPI)...
start "Backend - FastAPI" cmd /k "cd backend && venv\Scripts\activate && uvicorn app.main:app --reload --port 8000"

echo [2/2] Starting Frontend (Vite)...
start "Frontend - Vite" cmd /k "cd frontend && npm run dev"

echo.
echo ======================================================
echo   Both services are starting in separate windows.
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo ======================================================
echo.
pause
