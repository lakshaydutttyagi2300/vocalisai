@echo off
REM Starts the Trinity Support Knowledge Base. Double-click this file.
cd /d "%~dp0"
title Trinity Support Knowledge Base

if exist .venv\Scripts\python.exe goto run

echo First run: setting up. This needs internet once and takes a few minutes...
set PY=
where py >nul 2>nul && set PY=py -3
if not defined PY where python >nul 2>nul && set PY=python
if not defined PY goto nopython

%PY% -m venv .venv
if errorlevel 1 goto failed
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install -r requirements.txt
if errorlevel 1 goto failed

:run
echo Starting... your browser will open in a few seconds.
start "" cmd /c "timeout /t 4 >nul & start http://127.0.0.1:8765"
.venv\Scripts\python.exe -m tkb serve
echo.
echo The app has stopped. If you see an error above, take a screenshot of this window.
pause
exit /b

:nopython
echo.
echo Python was not found. Reinstall Python from python.org and tick "Add python.exe to PATH".
pause
exit /b

:failed
echo.
echo Setup failed. Take a screenshot of this window and send it for help.
if exist .venv rmdir /s /q .venv
pause
exit /b
