"""Backup and restore of everything that is yours.

A backup is a single .zip file containing:

    academy.db            your progress, notes, bookmarks, lab files, settings
    python_sandbox/...    files your practice programs created
    my_content/...        lessons/articles you added yourself
    manifest.json         when and how the backup was made

NOT included: API keys (data/secrets.json) - so backups are safe to store in
Google Drive - and the practice SQL databases (they can be rebuilt any time).

Restoring always makes an automatic "safety" backup of your current state
first, so a restore can itself be undone.
"""

from __future__ import annotations

import io
import json
import re
import shutil
import sqlite3
import tempfile
import zipfile
from dataclasses import dataclass
from datetime import datetime, timedelta
from pathlib import Path

from academy import APP_VERSION, db, paths

BACKUP_PREFIX = "academy-backup-"
MAX_UNCOMPRESSED = 500 * 1024 * 1024  # refuse suspiciously huge archives
MAX_SANDBOX_FILE = 20 * 1024 * 1024


@dataclass
class BackupInfo:
    path: Path
    created: datetime
    size: int
    reason: str


@dataclass
class BackupCheck:
    ok: bool
    message: str
    manifest: dict
    stats: dict


def backup_dir() -> Path:
    configured = db.get_setting("backup_dir").strip()
    folder = Path(configured).expanduser() if configured else paths.DEFAULT_BACKUP_DIR
    return folder


def _snapshot_database(target: Path) -> None:
    """Consistent copy of the live database using SQLite's own backup feature."""
    source = sqlite3.connect(paths.DB_PATH)
    dest = sqlite3.connect(target)
    try:
        source.backup(dest)
    finally:
        dest.close()
        source.close()


def create_backup(reason: str = "manual", folder: Path | None = None) -> Path:
    folder = Path(folder or backup_dir())
    folder.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    target = folder / f"{BACKUP_PREFIX}{stamp}-{reason}.zip"
    counter = 1
    while target.exists():
        counter += 1
        target = folder / f"{BACKUP_PREFIX}{stamp}-{reason}-{counter}.zip"

    with tempfile.TemporaryDirectory() as work:
        db_copy = Path(work) / "academy.db"
        _snapshot_database(db_copy)
        with sqlite3.connect(db_copy) as conn:
            version = conn.execute("PRAGMA user_version").fetchone()[0]
        conn.close()
        partial = target.with_suffix(".partial")
        with zipfile.ZipFile(partial, "w", zipfile.ZIP_DEFLATED) as archive:
            archive.write(db_copy, "academy.db")
            sandbox_files = 0
            if paths.SANDBOX_DIR.exists():
                for file in sorted(paths.SANDBOX_DIR.rglob("*")):
                    rel = file.relative_to(paths.SANDBOX_DIR)
                    if file.is_file() and rel.parts[0] != "tmp" and file.stat().st_size <= MAX_SANDBOX_FILE:
                        archive.write(file, f"python_sandbox/{rel.as_posix()}")
                        sandbox_files += 1
            content_files = 0
            if paths.MY_CONTENT_DIR.exists():
                for file in sorted(paths.MY_CONTENT_DIR.rglob("*")):
                    if file.is_file():
                        archive.write(file, f"my_content/{file.relative_to(paths.MY_CONTENT_DIR).as_posix()}")
                        content_files += 1
            manifest = {
                "app": "my-coding-academy",
                "app_version": APP_VERSION,
                "schema_version": version,
                "created_at": datetime.now().isoformat(timespec="seconds"),
                "reason": reason,
                "sandbox_files": sandbox_files,
                "my_content_files": content_files,
            }
            archive.writestr("manifest.json", json.dumps(manifest, indent=2))
        partial.replace(target)
    if reason == "auto":
        db.set_setting("last_auto_backup", datetime.now().isoformat(timespec="seconds"))
    db.set_setting("last_backup", datetime.now().isoformat(timespec="seconds"))
    return target


def list_backups(folder: Path | None = None) -> list[BackupInfo]:
    folder = Path(folder or backup_dir())
    if not folder.exists():
        return []
    result = []
    for path in folder.glob(f"{BACKUP_PREFIX}*.zip"):
        name = path.stem[len(BACKUP_PREFIX):]
        try:
            created = datetime.strptime(name[:19], "%Y-%m-%d_%H-%M-%S")
        except ValueError:
            created = datetime.fromtimestamp(path.stat().st_mtime)
        reason = re.sub(r"-\d+$", "", name[20:]) or "manual"
        result.append(BackupInfo(path, created, path.stat().st_size, reason))
    return sorted(result, key=lambda b: b.created, reverse=True)


def _open_zip(source: Path | bytes) -> zipfile.ZipFile:
    if isinstance(source, (bytes, bytearray)):
        return zipfile.ZipFile(io.BytesIO(source))
    return zipfile.ZipFile(source)


