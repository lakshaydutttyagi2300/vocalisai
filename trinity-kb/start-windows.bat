@echo off
REM Starts the Trinity Support Knowledge Base. Double-click this file.
cd /d "%~dp0"
if not exist .venv\Scripts\python.exe (
  echo First run: setting up (needs internet once, a few minutes)...
  py -3 -m venv .venv || python -m venv .venv
  .venv\Scripts\python.exe -m pip install --upgrade pip
  .venv\Scripts\python.exe -m pip install -r requirements.txt
)
start "" http://127.0.0.1:8765
.venv\Scripts\python.exe -m tkb serve
pause
