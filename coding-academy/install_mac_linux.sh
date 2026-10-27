#!/usr/bin/env bash
# ================================================================
#  My Personal Coding Academy - installer for macOS and Linux
#  Run once in Terminal from this folder:   bash install_mac_linux.sh
#  It finds Python, creates the app's private Python folder (.venv)
#  and installs the packages the app needs. Needs internet.
#  Safe to run again at any time.
# ================================================================
set -u
cd "$(dirname "$0")"

echo "============================================================"
echo "  My Personal Coding Academy - installer"
echo "============================================================"
echo
echo "Step 1 of 3: looking for Python..."

PY=""
for candidate in python3.13 python3.14 python3.12 python3.15 python3 python; do
    if command -v "$candidate" >/dev/null 2>&1; then
        if "$candidate" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 12) else 1)' 2>/dev/null; then
            PY="$candidate"
            break
        fi
    fi
done

if [ -z "$PY" ]; then
    echo
    echo " PROBLEM: Python 3.12 or newer was not found."
    echo "  - Mac: download Python 3.13 from https://www.python.org/downloads/ and install it,"
    echo "         then close and reopen Terminal and run this script again."
    echo "  - Linux (Ubuntu/Debian): sudo apt install python3 python3-venv"
    exit 1
fi
echo "Found: $("$PY" --version)"
echo

echo "Step 2 of 3: creating the app's private Python folder (.venv)..."
# A .venv made with a different Python version (e.g. after a failed install) is rebuilt.
if [ -f ".venv/pyvenv.cfg" ] && ! "$PY" -c "import re, sys; t = open('.venv/pyvenv.cfg').read(); m = re.search(r'^version\w*\s*=\s*(\d+)\.(\d+)', t, re.M); sys.exit(0 if m and (int(m[1]), int(m[2])) == sys.version_info[:2] else 1)"; then
    echo "The existing .venv folder was made with a different Python version - rebuilding it..."
    rm -rf .venv
fi
if [ -x ".venv/bin/python" ]; then
    echo "The .venv folder already exists - reusing it."
else
    if ! "$PY" -m venv .venv; then
        echo
        echo " PROBLEM: could not create the .venv folder."
        echo "  On Ubuntu/Debian install the venv module first: sudo apt install python3-venv"
        exit 1
    fi
fi
echo

echo "Step 3 of 3: installing packages - this can take 2 to 10 minutes..."
.venv/bin/python -m pip install --upgrade pip
if ! .venv/bin/python -m pip install -r requirements.txt -c constraints.txt; then
    echo
    echo " PROBLEM: some packages could not be installed (see the messages above)."
    echo "  - Check your internet connection and run this script again."
    echo "  - If you use a brand-new Python version, install Python 3.14 (you can keep your other"
    echo "    Python) and run this script again."
    exit 1
fi

echo
echo "============================================================"
echo "  Installation finished successfully!"
echo "  To start the app run:   bash start_mac_linux.sh"
echo "============================================================"
