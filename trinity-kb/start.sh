#!/usr/bin/env sh
# Starts the Trinity Support Knowledge Base (macOS / Linux).
cd "$(dirname "$0")"
if [ ! -x .venv/bin/python ]; then
  echo "First run: setting up (needs internet once)..."
  python3 -m venv .venv && .venv/bin/pip install -r requirements.txt || exit 1
fi
( sleep 2; (command -v xdg-open >/dev/null && xdg-open http://127.0.0.1:8765) || open http://127.0.0.1:8765 ) >/dev/null 2>&1 &
exec .venv/bin/python -m tkb serve
