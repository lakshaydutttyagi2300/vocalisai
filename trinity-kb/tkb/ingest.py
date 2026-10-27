"""Import, update and remove internal documents; write passages to the index."""
import hashlib
import json
import re
import shutil
from datetime import datetime, timezone
from pathlib import Path

from . import config, db
from .extract import SUPPORTED, ExtractionError, extract

REF_RE = re.compile(r"\b[A-Za-z]{1,6}[-/]?\d{3,}[A-Za-z0-9]*\b|\b\d{5,}\b")


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def norm_hash(text: str) -> str:
    return sha256_bytes(re.sub(r"\s+", " ", text.lower()).strip().encode())


def shape(token: str) -> str:
    """'TC123456' -> 'AA999999'. Lets you search by booking-reference *format*."""
    return re.sub(r"[A-Za-z]", "A", re.sub(r"\d", "9", token)).upper().replace("-", "").replace("/", "")


def shapes_of(text: str) -> str:
    return " ".join(sorted({shape(m) for m in REF_RE.findall(text)}))


def guess_category(filename: str) -> str:
    n = filename.lower()
    if re.search(r"q\s*&\s*a|\bqa\b|faq|question", n):
        return "D"
    if re.search(r"triage|directory|procedure|workflow|process|routing", n):
        return "B"
    if re.search(r"guide|training|example|booking|registration", n):
        return "C"
    return "E"


def write_passages(conn, source_id: int, name: str, passages: list[dict]) -> tuple[int, int]:
    """Insert passages; identical passages within one source are stored once. Returns (added, duplicates)."""
    added = dupes = 0
    for i, p in enumerate(passages):
        text = p["text"].strip()
        if not text:
            continue
        h = norm_hash(text)
        cur = conn.execute(
            "INSERT OR IGNORE INTO passages(source_id,ord,page,sheet,cell_ref,heading,text,content_hash,shapes) VALUES(?,?,?,?,?,?,?,?,?)",
            (source_id, i, p.get("page"), p.get("sheet"), p.get("cell_ref"), p.get("heading"), text, h, shapes_of(text)))
        if cur.rowcount == 0:
            dupes += 1
            continue
        conn.execute("INSERT INTO passages_fts(rowid,text,heading,name,shapes) VALUES(?,?,?,?,?)",
                     (cur.lastrowid, text, p.get("heading") or "", name, shapes_of(text)))
        added += 1
    return added, dupes


def _log_job(conn, kind, status, summary, errors=()):
    cur = conn.execute("INSERT INTO jobs(kind,started_at,finished_at,status,summary) VALUES(?,?,?,?,?)",
                       (kind, db.now(), db.now(), status, summary))
    for target, msg in errors:
        conn.execute("INSERT INTO job_errors(job_id,target,message,at) VALUES(?,?,?,?)", (cur.lastrowid, target, msg, db.now()))


def import_file(conn, path, category: str | None = None, original_name: str | None = None) -> dict:
    """Import or update one file. Returns a result dict with status:
    added | updated | unchanged | duplicate | failed | unsupported."""
    path = Path(path)
    name = original_name or path.name
    if path.suffix.lower() not in SUPPORTED:
        _log_job(conn, "import", "failed", f"{name}: unsupported type", [(name, "Unsupported file type")])
        conn.commit()
        return {"status": "unsupported", "name": name, "message": f"File type {path.suffix} is not supported."}
    data = path.read_bytes()
    checksum = sha256_bytes(data)
    mtime = datetime.fromtimestamp(path.stat().st_mtime, timezone.utc).replace(microsecond=0).isoformat()
    existing = conn.execute("SELECT * FROM sources WHERE kind='file' AND name=?", (name,)).fetchone()
    same = conn.execute("SELECT * FROM sources WHERE kind='file' AND checksum=? AND status!='failed'", (checksum,)).fetchone()
    if existing and existing["checksum"] == checksum and existing["status"] != "failed":
        return {"status": "unchanged", "name": name, "source_id": existing["id"], "message": "Already imported; no changes detected."}
    if same and (not existing or same["id"] != existing["id"]):
        _log_job(conn, "import", "duplicate", f"{name} is identical to {same['name']}")
        conn.commit()
        return {"status": "duplicate", "name": name, "source_id": same["id"],
                "message": f"Identical content is already imported as '{same['name']}'. Not imported again."}

    stored = config.docs_dir() / f"{checksum[:12]}_{re.sub(r'[^A-Za-z0-9._-]', '_', name)}"
    if path.resolve() != stored.resolve():
        shutil.copyfile(path, stored)
    cat = category or (existing["category"] if existing else guess_category(name))
    try:
        ex = extract(stored)
    except ExtractionError as e:
        msg = str(e)
        if existing and existing["status"] != "failed":
            warnings = json.loads(existing["warnings"]) + [f"Update on {db.now()[:10]} failed: {msg} Previous version is still in use."]
            conn.execute("UPDATE sources SET warnings=? WHERE id=?", (json.dumps(warnings), existing["id"]))
        else:
            sid = _upsert_source(conn, existing, name, cat, None, stored, checksum, mtime, "failed", [msg], 0)
            existing = {"id": sid}
        _log_job(conn, "import", "failed", f"{name}: {msg}", [(name, msg)])
        conn.commit()
        return {"status": "failed", "name": name, "source_id": existing["id"], "message": msg}

    status = "ok_with_warnings" if ex.warnings else "ok"
    if not ex.passages:
        status = "failed"
        ex.warnings.append("No text could be extracted from this file.")
    sid = _upsert_source(conn, existing, name, cat, ex, stored, checksum, mtime, status, ex.warnings, ex.unit_count)
    db.delete_source_passages(conn, sid)
    added, dupes = write_passages(conn, sid, name, ex.passages)
    if dupes:
        conn.execute("UPDATE sources SET warnings=? WHERE id=?",
                     (json.dumps(ex.warnings + [f"{dupes} repeated passage(s) stored once."]), sid))
    ver = conn.execute("SELECT version FROM sources WHERE id=?", (sid,)).fetchone()[0]
    conn.execute("INSERT INTO source_versions(source_id,version,checksum,recorded_at,note) VALUES(?,?,?,?,?)",
                 (sid, ver, checksum, db.now(), "updated" if existing else "imported"))
    _log_job(conn, "import", status, f"{name}: {added} passages", [(name, w) for w in ex.warnings])
    conn.commit()
    if existing and existing["stored_path"] and existing["stored_path"] != str(stored):
        Path(existing["stored_path"]).unlink(missing_ok=True)
    return {"status": "updated" if existing else "added", "name": name, "source_id": sid, "passages": added,
            "duplicates": dupes, "warnings": ex.warnings, "processing": status,
            "message": f"{added} passages indexed" + (f"; {len(ex.warnings)} warning(s)" if ex.warnings else "")}


