"""Run a learner's Python code safely and collect the result.

The code never runs inside the app itself. Instead we start a *separate*
Python process (see sandbox_bootstrap.py) with:

* a time limit (default 10 seconds) - stops infinite loops,
* an output limit - stops endless printing,
* its working folder set to data/python_sandbox - files you create go there,
* rules that refuse writing/deleting files outside that folder and refuse
  starting other programs,
* memory/CPU limits on Linux and macOS (Windows only gets the time limit).
"""

from __future__ import annotations

import json
import os
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass, field
from pathlib import Path

from academy import paths

BOOTSTRAP = Path(__file__).with_name("sandbox_bootstrap.py")
DEFAULT_TIMEOUT = 10.0
MAX_OUTPUT_CHARS = 200_000

# Environment variables passed on to practice programs (everything else is dropped).
_ENV_KEEP = (
    "PATH", "SYSTEMROOT", "SYSTEMDRIVE", "WINDIR", "USERPROFILE", "HOME", "APPDATA", "LOCALAPPDATA",
    "LANG", "LC_ALL", "HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "http_proxy", "https_proxy", "no_proxy",
    "SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "TZ",
)


@dataclass
class RunResult:
    stdout: str = ""
    stderr: str = ""
    timed_out: bool = False
    duration: float = 0.0
    returncode: int | None = None
    error: dict | None = None  # {"type", "message", "line", "traceback", "blocked"}
    tests: list[dict] = field(default_factory=list)
    output_truncated: bool = False
    crashed: bool = False  # the helper process itself failed (not your code)
    timeout_seconds: float = DEFAULT_TIMEOUT

    @property
    def ok(self) -> bool:
        return not self.timed_out and self.error is None and not self.crashed


def _child_env(temp_dir: Path) -> dict[str, str]:
    env = {key: os.environ[key] for key in _ENV_KEEP if key in os.environ}
    env["TEMP"] = env["TMP"] = env["TMPDIR"] = str(temp_dir)
    return env


def run_python(
    code: str,
    stdin_text: str = "",
    *,
    timeout: float | None = None,
    tests: list[dict] | None = None,
    sandbox_dir: Path | None = None,
) -> RunResult:
    """Run ``code`` in a separate process and return what happened."""
    timeout = float(timeout or DEFAULT_TIMEOUT)
    sandbox = Path(sandbox_dir or paths.SANDBOX_DIR).resolve()
    sandbox.mkdir(parents=True, exist_ok=True)
    temp_dir = sandbox / "tmp"
    temp_dir.mkdir(exist_ok=True)

    if stdin_text and not stdin_text.endswith("\n"):
        stdin_text += "\n"

    with tempfile.TemporaryDirectory(prefix="academy-run-") as work:
        job_path = Path(work) / "job.json"
        result_path = Path(work) / "result.json"
        job = {
            "code": code,
            "tests": tests or [],
            "sandbox": str(sandbox),
            "result_path": str(result_path),
            "max_output": MAX_OUTPUT_CHARS,
            "limits": {
                "cpu_seconds": int(timeout) + 2,
                "file_size_bytes": 50 * 1024 * 1024,
                "memory_bytes": 2 * 1024 * 1024 * 1024,
            },
        }
        job_path.write_text(json.dumps(job), encoding="utf-8")
        command = [sys.executable, "-I", "-X", "utf8", str(BOOTSTRAP), str(job_path)]
        creationflags = getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0

        started = time.perf_counter()
        result = RunResult(timeout_seconds=timeout)
        try:
            proc = subprocess.run(
                command,
                input=stdin_text.encode("utf-8"),
                capture_output=True,
                cwd=str(sandbox),
                env=_child_env(temp_dir),
                timeout=timeout,
                creationflags=creationflags,
            )
            out_bytes, err_bytes = proc.stdout, proc.stderr
            result.returncode = proc.returncode
        except subprocess.TimeoutExpired as exc:
            out_bytes, err_bytes = exc.stdout or b"", exc.stderr or b""
            result.timed_out = True
        result.duration = round(time.perf_counter() - started, 3)
        result.stdout = out_bytes.decode("utf-8", errors="replace")[: MAX_OUTPUT_CHARS + 1000]
        result.stderr = err_bytes.decode("utf-8", errors="replace")[: MAX_OUTPUT_CHARS + 1000]

        if result_path.exists() and result_path.stat().st_size > 0:
            try:
                data = json.loads(result_path.read_text(encoding="utf-8"))
            except json.JSONDecodeError:
                data = None
            if data:
                result.error = data.get("error")
                result.tests = data.get("tests") or []
                result.output_truncated = bool(data.get("output_truncated"))
        elif not result.timed_out:
            # The process ended without writing a result: it was killed by a
            # memory/CPU limit, or Python itself failed to start.
            result.crashed = True
            if result.returncode is not None and result.returncode < 0:
                result.error = {
                    "type": "ResourceLimit",
                    "message": "Your program used too much memory or processor time and was stopped.",
                    "line": None,
                    "traceback": result.stderr,
                }
            else:
                result.error = {
                    "type": "LabError",
                    "message": "The practice lab could not run your program.",
                    "line": None,
                    "traceback": result.stderr,
                }
    return result


def clear_sandbox(sandbox_dir: Path | None = None) -> int:
    """Delete every file the practice programs created. Returns how many."""
    import shutil

    sandbox = Path(sandbox_dir or paths.SANDBOX_DIR)
    count = 0
    if not sandbox.exists():
        return 0
    for item in sandbox.iterdir():
        if item.is_dir():
            count += sum(1 for p in item.rglob("*") if p.is_file())
            shutil.rmtree(item, ignore_errors=True)
        else:
            item.unlink(missing_ok=True)
            count += 1
    return count


def list_sandbox_files(sandbox_dir: Path | None = None) -> list[Path]:
    sandbox = Path(sandbox_dir or paths.SANDBOX_DIR)
    if not sandbox.exists():
        return []
    files = [p for p in sandbox.rglob("*") if p.is_file() and "tmp" not in p.relative_to(sandbox).parts[:1]]
    return sorted(files)
