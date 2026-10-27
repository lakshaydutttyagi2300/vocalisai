@echo off
rem ================================================================
rem  My Personal Coding Academy - start the app (Windows)
rem  Double-click this file. Your web browser opens the app.
rem  Keep this black window open while you use the app.
rem  To STOP the app: close this window (or press Ctrl + C in it).
rem ================================================================
cd /d "%~dp0"
title Coding Academy - keep this window open while you use the app

if not exist ".venv\Scripts\python.exe" (
    echo.
    echo  The app is not installed yet.
    echo  Please double-click install_windows.bat first, then try again.
    echo.
    pause
    exit /b 1
)

echo ============================================================
echo   My Personal Coding Academy is starting...
echo   Your web browser will open in a few seconds.
echo   If it does not, open your browser and go to:
echo        http://localhost:8501
echo.
echo   Keep this window open while you use the app.
echo   To stop the app, close this window.
echo ============================================================
echo.

".venv\Scripts\python.exe" -m streamlit run app.py

echo.
echo The app has stopped. You can close this window.
pause
