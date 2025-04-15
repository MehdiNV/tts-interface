@echo off
REM Change directory to the location of the batch file.
cd /d "%~dp0"

REM Launch http-server bound to 127.0.0.1 on port 8080 in background.
start /B npx http-server -a 127.0.0.1 -p 8080

REM Wait 1 second to give the server time to start.
timeout /T 1 /NOBREAK >nul

REM Open the website in the default browser.
start http://127.0.0.1:8080
