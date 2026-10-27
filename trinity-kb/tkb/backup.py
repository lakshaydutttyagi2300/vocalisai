"""One-click backup, restore and a documented JSON-lines export."""
import json
import shutil
import sqlite3
import tempfile
import zipfile
from datetime import datetime
from pathlib import Path

from . import config, db

SECRET_KEYS = ("token", "password", "secret", "api_key")


def create_backup(conn, include_drafts=True) -> Path:
    """Zip containing knowledge.db (consistent snapshot), documents/ and settings.json."""
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    out = config.backups_dir() / f"tkb-backup-{stamp}.zip"
    with tempfile.TemporaryDirectory() as tmp:
        snap = Path(tmp) / "knowledge.db"
        dest = sqlite3.connect(snap)
        conn.backup(dest)
        if not include_drafts:
            dest.executescript("DELETE FROM evidence_refs; DELETE FROM drafts; DELETE FROM search_history;")
        dest.execute("DELETE FROM settings WHERE " + " OR ".join(f"key LIKE '%{k}%'" for k in SECRET_KEYS))
        dest.commit(); dest.close()
        settings = {k: v for k, v in db.all_settings(conn).items() if not any(s in k for s in SECRET_KEYS)}
        with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
            z.write(snap, "knowledge.db")
            z.writestr("settings.json", json.dumps(settings, indent=2))
            z.writestr("manifest.json", json.dumps({"app": "trinity-support-kb", "format": 1, "created": stamp}))
            for f in config.docs_dir().iterdir():
                if f.is_file():
                    z.write(f, f"documents/{f.name}")
    return out


def restore_backup(zip_path) -> Path:
    """Restore a backup. The current data is first saved as a safety backup. Returns that safety copy path."""
    zip_path = Path(zip_path)
    with zipfile.ZipFile(zip_path) as z:
        names = z.namelist()
        if "knowledge.db" not in names or "manifest.json" not in names:
            raise ValueError("This is not a backup made by this application.")
        if any(n.startswith("/") or ".." in Path(n).parts for n in names):
            raise ValueError("The backup contains unsafe file paths.")
        with tempfile.TemporaryDirectory() as tmp:
            z.extractall(tmp)
            test = sqlite3.connect(Path(tmp) / "knowledge.db")
            if test.execute("PRAGMA integrity_check").fetchone()[0] != "ok":
                raise ValueError("The database inside the backup is damaged.")
            test.close()
            conn = db.connect()
            safety = create_backup(conn)
            conn.close()
            for suffix in ("", "-wal", "-shm"):
                Path(str(config.db_path()) + suffix).unlink(missing_ok=True)
            shutil.copyfile(Path(tmp) / "knowledge.db", config.db_path())
            docs = config.docs_dir()
            shutil.rmtree(docs)
            docs.mkdir()
            src_docs = Path(tmp) / "documents"
            if src_docs.exists():
                for f in src_docs.iterdir():
                    shutil.copyfile(f, docs / f.name)
    # stored paths are made portable: point them at this computer's documents folder
    conn = db.connect()
    for r in conn.execute("SELECT id, stored_path FROM sources WHERE stored_path IS NOT NULL").fetchall():
        conn.execute("UPDATE sources SET stored_path=? WHERE id=?", (str(config.docs_dir() / Path(r["stored_path"]).name), r["id"]))
    conn.commit(); conn.close()
    return safety


def export_jsonl(conn, out: Path) -> Path:
    """One JSON object per line: {"type":"source",...} followed by its {"type":"passage",...} lines."""
    with open(out, "w", encoding="utf-8") as f:
        for s in conn.execute("SELECT * FROM sources ORDER BY id"):
            f.write(json.dumps({"type": "source", **dict(s)}, ensure_ascii=False) + "\n")
            for p in conn.execute("SELECT id,source_id,page,sheet,cell_ref,heading,text,content_hash FROM passages WHERE source_id=? ORDER BY ord", (s["id"],)):
                f.write(json.dumps({"type": "passage", **dict(p)}, ensure_ascii=False) + "\n")
    return out
