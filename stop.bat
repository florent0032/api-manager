@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║     Stopping API Manager Services        ║
echo  ╚══════════════════════════════════════════╝
echo.

:: 加载 .env 配置
set "PROJECT_DIR=%~dp0"
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

set "FOUND=0"

:: Find and kill processes on backend port
echo [1/2] Checking port %BACKEND_PORT% (Backend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%BACKEND_PORT% ^| findstr LISTENING 2^>nul') do (
    set "PID=%%a"
    if not "!PID!"=="" (
        echo      Found process on port %BACKEND_PORT% (PID: !PID!^), killing...
        taskkill /F /PID !PID! >nul 2>&1
        set "FOUND=1"
    )
)
if "!FOUND!"=="0" echo      Port %BACKEND_PORT% is free

set "FOUND=0"

:: Find and kill processes on frontend port
echo [2/2] Checking port %FRONTEND_PORT% (Frontend)...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :%FRONTEND_PORT% ^| findstr LISTENING 2^>nul') do (
    set "PID=%%a"
    if not "!PID!"=="" (
        echo      Found process on port %FRONTEND_PORT% (PID: !PID!^), killing...
        taskkill /F /PID !PID! >nul 2>&1
        set "FOUND=1"
    )
)
if "!FOUND!"=="0" echo      Port %FRONTEND_PORT% is free

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║           All services stopped!          ║
echo  ╚══════════════════════════════════════════╝
echo.

pause
