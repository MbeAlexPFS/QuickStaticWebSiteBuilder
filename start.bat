@echo off
title QuickWebSiteBuilder
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Node.js n'est pas installe. Veuillez installer Node.js depuis https://nodejs.org
    pause
    exit /b 1
)
node server.js
pause
