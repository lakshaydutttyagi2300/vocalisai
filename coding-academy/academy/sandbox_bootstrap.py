"""Runs ONE practice program inside a separate, restricted Python process.

python_runner.py starts this file like this:

    python -I -X utf8 sandbox_bootstrap.py <job.json>

It must only use the Python standard library, because it runs on its own.

What it does, in order:
1. Reads the job (your code, optional automatic checks, the practice folder).
2. Moves into the practice folder ("sandbox") so files you create land there.
3. Applies safety rules:
   - output limit (a runaway print loop cannot flood the app),
   - memory/CPU/file-size limits (Linux and macOS only),
   - an "audit hook" that refuses to write, rename or delete files outside the
     practice folder, and refuses to start other programs.
4. Runs your code, then any automatic checks, and writes a result file.

IMPORTANT: this is a safety net against accidents, not a security wall.
Code that is deliberately written to escape it could do so. Only run code
you understand - which is what the lessons teach you to do anyway.
"""

from __future__ import annotations

import builtins
import io
import json
import linecache
import os
import sys
import time
import traceback

CODE_FILENAME = "your_code.py"
BOOTSTRAP_FILE = os.path.abspath(__file__)

# Events that are always refused inside the practice lab.
BLOCKED_EVENT_PREFIXES = (
    "subprocess.",
    "os.system",
    "os.exec",
    "os.spawn",
    "os.posix_spawn",
    "os.fork",
    "os.forkpty",
    "os.startfile",
    "os.kill",
    "os.killpg",
    "os.symlink",
    "os.link",
    "os.mkfifo",
    "os.mknod",
    "os.chroot",
    "pty.",
    "ctypes.",
    "winreg.",
    "_winapi.CreateProcess",
    "_winapi.TerminateProcess",
    "sqlite3.enable_load_extension",
    "sqlite3.load_extension",
)

# Events that change files: which arguments are paths that must stay inside
# the practice folder.
PATH_EVENTS = {
    "os.remove": (0,),
    "os.rmdir": (0,),
    "os.mkdir": (0,),
    "os.rename": (0, 1),
    "os.truncate": (0,),
    "os.chmod": (0,),
    "os.chown": (0,),
    "os.chflags": (0,),
    "os.lchflags": (0,),
    "os.lchmod": (0,),
    "os.utime": (0,),
    "os.setxattr": (0,),
    "os.removexattr": (0,),
    "shutil.rmtree": (0,),
    "shutil.copyfile": (1,),
    "shutil.copymode": (1,),
    "shutil.copystat": (1,),
    "shutil.copytree": (1,),
    "shutil.make_archive": (0,),
    "shutil.unpack_archive": (1,),
}

FRIENDLY_EVENT_NAMES = {
    "subprocess.": "starting another program",
    "os.system": "starting another program",
    "os.exec": "starting another program",
    "os.spawn": "starting another program",
    "os.posix_spawn": "starting another program",
    "os.startfile": "opening files with other programs",
    "os.fork": "creating extra processes",
    "os.kill": "stopping other programs",
    "ctypes.": "low-level system access (ctypes)",
    "winreg.": "changing Windows settings (the registry)",
    "sqlite3.enable_load_extension": "loading SQLite extensions",
}

SANDBOX_MARKER = "[Practice lab safety rule]"


class OutputLimitReached(Exception):
    """Raised when a program prints more text than the lab allows."""


class LimitedWriter(io.TextIOBase):
    """A stand-in for sys.stdout/sys.stderr that stops after a size limit."""

    def __init__(self, target, budget: dict, captured: list | None = None):
        self._target = target
        self._budget = budget
        self._captured = captured

    @property
    def encoding(self):  # noqa: D401 - mimic a real text stream
        return "utf-8"

    def writable(self) -> bool:
        return True

    def isatty(self) -> bool:
        return False

    def write(self, text):
        if not isinstance(text, str):
            raise TypeError(f"write() argument must be str, not {type(text).__name__}")
        left = self._budget["left"]
        if left <= 0:
            self._budget["truncated"] = True
            raise OutputLimitReached(
                f"Your program printed more than {self._budget['limit']:,} characters, "
                "so the lab stopped it. Check for a loop that never ends."
            )
        chunk = text if len(text) <= left else text[:left]
        self._target.write(chunk)
        self._target.flush()  # so partial output survives if we are stopped
        if self._captured is not None:
            self._captured.append(chunk)
        self._budget["left"] = left - len(chunk)
        if len(chunk) < len(text):
            self._budget["truncated"] = True
            raise OutputLimitReached(
                f"Your program printed more than {self._budget['limit']:,} characters, "
                "so the lab stopped it. Check for a loop that never ends."
            )
        return len(text)

    def flush(self):
        self._target.flush()


