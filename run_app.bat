@echo off
title AetherQuotes - Startup Script
echo ===================================================
echo               AETHERQUOTES SYSTEM STARTUP          
echo ===================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in the PATH.
    echo Please install Python 3.8+ and try again.
    pause
    exit /b 1
)

:: Check for virtual environment
if not exist ".venv" (
    echo [INFO] Creating Python virtual environment (.venv)...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment.
        pause
        exit /b 1
    )
    echo [INFO] Virtual environment created successfully.
)

:: Activate virtual environment
echo [INFO] Activating virtual environment...
call .venv\Scripts\activate.bat

:: Install dependencies
echo [INFO] Checking dependencies from requirements.txt...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo [WARNING] Dependency installation encountered issues. Let's try running anyway...
)

:: Start Flask server
echo.
echo [SUCCESS] Everything is set up. Launching Flask server...
echo Access the website at http://127.0.0.1:5000/
echo Press Ctrl+C in this console to stop the server.
echo.
python app.py

pause