def inspect_backup(source: Path | bytes) -> BackupCheck:
    """Check that a file really is a valid backup before restoring it."""
    try:
        with _open_zip(source) as archive:
            names = archive.namelist()
            if "academy.db" not in names:
                return BackupCheck(False, "This .zip file is not a Coding Academy backup (no academy.db inside).",
                                   {}, {})
            total = sum(info.file_size for info in archive.infolist())
            if total > MAX_UNCOMPRESSED:
                return BackupCheck(False, "This backup is unexpectedly large, so it was not restored.", {}, {})
            for name in names:
                if name.startswith("/") or ".." in Path(name).parts or ":" in name:
                    return BackupCheck(False, "This backup contains unsafe file paths, so it was not restored.",
                                       {}, {})
            manifest = json.loads(archive.read("manifest.json")) if "manifest.json" in names else {}
            with tempfile.TemporaryDirectory() as work:
                db_copy = Path(work) / "academy.db"
                db_copy.write_bytes(archive.read("academy.db"))
                conn = sqlite3.connect(db_copy)
                try:
                    integrity = conn.execute("PRAGMA integrity_check").fetchone()[0]
                    version = conn.execute("PRAGMA user_version").fetchone()[0]
                    tables = {r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type='table'")}
                    stats = {}
                    if "lesson_progress" in tables:
                        stats["lessons opened"] = conn.execute("SELECT COUNT(*) FROM lesson_progress").fetchone()[0]
                        stats["lessons completed"] = conn.execute(
                            "SELECT COUNT(*) FROM lesson_progress WHERE completed_at IS NOT NULL").fetchone()[0]
                    if "notes" in tables:
                        stats["notes"] = conn.execute("SELECT COUNT(*) FROM notes").fetchone()[0]
                    if "quiz_attempts" in tables:
                        stats["quiz attempts"] = conn.execute("SELECT COUNT(*) FROM quiz_attempts").fetchone()[0]
                finally:
                    conn.close()
    except (zipfile.BadZipFile, sqlite3.DatabaseError, json.JSONDecodeError, OSError) as exc:
        return BackupCheck(False, f"This file could not be read as a backup ({exc}).", {}, {})
    if integrity != "ok":
        return BackupCheck(False, "The database inside this backup is damaged.", manifest, {})
    if version > db.SCHEMA_VERSION:
        return BackupCheck(False, "This backup was made by a newer version of the app. Update the app first.",
                           manifest, stats)
    missing = {"settings", "lesson_progress"} - tables
    if missing and version > 0:
        return BackupCheck(False, "This backup's database is missing expected tables.", manifest, stats)
    return BackupCheck(True, "This backup looks valid.", manifest, stats)


def _safe_extract(archive: zipfile.ZipFile, prefix: str, target: Path) -> int:
    count = 0
    target_resolved = target.resolve()
    for info in archive.infolist():
        if not info.filename.startswith(prefix) or info.is_dir():
            continue
        relative = info.filename[len(prefix):]
        destination = (target / relative).resolve()
        if target_resolved not in destination.parents:
            continue  # never write outside the target folder
        destination.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(info) as src, open(destination, "wb") as dst:
            shutil.copyfileobj(src, dst)
        count += 1
    return count


def restore_backup(source: Path | bytes, restore_files: bool = True) -> dict:
    """Replace current data with the backup's data (after a safety backup)."""
    check = inspect_backup(source)
    if not check.ok:
        raise ValueError(check.message)
    safety = create_backup("before-restore")
    with _open_zip(source) as archive, tempfile.TemporaryDirectory() as work:
        db_copy = Path(work) / "academy.db"
        db_copy.write_bytes(archive.read("academy.db"))
        db.migrate(db_copy)  # upgrade an older backup to the current structure
        src = sqlite3.connect(db_copy)
        dest = sqlite3.connect(paths.DB_PATH, timeout=15)
        try:
            src.backup(dest)  # SQLite copies page by page; works even while the app is running
        finally:
            dest.close()
            src.close()
        files = {"python_sandbox": 0, "my_content": 0}
        if restore_files:
            files["python_sandbox"] = _safe_extract(archive, "python_sandbox/", paths.SANDBOX_DIR)
            files["my_content"] = _safe_extract(archive, "my_content/", paths.MY_CONTENT_DIR)
    return {"safety_backup": safety, "files": files, "manifest": check.manifest}


def prune_backups(reason: str = "auto", keep: int = 10, folder: Path | None = None) -> int:
    old = [b for b in list_backups(folder) if b.reason == reason][keep:]
    for backup in old:
        backup.path.unlink(missing_ok=True)
    return len(old)


def maybe_auto_backup() -> Path | None:
    """Make an automatic backup if the last one is older than the chosen number of days."""
    try:
        days = int(db.get_setting("auto_backup_days") or 0)
    except ValueError:
        days = 7
    if days <= 0:
        return None
    last = db.get_setting("last_auto_backup")
    if last:
        try:
            if datetime.now() - datetime.fromisoformat(last) < timedelta(days=days):
                return None
        except ValueError:
            pass
    with db.connect() as conn:
        has_data = conn.execute("SELECT COUNT(*) FROM lesson_progress").fetchone()[0] > 0
    if not has_data:
        return None  # nothing worth backing up yet
    path = create_backup("auto")
    try:
        keep = int(db.get_setting("auto_backup_keep") or 10)
    except ValueError:
        keep = 10
    prune_backups("auto", keep=max(1, keep))
    return path
