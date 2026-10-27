"""Your personal progress database (data/academy.db).

This SQLite file stores everything that is *yours*: lesson progress, exercise
attempts, quiz results, notes, bookmarks, project progress, saved lab files
and settings. Lesson text is NOT stored here (it lives in content/).

Migrations
----------
The structure of the database is versioned with SQLite's ``user_version``.
To change the structure in a future update, ADD a new entry to MIGRATIONS
(never edit an old one). On start-up, ``migrate()`` applies any missing
steps in order, so old databases and old backups are upgraded safely
without losing data.
"""

from __future__ import annotations

import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Iterator

from academy import paths

MIGRATIONS: list[str] = [
    # Version 1 - the first release.
    """
    CREATE TABLE settings (
        key   TEXT PRIMARY KEY,
        value TEXT NOT NULL
    );

    CREATE TABLE lesson_progress (
        lesson_id       TEXT PRIMARY KEY,
        read_done       INTEGER NOT NULL DEFAULT 0,
        first_opened_at TEXT NOT NULL,
        last_opened_at  TEXT NOT NULL,
        completed_at    TEXT
    );

    CREATE TABLE exercise_attempts (
        id           INTEGER PRIMARY KEY AUTOINCREMENT,
        exercise_key TEXT NOT NULL,
        lesson_id    TEXT,
        kind         TEXT NOT NULL CHECK (kind IN ('python', 'sql')),
        code         TEXT NOT NULL,
        passed       INTEGER NOT NULL,
        self_assessed INTEGER NOT NULL DEFAULT 0,
        feedback     TEXT NOT NULL DEFAULT '',
        created_at   TEXT NOT NULL
    );
    CREATE INDEX idx_attempts_exercise ON exercise_attempts (exercise_key);
    CREATE INDEX idx_attempts_lesson ON exercise_attempts (lesson_id);

    CREATE TABLE exercise_drafts (
        exercise_key TEXT PRIMARY KEY,
        code         TEXT NOT NULL,
        updated_at   TEXT NOT NULL
    );

    CREATE TABLE exercise_help (
        exercise_key    TEXT PRIMARY KEY,
        hints_shown     INTEGER NOT NULL DEFAULT 0,
        solution_viewed INTEGER NOT NULL DEFAULT 0,
        solution_viewed_at TEXT
    );

    CREATE TABLE quiz_attempts (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        quiz_key   TEXT NOT NULL,
        kind       TEXT NOT NULL,
        title      TEXT NOT NULL DEFAULT '',
        score      INTEGER NOT NULL,
        total      INTEGER NOT NULL,
        created_at TEXT NOT NULL
    );

    CREATE TABLE quiz_answers (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        attempt_id  INTEGER NOT NULL REFERENCES quiz_attempts (id) ON DELETE CASCADE,
        lesson_id   TEXT NOT NULL,
        question_id TEXT NOT NULL,
        given       TEXT,
        correct     INTEGER NOT NULL
    );
    CREATE INDEX idx_answers_lesson ON quiz_answers (lesson_id);

    CREATE TABLE review_state (
        lesson_id        TEXT PRIMARY KEY,
        box              INTEGER NOT NULL DEFAULT 0,
        due_date         TEXT NOT NULL,
        last_reviewed_at TEXT
    );

    CREATE TABLE notes (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        title      TEXT NOT NULL,
        body       TEXT NOT NULL DEFAULT '',
        lesson_id  TEXT,
        tags       TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
    );

    CREATE TABLE bookmarks (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        item_type  TEXT NOT NULL,
        item_id    TEXT NOT NULL,
        title      TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE (item_type, item_id)
    );

    CREATE TABLE project_tasks (
        project_id TEXT NOT NULL,
        task_id    TEXT NOT NULL,
        done       INTEGER NOT NULL DEFAULT 0,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (project_id, task_id)
    );

    CREATE TABLE project_status (
        project_id   TEXT PRIMARY KEY,
        started_at   TEXT,
        completed_at TEXT,
        reflection   TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE lab_files (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        kind       TEXT NOT NULL CHECK (kind IN ('python', 'sql')),
        name       TEXT NOT NULL,
        code       TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE (kind, name)
    );

    CREATE TABLE activity (
        day     TEXT PRIMARY KEY,
        actions INTEGER NOT NULL DEFAULT 0
    );
    """,
]

SCHEMA_VERSION = len(MIGRATIONS)
EXPECTED_TABLES = {
    "settings", "lesson_progress", "exercise_attempts", "exercise_drafts", "exercise_help", "quiz_attempts",
    "quiz_answers", "review_state", "notes", "bookmarks", "project_tasks", "project_status", "lab_files",
    "activity",
}


def now() -> str:
    return datetime.now().isoformat(timespec="seconds")


def today() -> str:
    return datetime.now().date().isoformat()


def _open(path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(path, timeout=15)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def connect(path: Path | None = None) -> Iterator[sqlite3.Connection]:
    """Open the progress database; commit if all went well, always close."""
    conn = _open(Path(path or paths.DB_PATH))
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def schema_version(conn: sqlite3.Connection) -> int:
    return conn.execute("PRAGMA user_version").fetchone()[0]


def migrate(path: Path | None = None) -> int:
    """Bring the database up to the latest structure. Returns the version."""
    path = Path(path or paths.DB_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = _open(path)
    try:
        version = schema_version(conn)
        if version > SCHEMA_VERSION:
            raise RuntimeError(
                f"Your progress database was created by a newer version of the app (structure version "
                f"{version}, this app understands up to {SCHEMA_VERSION}). Please update the app."
            )
        for number in range(version, SCHEMA_VERSION):
            conn.executescript("BEGIN;\n" + MIGRATIONS[number] + f"\nPRAGMA user_version = {number + 1};\nCOMMIT;")
        return SCHEMA_VERSION
    finally:
        conn.close()


# ------------------------------------------------------------- settings


DEFAULT_SETTINGS = {
    "learner_name": "",
    "python_timeout": "10",
    "backup_dir": "",
    "auto_backup_days": "7",
    "auto_backup_keep": "10",
    "last_auto_backup": "",
    "current_lesson": "",
    "quiz_pass_percent": "70",
    "ai_provider": "none",
    "ai_model": "",
    "ai_base_url": "",
    "welcome_dismissed": "0",
}


def get_setting(key: str, default: str | None = None) -> str:
    with connect() as conn:
        row = conn.execute("SELECT value FROM settings WHERE key = ?", (key,)).fetchone()
    if row is not None:
        return row["value"]
    return DEFAULT_SETTINGS.get(key, "") if default is None else default


def get_all_settings() -> dict[str, str]:
    values = dict(DEFAULT_SETTINGS)
    with connect() as conn:
        for row in conn.execute("SELECT key, value FROM settings"):
            values[row["key"]] = row["value"]
    return values


def set_setting(key: str, value: object) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value",
            (key, str(value)),
        )


def record_activity(conn: sqlite3.Connection) -> None:
    conn.execute(
        "INSERT INTO activity (day, actions) VALUES (?, 1) ON CONFLICT (day) DO UPDATE SET actions = actions + 1",
        (today(),),
    )