def _norm(path: str) -> str:
    return os.path.normcase(os.path.realpath(path))


def make_audit_hook(sandbox: str):
    sandbox_norm = _norm(sandbox)
    state = {"busy": False}
    write_flags = os.O_WRONLY | os.O_RDWR | os.O_APPEND | os.O_CREAT | os.O_TRUNC

    def inside_sandbox(path) -> bool:
        if isinstance(path, int):  # an already-open file descriptor
            return True
        try:
            text = os.fsdecode(path)
        except Exception:
            return False
        full = _norm(os.path.join(os.getcwd(), text))
        return full == sandbox_norm or full.startswith(sandbox_norm + os.sep)

    def refuse(event: str, what: str, path=None):
        detail = f" ({path!s})" if path is not None else ""
        raise PermissionError(f"{SANDBOX_MARKER} {what} is not allowed in the practice lab{detail}.")

    def hook(event: str, args: tuple):
        if state["busy"]:
            return
        state["busy"] = True
        try:
            for prefix in BLOCKED_EVENT_PREFIXES:
                if event.startswith(prefix):
                    what = next(
                        (v for k, v in FRIENDLY_EVENT_NAMES.items() if event.startswith(k)),
                        f"'{event}'",
                    )
                    refuse(event, what.capitalize())
            if event == "open" and args:
                path, mode, flags = (list(args) + [None, None, None])[:3]
                writing = bool(mode and any(c in str(mode) for c in "wax+"))
                if isinstance(flags, int) and flags & write_flags:
                    writing = True
                if writing and not inside_sandbox(path):
                    refuse(event, "Writing a file outside your practice folder", path)
            elif event == "sqlite3.connect" and args:
                database = os.fsdecode(args[0]) if not isinstance(args[0], int) else ""
                if database.startswith("file:"):
                    database = database[5:].split("?", 1)[0]
                if database not in ("", ":memory:") and "mode=memory" not in str(args[0]):
                    if not inside_sandbox(database):
                        refuse(event, "Opening a database outside your practice folder", database)
            elif event in PATH_EVENTS:
                for index in PATH_EVENTS[event]:
                    if index < len(args) and args[index] is not None and not inside_sandbox(args[index]):
                        refuse(event, "Changing files outside your practice folder", args[index])
        finally:
            state["busy"] = False

    return hook


def apply_resource_limits(limits: dict) -> None:
    """Memory/CPU/file-size limits. Only available on Linux and macOS."""
    try:
        import resource  # not available on Windows
    except ImportError:
        return
    wanted = [
        ("RLIMIT_CPU", limits.get("cpu_seconds")),
        ("RLIMIT_FSIZE", limits.get("file_size_bytes")),
    ]
    if sys.platform.startswith("linux"):
        wanted.append(("RLIMIT_AS", limits.get("memory_bytes")))
    for name, value in wanted:
        if value and hasattr(resource, name):
            try:
                resource.setrlimit(getattr(resource, name), (int(value), int(value)))
            except (ValueError, OSError):
                pass


def format_user_traceback(exc: BaseException) -> tuple[str, int | None]:
    """Traceback text without the lab's own internal lines, plus the line number."""
    tb = exc.__traceback__
    while tb is not None and tb.tb_frame.f_code.co_filename != CODE_FILENAME:
        tb = tb.tb_next
    te = traceback.TracebackException(type(exc), exc, tb)
    te.stack = traceback.StackSummary.from_list(
        [frame for frame in te.stack if os.path.abspath(frame.filename) != BOOTSTRAP_FILE]
    )
    line = None
    for frame in te.stack:
        if frame.filename == CODE_FILENAME:
            line = frame.lineno
    if isinstance(exc, SyntaxError) and exc.filename == CODE_FILENAME:
        line = exc.lineno
    return "".join(te.format()), line


