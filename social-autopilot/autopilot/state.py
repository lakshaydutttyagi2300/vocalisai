"""Run state kept in R2 (`social-autopilot/state.json`): what was posted, which comments were
answered and the current (auto-refreshed) Instagram token. Not in git: the repo is public.
Falls back to a local file for dry runs without R2."""
from __future__ import annotations

import json
from pathlib import Path

from . import r2
from .brand import ROOT

LOCAL = ROOT / ".state.json"
KEY = "state.json"
EMPTY = {"posted": {}, "replied": [], "tokens": {}, "log": []}


def load() -> dict:
    raw = r2.get_bytes(KEY) if r2.configured() else (LOCAL.read_bytes() if LOCAL.exists() else None)
    state = json.loads(raw) if raw else {}
    for k, v in EMPTY.items():
        state.setdefault(k, type(v)())
    return state


def save(state: dict) -> None:
    state["replied"] = state["replied"][-3000:]
    state["log"] = state["log"][-300:]
    data = json.dumps(state, indent=1, ensure_ascii=False).encode()
    if r2.configured():
        r2.put_bytes(KEY, data, "application/json")
    else:
        LOCAL.write_bytes(data)
