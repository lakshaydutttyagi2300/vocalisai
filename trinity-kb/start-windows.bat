@echo off
REM Starts the Trinity Support Knowledge Base. Double-click this file or the desktop icon.
cd /d "%~dp0"
title Trinity Support Knowledge Base

REM A downloaded update to this script is swapped in here, then the script restarts itself.
if exist start-windows.new.bat start "" cmd /c "timeout /t 1 >nul & move /y start-windows.new.bat start-windows.bat >nul & start-windows.bat" & exit /b

if exist .venv\Scripts\python.exe goto ready

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

:ready
REM Desktop shortcut, created once
powershell -NoProfile -ExecutionPolicy Bypass -Command "$d=[Environment]::GetFolderPath('Desktop'); $l=Join-Path $d 'Trinity Support KB.lnk'; if(-not(Test-Path $l)){$s=(New-Object -ComObject WScript.Shell).CreateShortcut($l); $s.TargetPath='%~dp0start-windows.bat'; $s.WorkingDirectory='%~dp0'; $s.IconLocation='%SystemRoot%\System32\shell32.dll,23'; $s.Save(); Write-Host '  Desktop shortcut created: Trinity Support KB'}"

REM Get the latest version (skipped quietly when offline)
.venv\Scripts\python.exe -m tkb update
if exist start-windows.new.bat goto restart

echo Starting... your browser will open in a few seconds.
start "" cmd /c "timeout /t 4 >nul & start http://127.0.0.1:8765"
.venv\Scripts\python.exe -m tkb serve
echo.
echo The app has stopped. If you see an error above, take a screenshot of this window.
pause
exit /b

:restart
echo Applying an update to the start-up script...
start "" cmd /c "timeout /t 1 >nul & move /y start-windows.new.bat start-windows.bat >nul & start-windows.bat"
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