def make_input(stdout_writer):
    """input() that shows the typed answer, like a real terminal would."""

    def lab_input(prompt: object = "") -> str:
        if prompt:
            stdout_writer.write(str(prompt))
        line = sys.stdin.readline()
        if not line:
            raise EOFError("EOF when reading a line")
        value = line[:-1] if line.endswith("\n") else line
        if value.endswith("\r"):
            value = value[:-1]
        stdout_writer.write(value + "\n")
        return value

    return lab_input


def main() -> int:
    with open(sys.argv[1], encoding="utf-8") as handle:
        job = json.load(handle)
    # Opened BEFORE the safety rules start, so we can still report results.
    result_file = open(job["result_path"], "w", encoding="utf-8")
    result: dict = {"status": "ok", "error": None, "tests": [], "output_truncated": False}

    sandbox = job["sandbox"]
    sys.dont_write_bytecode = True  # no stray __pycache__ folders
    os.chdir(sandbox)
    sys.path.insert(0, sandbox)  # lets you import your own modules saved in the practice folder
    apply_resource_limits(job.get("limits", {}))

    code = job["code"]
    linecache.cache[CODE_FILENAME] = (len(code), None, code.splitlines(True), CODE_FILENAME)

    budget = {"left": int(job.get("max_output", 200_000)), "limit": int(job.get("max_output", 200_000)),
              "truncated": False}
    captured: list[str] = []
    real_stdout, real_stderr = sys.stdout, sys.stderr
    sys.stdout = LimitedWriter(real_stdout, budget, captured)
    sys.stderr = LimitedWriter(real_stderr, budget)
    builtins.input = make_input(sys.stdout)

    namespace: dict = {"__name__": "__main__", "__file__": CODE_FILENAME, "__builtins__": builtins}
    started = time.perf_counter()
    sys.addaudithook(make_audit_hook(sandbox))

    try:
        compiled = compile(code, CODE_FILENAME, "exec")
    except (SyntaxError, ValueError) as exc:
        text, line = format_user_traceback(exc)
        result["status"] = "error"
        result["error"] = {"type": type(exc).__name__, "message": getattr(exc, "msg", str(exc)),
                           "line": line, "traceback": text}
        compiled = None

    if compiled is not None:
        try:
            exec(compiled, namespace)
        except SystemExit:
            pass  # exit() / sys.exit() simply ends the program
        except BaseException as exc:  # noqa: BLE001 - we report every error to the learner
            text, line = format_user_traceback(exc)
            result["status"] = "error"
            result["error"] = {"type": type(exc).__name__, "message": str(exc), "line": line,
                               "traceback": text,
                               "blocked": SANDBOX_MARKER in str(exc)}

    tests = job.get("tests") or []
    if tests and result["status"] == "ok":
        def capture_output(func, *args, **kwargs):
            """Call func and return (return value, text it printed)."""
            pieces: list[str] = []
            saved = sys.stdout
            sys.stdout = LimitedWriter(io.StringIO(), {"left": 50_000, "limit": 50_000, "truncated": False},
                                       pieces)
            try:
                value = func(*args, **kwargs)
            finally:
                sys.stdout = saved
            return value, "".join(pieces)

        namespace["OUTPUT"] = "".join(captured)
        namespace["capture_output"] = capture_output
        for test in tests:
            entry = {"name": test.get("name", "check"), "passed": False, "message": ""}
            try:
                exec(compile(test["code"], "<automatic check>", "exec"), namespace)
                entry["passed"] = True
            except AssertionError as exc:
                entry["message"] = str(exc)
            except BaseException as exc:  # noqa: BLE001
                entry["message"] = f"{type(exc).__name__}: {exc}"
            result["tests"].append(entry)

    result["duration"] = round(time.perf_counter() - started, 4)
    result["output_truncated"] = budget["truncated"]
    try:
        sys.stdout.flush()
    except Exception:  # noqa: BLE001
        pass
    sys.stdout, sys.stderr = real_stdout, real_stderr
    if result["error"]:
        real_stderr.write(result["error"]["traceback"])
    json.dump(result, result_file)
    result_file.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
