"""Self-update from the app's public GitHub folder. Downloads only changed files; never touches data/ or .venv/.

Free: uses GitHub's public, unauthenticated endpoints (limit: 60 checks per hour per computer).
"""
import hashlib
import json
import subprocess
import sys
import tempfile
import urllib.request
from pathlib import Path
from urllib.parse import quote

from . import config

DEFAULT_SOURCE = {"owner": "lakshaydutttyagi2300", "repo": "vocalisai", "branch": "claude/upbeat-euler-2yv15n", "folder": "trinity-kb"}
MANIFEST = config.ROOT / ".update-manifest.json"
PROTECTED = ("data/", ".venv/", ".update-manifest.json")
CRLF = (".bat",)  # Windows batch files must keep Windows line endings


def source() -> dict:
    f = config.ROOT / "update-source.json"
    try:
        return {**DEFAULT_SOURCE, **json.loads(f.read_text())}
    except Exception:
        return DEFAULT_SOURCE


def _get(url, timeout=20) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "TrinitySupportKB-updater"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def blob_sha(data: bytes) -> str:
    return hashlib.sha1(b"blob %d\0" % len(data) + data).hexdigest()


def _local_sha(path: Path) -> str | None:
    if not path.is_file():
        return None
    data = path.read_bytes()
    if path.suffix.lower() in CRLF:
        data = data.replace(b"\r\n", b"\n")
    return blob_sha(data)


def remote_files(src) -> dict:
    url = (f"https://api.github.com/repos/{src['owner']}/{src['repo']}/git/trees/"
           f"{quote(src['branch'], safe='/')}?recursive=1")
    tree = json.loads(_get(url))
    prefix = src["folder"].strip("/") + "/"
    return {t["path"][len(prefix):]: t["sha"] for t in tree.get("tree", [])
            if t["type"] == "blob" and t["path"].startswith(prefix)}


def check_and_update(apply=True) -> dict:
    src = source()
    try:
        remote = remote_files(src)
    except Exception as e:
        return {"status": "offline", "message": f"Could not check for updates ({type(e).__name__}). Starting the current version."}
    if not remote:
        return {"status": "error", "message": "The update source has no app files. Nothing was changed."}
    try:
        old = json.loads(MANIFEST.read_text())
    except Exception:
        old = {}
    root = config.ROOT.resolve()
    changed = []
    for rel, sha in remote.items():
        if rel.startswith(PROTECTED) or ".." in Path(rel).parts:
            continue
        if _local_sha(root / rel) != sha:
            changed.append(rel)
    removed = [rel for rel in old if rel not in remote and not rel.startswith(PROTECTED) and (root / rel).is_file()]
    if not apply or (not changed and not removed):
        MANIFEST.write_text(json.dumps(remote))
        return {"status": "current" if not changed and not removed else "available", "changed": changed, "removed": removed,
                "message": "The app is up to date." if not changed and not removed else f"{len(changed) + len(removed)} file(s) can be updated."}
    raw = f"https://raw.githubusercontent.com/{src['owner']}/{src['repo']}/{quote(src['branch'], safe='/')}/{src['folder'].strip('/')}/"
    with tempfile.TemporaryDirectory() as tmp:  # download everything first, then swap in
        staged = {}
        for rel in changed:
            data = _get(raw + quote(rel))
            if blob_sha(data) != remote[rel]:
                return {"status": "error", "message": f"Download of {rel} was incomplete. Nothing was changed; try again later."}
            if rel.endswith(CRLF):
                data = data.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
            p = Path(tmp) / rel
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
            staged[rel] = p
        for rel, p in staged.items():
            dest = (root / rel).resolve()
            if root not in dest.parents:
                continue
            dest.parent.mkdir(parents=True, exist_ok=True)
            if rel == "start-windows.bat":  # the running script can't overwrite itself; it swaps on next start
                dest = root / "start-windows.new.bat"
            dest.write_bytes(p.read_bytes())
    for rel in removed:
        (root / rel).unlink(missing_ok=True)
    MANIFEST.write_text(json.dumps(remote))
    if "requirements.txt" in changed:
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-r", str(root / "requirements.txt")], check=False)
    return {"status": "updated", "changed": changed, "removed": removed,
            "message": f"Updated {len(changed)} file(s)" + (f", removed {len(removed)}" if removed else "") + "."}
