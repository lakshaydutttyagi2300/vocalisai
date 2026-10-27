# Troubleshooting (technical)

The beginner-friendly version is in the app: **Help & Troubleshooting → Troubleshooting**, and in README
section 14. This page adds technical detail for a maintainer.

## Installation

- **`py` / `python` not found (Windows):** Python not installed or not on PATH. Reinstall with
  "Add python.exe to PATH". The installer tries `py -3.13`, `py -3`, then `python`.
- **Microsoft Store opens when typing `python`:** that is Windows' "App execution alias". Install Python from
  python.org, or disable the alias in *Settings → Apps → Advanced app settings → App execution aliases*.
- **pip tries to build `pyarrow`/`numpy` from source:** no binary wheel for that Python version/platform. Use
  Python 3.13 (wheels exist for 3.12-3.15 for the pinned versions as of October 2026).
- **Corporate proxy / no internet:** pip honours the `HTTPS_PROXY` environment variable. Offline installation
  is possible from a wheel folder: on a connected machine run
  `python -m pip download -r requirements.txt -c constraints.txt -d wheels`, copy `wheels/`, then
  `python -m pip install --no-index --find-links wheels -r requirements.txt`.
- **Broken `.venv`:** delete the `.venv` folder and run the installer again. Your data is not in `.venv`.

## Starting

- **Port in use:** another Streamlit instance is running. Streamlit picks the next free port automatically
  unless `server.port` is set; check the URL printed in the terminal.
- **Blank page / "Please wait..." forever:** browser extensions blocking WebSockets, or a very old browser.
  Try another browser.
- **First start asks for an email:** should not happen (`server.showEmailPrompt = false`). If it does, press
  Enter to skip.

## Python lab

- **Everything times out:** check *Settings → Python time limit*. The child process is started with
  `sys.executable -I -X utf8 academy/sandbox_bootstrap.py`. If antivirus software delays starting new
  processes, increase the limit.
- **`LabError: The practice lab could not run your program`:** the child process died without writing a result
  (antivirus blocking `python.exe`, disk full). The technical details expander shows stderr.
- **Imports of packages fail:** practice programs run with the app's `.venv` Python and can import any package
  installed there (`.venv\Scripts\python -m pip install <package>`).

## SQL lab

- **"database is locked":** another program (e.g. DB Browser for SQLite) has a practice database open. Close it.
- **Practice database corrupt:** delete `data/practice_databases/<name>.db`; it is rebuilt automatically.

## Data

- **Progress database damaged** (very rare - e.g. power loss during a write): stop the app, rename
  `data/academy.db` to `academy-damaged.db`, start the app (a new empty database is created), then restore your
  latest backup.
- **Inspecting the data:** `data/academy.db` is a normal SQLite file. Open it with any SQLite tool (e.g. DB
  Browser for SQLite) - but stop the app first, and make a backup, if you plan to edit it.

## Content

- **"Content file problem":** the message names the file and the YAML/format error. The usual culprit is an
  unquoted value containing `: ` - see `CONTENT_FORMAT.md` → YAML tips.
- Run `pytest tests/test_content.py` to validate everything, including that each model solution passes.
