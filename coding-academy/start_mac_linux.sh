#!/usr/bin/env bash
# ================================================================
#  My Personal Coding Academy - start the app (macOS / Linux)
#  Run in Terminal from this folder:   bash start_mac_linux.sh
#  Your web browser opens the app. Keep the Terminal window open.
#  To STOP the app: press Ctrl + C in the Terminal window.
# ================================================================
cd "$(dirname "$0")"

if [ ! -x ".venv/bin/python" ]; then
    echo
    echo " The app is not installed yet. Run:  bash install_mac_linux.sh"
    echo
    exit 1
fi

echo "============================================================"
echo "  My Personal Coding Academy is starting..."
echo "  Your web browser will open in a few seconds."
echo "  If it does not, open your browser and go to:"
echo "       http://localhost:8501"
echo
echo "  Keep this window open while you use the app."
echo "  To stop the app, press Ctrl + C here."
echo "============================================================"
echo

exec .venv/bin/python -m streamlit run app.py
