@echo off
title Deploying jonathangrishamauthor.com
cd /d "%~dp0"

set GIT="C:\Program Files\Git\cmd\git.exe"

REM Load token from local file (never committed to git)
call "%~dp0cf-token.bat"

echo Pulling latest from GitHub...
%GIT% pull origin main

echo Deploying to Cloudflare...
call npx wrangler@4 deploy > deploy-log.txt 2>&1
set ERR=%ERRORLEVEL%

type deploy-log.txt
echo.
if %ERR%==0 (echo ===== SUCCESS =====) else (echo ===== FAILED =====)
echo.
pause
