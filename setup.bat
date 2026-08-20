@echo off
echo ===================================
echo   REALIS Environment Setup & Start
echo ===================================
cd /d "%~dp0"
echo [1/2] Installing Python dependencies...
pip install -r requirements.txt
echo.
echo [2/2] Starting REALIS FastAPI Backend Server...
python start_server.py
