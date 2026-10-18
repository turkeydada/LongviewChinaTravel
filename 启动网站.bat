@echo off
chcp 65001 >nul
title Longview China Travel - Website Server
cd /d "%~dp0"
echo ============================================
echo   Longview China Travel Website
echo ============================================
echo.
echo  Starting... Please keep this window open.
echo  Website address: http://localhost:3000
echo  Admin console:   http://localhost:3000/#/admin
echo  Press Ctrl+C twice to stop the server.
echo.
call npm run dev
pause
