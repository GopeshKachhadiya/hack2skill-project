@echo off
echo ======================================================
echo   Supply Chain Resilience Platform - Setup
echo ======================================================
echo.

echo [1/2] Setting up Backend...
cd backend
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)
echo Installing backend dependencies...
venv\Scripts\python -m pip install -r requirements.txt
cd ..

echo.
echo [2/2] Setting up Frontend...
cd frontend
echo Installing frontend dependencies...
npm install
cd ..

echo.
echo ======================================================
echo   Setup complete! 
echo   Now run 'run_all.bat' to start the platform.
echo ======================================================
pause
