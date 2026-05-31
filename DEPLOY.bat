@echo off
title Deploying jonathangrishamauthor.com
cd /d "%~dp0"
REM Set your Cloudflare API token here or in Windows environment variables
if "%CLOUDFLARE_API_TOKEN%"=="" set CLOUDFLARE_API_TOKEN=YOUR_TOKEN_HERE
echo Running deploy... > "%~dp0deploy-log.txt"
call npx wrangler@4 deploy >> "%~dp0deploy-log.txt" 2>&1
set ERR=%ERRORLEVEL%
echo Exit: %ERR% >> "%~dp0deploy-log.txt"
echo.
type "%~dp0deploy-log.txt"
echo.
if %ERR%==0 (echo ===== SUCCESS =====) else (echo ===== FAILED - see above =====)
echo.
pause
