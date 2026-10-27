"""Your notes, bookmarks, saved lab files and project progress."""

from __future__ import annotations

import io
import re
import zipfile

from academy import db
from academy.content import Project

# ---------------------------------------------------------------- notes


def list_notes(search: str = "", lesson_id: str | None = None) -> list[dict]:
    sql = "SELECT * FROM notes"
    clauses, params = [], []
    if lesson_id:
        clauses.append("lesson_id = ?")
        params.append(lesson_id)
    if search:
        clauses.append("(title LIKE ? OR body LIKE ? OR tags LIKE ?)")
        params += [f"%{search}%"] * 3
    if clauses:
        sql += " WHERE " + " AND ".join(clauses)
    sql += " ORDER BY updated_at DESC, id DESC"
    with db.connect() as conn:
        return [dict(r) for r in conn.execute(sql, params)]


def get_note(note_id: int) -> dict | None:
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM notes WHERE id = ?", (note_id,)).fetchone()
    return dict(row) if row else None


def clean_tags(tags: str) -> str:
    parts = [t.strip().lower() for t in re.split(r"[,;]", tags or "") if t.strip()]
    return ", ".join(dict.fromkeys(parts))


def save_note(title: str, body: str, lesson_id: str | None = None, tags: str = "",
              note_id: int | None = None) -> int:
    title = (title or "").strip() or "Untitled note"
    stamp = db.now()
    with db.connect() as conn:
        if note_id:
            conn.execute("UPDATE notes SET title = ?, body = ?, lesson_id = ?, tags = ?, updated_at = ? WHERE id = ?",
                         (title, body, lesson_id or None, clean_tags(tags), stamp, note_id))
            return note_id
        cursor = conn.execute(
            "INSERT INTO notes (title, body, lesson_id, tags, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (title, body, lesson_id or None, clean_tags(tags), stamp, stamp),
        )
        return int(cursor.lastrowid)


def delete_note(note_id: int) -> None:
    with db.connect() as conn:
        conn.execute("DELETE FROM notes WHERE id = ?", (note_id,))


def all_tags() -> list[str]:
    tags: set[str] = set()
    for note in list_notes():
        tags.update(t.strip() for t in note["tags"].split(",") if t.strip())
    return sorted(tags)


def _safe_filename(text: str) -> str:
    return re.sub(r"[^A-Za-z0-9_-]+", "-", text).strip("-")[:60] or "note"


def notes_as_markdown_zip() -> bytes:
    """All notes as separate Markdown files in one .zip (readable in any editor)."""
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as archive:
        for note in list_notes():
            header = [f"# {note['title']}", ""]
            if note["lesson_id"]:
                header.append(f"Lesson: {note['lesson_id']}")
            if note["tags"]:
                header.append(f"Tags: {note['tags']}")
            header += [f"Updated: {note['updated_at']}", "", ""]
            archive.writestr(f"notes/{note['id']:04d}-{_safe_filename(note['title'])}.md",
                             "\n".join(header) + note["body"])
    return buffer.getvalue()


# ---------------------------------------------------------------- bookmarks


def is_bookmarked(item_type: str, item_id: str) -> bool:
    with db.connect() as conn:
        return conn.execute("SELECT 1 FROM bookmarks WHERE item_type = ? AND item_id = ?",
                            (item_type, item_id)).fetchone() is not None


def toggle_bookmark(item_type: str, item_id: str, title: str) -> bool:
    """Add or remove a bookmark. Returns True if it is now bookmarked."""
    with db.connect() as conn:
        existing = conn.execute("SELECT id FROM bookmarks WHERE item_type = ? AND item_id = ?",
                                (item_type, item_id)).fetchone()
        if existing:
            conn.execute("DELETE FROM bookmarks WHERE id = ?", (existing["id"],))
            return False
        conn.execute("INSERT INTO bookmarks (item_type, item_id, title, created_at) VALUES (?, ?, ?, ?)",
                     (item_type, item_id, title, db.now()))
        return True


