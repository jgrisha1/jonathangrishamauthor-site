@echo off
title Deploying jonathangrishamauthor.com
cd /d "%~dp0"

set GIT="C:\Program Files\Git\cmd\git.exe"

echo Pulling latest from GitHub...
%GIT% pull origin main

echo Running deploy...
set CLOUDFLARE_API_TOKEN=cfut_fu8jSOQrdSm6VeHBbSUckNWniyNUWFRC6etD3ltHf4fc8ea9
call npx wrangler@4 deploy > deploy-log.txt 2>&1
set ERR=%ERRORLEVEL%

type deploy-log.txt
echo.
if %ERR%==0 (echo ===== SUCCESS =====) else (echo ===== FAILED =====)
echo.
pause
