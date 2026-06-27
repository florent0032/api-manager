@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo.
echo  ██╗  ██╗███████╗██╗   ██╗███████╗ ██████╗ ██████╗  ██████╗ ███████╗
echo  ██║ ██╔╝██╔════╝╚██╗ ██╔╝██╔════╝██╔═══██╗██╔══██╗██╔═══██╗██╔════╝
echo  █████╔╝ █████╗   ╚████╔╝ █████╗  ██║   ██║██████╔╝██║   ██║█████╗
echo  ██╔═██╗ ██╔══╝    ╚██╔╝  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝
echo  ██║  ██╗███████╗   ██║   ██║     ╚██████╔╝██║  ██║╚██████╔╝██║
echo  ╚═╝  ╚═╝╚══════╝   ╚═╝   ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚═╝
echo.
echo  API Key Management System
echo.

set PROJECT_DIR=%~dp0
set BACKEND_DIR=%PROJECT_DIR%backend
set FRONTEND_DIR=%PROJECT_DIR%frontend

:: 加载 .env 配置
if exist "%PROJECT_DIR%.env" (
    for /f "usebackq tokens=1,* delims==" %%a in ("%PROJECT_DIR%.env") do (
        set "line=%%a"
        if not "!line:~0,1!"=="#" if not "%%a"=="" (
            set "%%a=%%b"
        )
    )
)

if not defined BACKEND_PORT set BACKEND_PORT=8080
if not defined FRONTEND_PORT set FRONTEND_PORT=3030

:: ---- Backend ----
echo [1/3] Starting backend...
cd /d "%BACKEND_DIR%"

if not exist "venv" (
    echo   Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install fastapi uvicorn sqlalchemy httpx python-dateutil pydantic -q
) else (
    call venv\Scripts\activate.bat
)

start /b python main.py
echo   Waiting for backend...

:wait_backend
timeout /t 1 /nobreak >nul
curl -s --noproxy localhost http://localhost:%BACKEND_PORT%/api/suppliers >nul 2>&1
if errorlevel 1 goto wait_backend
echo   Backend ready

:: ---- Seed data ----
echo [2/3] Checking data...
for /f %%i in ('curl -s --noproxy localhost http://localhost:%BACKEND_PORT%/api/suppliers ^| python -c "import sys,json;print(len(json.load(sys.stdin)))"') do set COUNT=%%i
if "%COUNT%"=="0" (
    curl -s --noproxy localhost -X POST http://localhost:%BACKEND_PORT%/api/seed >nul
    echo   Seed data loaded
) else (
    echo   Database has data, skipping
)

:: ---- Frontend ----
echo [3/3] Starting frontend...
cd /d "%FRONTEND_DIR%"

if not exist "node_modules" (
    echo   Installing dependencies...
    call npm install -q
)

start /b cmd /c "set PORT=%FRONTEND_PORT% && npx next dev -p %FRONTEND_PORT%"
echo   Waiting for frontend...

:wait_frontend
timeout /t 1 /nobreak >nul
curl -s --noproxy localhost http://localhost:%FRONTEND_PORT% >nul 2>&1
if errorlevel 1 goto wait_frontend

echo.
echo  ====================================
echo   KeyForge is running!
echo   Backend:  http://localhost:%BACKEND_PORT%
echo   Frontend: http://localhost:%FRONTEND_PORT%
echo  ====================================
echo   Press Ctrl+C to stop
echo.

:: Keep window open
pause >nul