def list_bookmarks() -> list[dict]:
    with db.connect() as conn:
        return [dict(r) for r in conn.execute("SELECT * FROM bookmarks ORDER BY created_at DESC, id DESC")]


def delete_bookmark(bookmark_id: int) -> None:
    with db.connect() as conn:
        conn.execute("DELETE FROM bookmarks WHERE id = ?", (bookmark_id,))


# ---------------------------------------------------------------- lab files


def list_lab_files(kind: str) -> list[dict]:
    with db.connect() as conn:
        return [dict(r) for r in conn.execute(
            "SELECT * FROM lab_files WHERE kind = ? ORDER BY updated_at DESC, name", (kind,))]


def get_lab_file(kind: str, name: str) -> dict | None:
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM lab_files WHERE kind = ? AND name = ?", (kind, name)).fetchone()
    return dict(row) if row else None


def save_lab_file(kind: str, name: str, code: str) -> str:
    name = re.sub(r"\s+", " ", (name or "").strip())[:80] or "untitled"
    stamp = db.now()
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO lab_files (kind, name, code, created_at, updated_at) VALUES (?, ?, ?, ?, ?) "
            "ON CONFLICT (kind, name) DO UPDATE SET code = excluded.code, updated_at = excluded.updated_at",
            (kind, name, code, stamp, stamp),
        )
    return name


def delete_lab_file(kind: str, name: str) -> None:
    with db.connect() as conn:
        conn.execute("DELETE FROM lab_files WHERE kind = ? AND name = ?", (kind, name))


# ---------------------------------------------------------------- projects


def project_tasks_done(project_id: str) -> set[str]:
    with db.connect() as conn:
        return {r["task_id"] for r in conn.execute(
            "SELECT task_id FROM project_tasks WHERE project_id = ? AND done = 1", (project_id,))}


def set_project_task(project_id: str, task_id: str, done: bool) -> None:
    stamp = db.now()
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO project_tasks (project_id, task_id, done, updated_at) VALUES (?, ?, ?, ?) "
            "ON CONFLICT (project_id, task_id) DO UPDATE SET done = excluded.done, updated_at = excluded.updated_at",
            (project_id, task_id, int(done), stamp),
        )
        conn.execute("INSERT INTO project_status (project_id, started_at) VALUES (?, ?) "
                     "ON CONFLICT (project_id) DO NOTHING", (project_id, stamp))
        db.record_activity(conn)


def project_status(project: Project) -> dict:
    done = project_tasks_done(project.id)
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM project_status WHERE project_id = ?", (project.id,)).fetchone()
    total = sum(len(s.tasks) for s in project.stages)
    required = project.required_task_ids
    required_done = all(t in done for t in required) if required else False
    return {
        "done": done,
        "total": total,
        "done_count": sum(1 for s in project.stages for t in s.tasks if t.id in done),
        "required_done": required_done,
        "started_at": row["started_at"] if row else None,
        "completed_at": row["completed_at"] if row else None,
        "reflection": row["reflection"] if row else "",
    }


def set_project_completed(project_id: str, completed: bool, reflection: str = "") -> None:
    stamp = db.now()
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO project_status (project_id, started_at, completed_at, reflection) VALUES (?, ?, ?, ?) "
            "ON CONFLICT (project_id) DO UPDATE SET completed_at = excluded.completed_at, "
            "reflection = excluded.reflection",
            (project_id, stamp, stamp if completed else None, reflection),
        )


def save_project_reflection(project_id: str, reflection: str) -> None:
    with db.connect() as conn:
        conn.execute("INSERT INTO project_status (project_id, started_at, reflection) VALUES (?, ?, ?) "
                     "ON CONFLICT (project_id) DO UPDATE SET reflection = excluded.reflection",
                     (project_id, db.now(), reflection))


def completed_projects() -> set[str]:
    with db.connect() as conn:
        return {r["project_id"] for r in conn.execute(
            "SELECT project_id FROM project_status WHERE completed_at IS NOT NULL")}
