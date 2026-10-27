"""Optional local language model via Ollama (http://127.0.0.1:11434). Never a remote service by default."""
import json
import os
import platform
import shutil
import urllib.request
from urllib.parse import urlparse


def _is_local(url: str) -> bool:
    return urlparse(url).hostname in ("127.0.0.1", "localhost", "::1")


def status(settings) -> dict:
    url = settings["llm_url"]
    if not settings["llm_enabled"]:
        return {"available": False, "reason": "Local AI is switched off (retrieval-only mode)."}
    if not _is_local(url):
        return {"available": False, "reason": "Only a model running on this computer (localhost) is allowed."}
    try:
        with urllib.request.urlopen(url.rstrip("/") + "/api/tags", timeout=3) as r:
            models = [m["name"] for m in json.load(r).get("models", [])]
    except Exception:
        return {"available": False, "reason": "Ollama is not running on this computer."}
    if settings["llm_model"] not in models and f"{settings['llm_model']}:latest" not in models:
        return {"available": False, "models": models,
                "reason": f"Model '{settings['llm_model']}' is not downloaded. Run: ollama pull {settings['llm_model']}"}
    return {"available": True, "models": models, "reason": f"Using {settings['llm_model']}"}


def generate(settings, prompt: str, system: str) -> str:
    url = settings["llm_url"].rstrip("/") + "/api/generate"
    if not _is_local(url):
        raise RuntimeError("Remote model endpoints are not allowed.")
    body = json.dumps({"model": settings["llm_model"], "prompt": prompt, "system": system, "stream": False,
                       "options": {"temperature": 0.2}}).encode()
    req = urllib.request.Request(url, body, {"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=settings["llm_timeout"]) as r:
        return json.load(r).get("response", "").strip()


def hardware() -> dict:
    """Inspect *this* computer and suggest a model size (no assumptions)."""
    ram = None
    try:
        if os.name == "nt":
            import ctypes

            class MS(ctypes.Structure):
                _fields_ = [("l", ctypes.c_ulong), ("m", ctypes.c_ulong), ("t", ctypes.c_ulonglong),
                            ("a", ctypes.c_ulonglong), *[(f"x{i}", ctypes.c_ulonglong) for i in range(5)]]
            m = MS(); m.l = ctypes.sizeof(MS)
            ctypes.windll.kernel32.GlobalMemoryStatusEx(ctypes.byref(m))
            ram = m.t / 2**30
        elif platform.system() == "Darwin":
            import subprocess
            ram = int(subprocess.check_output(["sysctl", "-n", "hw.memsize"])) / 2**30
        else:
            with open("/proc/meminfo") as f:
                ram = int(f.readline().split()[1]) / 2**20
    except Exception:
        pass
    disk = shutil.disk_usage(os.path.expanduser("~")).free / 2**30
    gpu = bool(shutil.which("nvidia-smi"))
    if ram is None:
        rec = "Could not read memory size; try qwen2.5:1.5b first."
    elif ram < 8:
        rec = "Under 8 GB RAM: use retrieval-only mode, or try qwen2.5:1.5b (about 1 GB download; slow)."
    elif ram < 16:
        rec = "8-16 GB RAM: qwen2.5:3b or llama3.2:3b (about 2 GB download)."
    else:
        rec = "16 GB+ RAM: qwen2.5:7b or llama3.1:8b (about 4.7 GB download); 3B models are faster."
    if disk < 6:
        rec += " Warning: less than 6 GB free disk space."
    return {"os": f"{platform.system()} {platform.release()}", "cpus": os.cpu_count(), "ram_gb": round(ram, 1) if ram else None,
            "free_disk_gb": round(disk, 1), "nvidia_gpu": gpu, "ollama_installed": bool(shutil.which("ollama")), "recommendation": rec}
