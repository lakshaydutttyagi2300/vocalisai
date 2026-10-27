"""SQLite storage (with FTS5 full-text search) and settings access."""
import json
import sqlite3
from datetime import datetime, timezone

from . import config

SCHEMA = """
CREATE TABLE IF NOT EXISTS sources(
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL CHECK(kind IN ('file','web','note')),
  category TEXT NOT NULL DEFAULT 'E',
  name TEXT NOT NULL,            -- original filename, or page URL for web
  title TEXT,
  location TEXT,                 -- URL for web sources
  stored_path TEXT,              -- local copy of an imported file
  checksum TEXT,
  file_mtime TEXT,
  imported_at TEXT,
  verified_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',   -- ok | ok_with_warnings | failed | pending
  warnings TEXT NOT NULL DEFAULT '[]',
  version INTEGER NOT NULL DEFAULT 1,
  active INTEGER NOT NULL DEFAULT 1,
  page_count INTEGER,
  unit_count INTEGER
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_sources_identity ON sources(kind, name);
CREATE TABLE IF NOT EXISTS passages(
  id INTEGER PRIMARY KEY,
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  ord INTEGER NOT NULL DEFAULT 0,
  page INTEGER, sheet TEXT, cell_ref TEXT, heading TEXT,
  text TEXT NOT NULL,
  content_hash TEXT NOT NULL,
  shapes TEXT NOT NULL DEFAULT '',
  UNIQUE(source_id, content_hash)
);
CREATE VIRTUAL TABLE IF NOT EXISTS passages_fts USING fts5(
  text, heading, name, shapes, tokenize='unicode61 remove_diacritics 2');
CREATE TABLE IF NOT EXISTS source_versions(
  id INTEGER PRIMARY KEY, source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  version INTEGER, checksum TEXT, recorded_at TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS web_pages(
  url TEXT PRIMARY KEY, source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  state TEXT NOT NULL DEFAULT 'pending',  -- pending|done|failed|skipped|manual|duplicate
  kind TEXT DEFAULT 'html', depth INTEGER DEFAULT 0, via TEXT,
  http_status INTEGER, discovered_at TEXT, fetched_at TEXT, verified_at TEXT,
  content_hash TEXT, etag TEXT, last_modified TEXT, note TEXT, duplicate_of TEXT, attempts INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS jobs(
  id INTEGER PRIMARY KEY, kind TEXT, started_at TEXT, finished_at TEXT, status TEXT, summary TEXT);
CREATE TABLE IF NOT EXISTS job_errors(
  id INTEGER PRIMARY KEY, job_id INTEGER, target TEXT, message TEXT, at TEXT);
CREATE TABLE IF NOT EXISTS search_history(
  id INTEGER PRIMARY KEY, query TEXT, at TEXT, result_count INTEGER);
CREATE TABLE IF NOT EXISTS drafts(
  id INTEGER PRIMARY KEY, created_at TEXT, updated_at TEXT, title TEXT, question TEXT,
  response_text TEXT, ticket_text TEXT, status TEXT DEFAULT 'draft', warnings TEXT DEFAULT '[]');
CREATE TABLE IF NOT EXISTS evidence_refs(
  id INTEGER PRIMARY KEY, draft_id INTEGER NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  passage_id INTEGER, label TEXT, snapshot TEXT);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL);
"""


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(config.db_path(), timeout=30)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys=ON")
    conn.execute("PRAGMA journal_mode=WAL")
    conn.executescript(SCHEMA)
    return conn


def get_setting(conn, key):
    row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    if row is None:
        return config.DEFAULT_SETTINGS.get(key)
    return json.loads(row["value"])


def set_setting(conn, key, value):
    conn.execute("INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value",
                 (key, json.dumps(value)))
    conn.commit()


def all_settings(conn) -> dict:
    out = dict(config.DEFAULT_SETTINGS)
    for r in conn.execute("SELECT key,value FROM settings"):
        out[r["key"]] = json.loads(r["value"])
    return out


def delete_source_passages(conn, source_id):
    conn.execute("DELETE FROM passages_fts WHERE rowid IN (SELECT id FROM passages WHERE source_id=?)", (source_id,))
    conn.execute("DELETE FROM passages WHERE source_id=?", (source_id,))


def delete_source(conn, source_id):
    delete_source_passages(conn, source_id)
    conn.execute("DELETE FROM sources WHERE id=?", (source_id,))
    conn.commit()
