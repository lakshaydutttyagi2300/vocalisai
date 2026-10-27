@echo off
rem ================================================================
rem  My Personal Coding Academy - installer for Windows
rem  Double-click this file once. It:
rem    1. finds Python on your computer
rem    2. creates a private Python folder for the app (.venv)
rem    3. downloads and installs the packages the app needs
rem  Needs an internet connection. Safe to run again at any time.
rem ================================================================
setlocal
cd /d "%~dp0"
title Coding Academy - installer

echo ============================================================
echo   My Personal Coding Academy - installer
echo ============================================================
echo.
echo Step 1 of 3: looking for Python...

rem Prefer the Python versions the app was tested with (3.13, 3.14), then 3.12, then any Python.
set "PY="
py -3.13 --version >nul 2>nul && set "PY=py -3.13"
if not defined PY py -3.14 --version >nul 2>nul && set "PY=py -3.14"
if not defined PY py -3.12 --version >nul 2>nul && set "PY=py -3.12"
if not defined PY py -3 --version >nul 2>nul && set "PY=py -3"
if not defined PY python --version >nul 2>nul && set "PY=python"

if not defined PY (
    echo.
    echo  PROBLEM: Python was not found on this computer.
    echo.
    echo  What to do:
    echo   1. Go to https://www.python.org/downloads/ and download Python 3.13 for Windows.
    echo   2. Run the installer. On the FIRST screen tick the box "Add python.exe to PATH".
    echo   3. Click "Install Now" and wait until it finishes.
    echo   4. Double-click this install_windows.bat file again.
    echo.
    pause
    exit /b 1
)

%PY% -c "import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)"
if errorlevel 1 (
    echo.
    echo  PROBLEM: your Python is too old. This app needs Python 3.12 or newer.
    %PY% --version
    echo  Install Python 3.13 from https://www.python.org/downloads/ and run this file again.
    echo.
    pause
    exit /b 1
)
echo Found:
%PY% --version
%PY% -c "import sys; sys.exit(0 if sys.version_info < (3, 15) else 1)"
if errorlevel 1 (
    echo.
    echo  NOTE: this Python is newer than the versions the app was tested with - 3.13 and 3.14.
    echo  Some packages may not be ready for it yet. If the installation below fails,
    echo  install Python 3.14 from https://www.python.org/downloads/ - you can keep your
    echo  current Python - and run this file again. It will then use 3.14 automatically.
)
echo.

echo Step 2 of 3: creating the app's private Python folder (.venv)...
rem A .venv made with a different Python version (e.g. after a failed install) is rebuilt.
if exist ".venv\pyvenv.cfg" (
    %PY% -c "import re, sys; t = open('.venv/pyvenv.cfg').read(); m = re.search(r'^version\w*\s*=\s*(\d+)\.(\d+)', t, re.M); sys.exit(0 if m and (int(m[1]), int(m[2])) == sys.version_info[:2] else 1)"
    if errorlevel 1 (
        echo The existing .venv folder was made with a different Python version - rebuilding it...
        rmdir /s /q .venv
    )
)
if exist ".venv\Scripts\python.exe" (
    echo The .venv folder already exists - reusing it.
) else (
    %PY% -m venv .venv
    if errorlevel 1 (
        echo.
        echo  PROBLEM: could not create the .venv folder. See the message above.
        echo  Tip: move the app folder somewhere you can write to, e.g. Documents.
        echo.
        pause
        exit /b 1
    )
)
echo.

echo Step 3 of 3: installing packages - this can take 2 to 10 minutes...
".venv\Scripts\python.exe" -m pip install --upgrade pip
".venv\Scripts\python.exe" -m pip install -r requirements.txt -c constraints.txt
if errorlevel 1 (
    echo.
    echo  PROBLEM: some packages could not be installed. See the messages above.
    echo  Most common causes:
    echo   - No internet connection: connect and run this file again.
    echo   - A brand-new Python version without ready-made packages yet:
    echo     install Python 3.14 and run this file again - you can keep your other Python.
    echo.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   Installation finished successfully!
echo   To start the app, double-click  start_windows.bat
echo ============================================================
echo.
pause