def _upsert_source(conn, existing, name, cat, ex, stored, checksum, mtime, status, warnings, units):
    title = ex.title if ex else None
    pages = ex.page_count if ex else None
    if existing:
        conn.execute("""UPDATE sources SET category=?, title=?, stored_path=?, checksum=?, file_mtime=?, imported_at=?,
                        status=?, warnings=?, version=version+1, page_count=?, unit_count=?, active=1 WHERE id=?""",
                     (cat, title, str(stored), checksum, mtime, db.now(), status, json.dumps(warnings), pages, units, existing["id"]))
        return existing["id"]
    cur = conn.execute("""INSERT INTO sources(kind,category,name,title,stored_path,checksum,file_mtime,imported_at,status,warnings,page_count,unit_count)
                          VALUES('file',?,?,?,?,?,?,?,?,?,?,?)""",
                       (cat, name, title, str(stored), checksum, mtime, db.now(), status, json.dumps(warnings), pages, units))
    return cur.lastrowid


def import_folder(conn, folder, category=None) -> list[dict]:
    results = []
    for p in sorted(Path(folder).rglob("*")):
        if p.is_file() and not p.name.startswith(("~$", ".")):
            if p.suffix.lower() in SUPPORTED:
                results.append(import_file(conn, p, category))
            else:
                results.append({"status": "unsupported", "name": p.name, "message": f"Skipped: {p.suffix or 'no extension'} files are not supported."})
    return results


def remove_source(conn, source_id: int):
    row = conn.execute("SELECT stored_path FROM sources WHERE id=?", (source_id,)).fetchone()
    if row and row["stored_path"]:
        Path(row["stored_path"]).unlink(missing_ok=True)
    conn.execute("UPDATE web_pages SET source_id=NULL WHERE source_id=?", (source_id,))
    db.delete_source(conn, source_id)


def add_note(conn, title: str, text: str, category: str = "E") -> int:
    """Save a user-approved (redacted) example as internal knowledge."""
    name = f"Note: {title.strip()[:80]} ({db.now()[:19]})"
    cur = conn.execute("INSERT INTO sources(kind,category,name,title,imported_at,status,checksum) VALUES('note',?,?,?,?,'ok',?)",
                       (category, name, title, db.now(), sha256_bytes(text.encode())))
    from .extract import chunk
    write_passages(conn, cur.lastrowid, name, [{"text": c, "heading": title} for c in chunk(text)])
    conn.commit()
    return cur.lastrowid


def import_report(conn) -> list[dict]:
    rows = conn.execute("""SELECT s.*, (SELECT COUNT(*) FROM passages p WHERE p.source_id=s.id) AS passages
                           FROM sources s WHERE kind IN ('file','note') ORDER BY name""").fetchall()
    out = []
    for r in rows:
        d = dict(r); d["warnings"] = json.loads(r["warnings"] or "[]")
        d["units"] = sorted({x[0] for x in conn.execute(
            "SELECT COALESCE(sheet, CAST(page AS TEXT), heading) FROM passages WHERE source_id=? ", (r["id"],)) if x[0]},
            key=lambda v: (len(v), v))[:200]
        out.append(d)
    return out
