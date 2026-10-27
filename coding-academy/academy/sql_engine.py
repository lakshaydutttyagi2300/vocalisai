"""SQL practice: sample databases, safe query execution and answer checking.

Safety design
-------------
* Sample databases are built from the text files in content/sql/datasets/.
  Those files are never changed, so you can always rebuild a clean copy.
* The SQL Lab works on *practice copies* in data/practice_databases/.
  "Reset" deletes the copy and rebuilds it from the text file.
* Exercise checking runs your SQL against a brand-new in-memory copy, so
  even DELETE or DROP TABLE cannot damage anything.
* Your progress database (data/academy.db) is never reachable from the SQL
  Lab: ATTACH, DETACH, VACUUM INTO and extension loading are refused.
* Queries that run longer than a few seconds are stopped.
"""

from __future__ import annotations

import re
import sqlite3
import time
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path

from academy import paths
from academy.content import Exercise

DEFAULT_TIME_LIMIT = 5.0
MAX_ROWS = 1000

_DENIED_PRAGMAS = {"writable_schema", "journal_mode", "locking_mode", "mmap_size", "temp_store_directory",
                   "data_store_directory"}
_SQLITE_FUNCTION = getattr(sqlite3, "SQLITE_FUNCTION", 31)


@dataclass
class Dataset:
    name: str
    title: str
    description: str
    path: Path


@dataclass
class StatementResult:
    sql: str
    columns: list[str] = field(default_factory=list)
    rows: list[tuple] = field(default_factory=list)
    rowcount: int = -1
    error: str | None = None
    truncated: bool = False
    elapsed: float = 0.0

    @property
    def is_query(self) -> bool:
        return bool(self.columns)

    @property
    def message(self) -> str:
        if self.error:
            return self.error
        if self.is_query:
            more = f" (showing the first {len(self.rows)})" if self.truncated else ""
            return f"{len(self.rows)} row(s) returned{more}."
        verb = self.sql.strip().split(None, 1)[0].upper() if self.sql.strip() else ""
        if verb in {"INSERT", "UPDATE", "DELETE", "REPLACE"} and self.rowcount >= 0:
            return f"{verb} finished: {self.rowcount} row(s) changed."
        return f"{verb or 'Statement'} finished."


@dataclass
class SqlCheckOutcome:
    passed: bool
    summary: str
    details: list[str] = field(default_factory=list)
    user_result: StatementResult | None = None
    expected_result: StatementResult | None = None
    statements: list[StatementResult] = field(default_factory=list)

    def feedback_text(self) -> str:
        return "\n".join([self.summary] + self.details)


class GuardedConnection(sqlite3.Connection):
    """A normal SQLite connection that also remembers its time limit."""

    academy_deadline: dict
    academy_limit: float


# ------------------------------------------------------------- datasets


def datasets_dir() -> Path:
    return paths.CONTENT_DIR / "sql" / "datasets"


def list_datasets() -> dict[str, Dataset]:
    result = {}
    for path in sorted(datasets_dir().glob("*.sql")):
        header = path.read_text(encoding="utf-8")[:2000]
        title = re.search(r"^--\s*title:\s*(.+)$", header, re.M)
        description = re.search(r"^--\s*description:\s*(.+)$", header, re.M)
        result[path.stem] = Dataset(
            name=path.stem,
            title=title.group(1).strip() if title else path.stem.title(),
            description=description.group(1).strip() if description else "",
            path=path,
        )
    return result


def _dataset_path(name: str) -> Path:
    if not re.fullmatch(r"[a-z0-9_\-]+", name or ""):
        raise ValueError(f"Unknown dataset '{name}'")
    path = datasets_dir() / f"{name}.sql"
    if not path.exists():
        raise ValueError(f"Unknown dataset '{name}'")
    return path


@lru_cache(maxsize=32)
def _template(name: str, mtime_ns: int) -> sqlite3.Connection:
    conn = sqlite3.connect(":memory:", check_same_thread=False)
    conn.executescript(_dataset_path(name).read_text(encoding="utf-8"))
    conn.commit()
    return conn


def fresh_connection(name: str, time_limit: float = DEFAULT_TIME_LIMIT) -> sqlite3.Connection:
    """A brand-new in-memory copy of a dataset (used for checking answers)."""
    path = _dataset_path(name)
    template = _template(name, path.stat().st_mtime_ns)
    conn = sqlite3.connect(":memory:", isolation_level=None, factory=GuardedConnection)
    template.backup(conn)
    conn.execute("PRAGMA foreign_keys = ON")
    guard_connection(conn, time_limit)
    return conn


def practice_db_path(name: str) -> Path:
    _dataset_path(name)
    return paths.PRACTICE_DB_DIR / f"{name}.db"


def ensure_practice_db(name: str) -> Path:
    path = practice_db_path(name)
    if not path.exists():
        build_practice_db(name)
    return path


def build_practice_db(name: str) -> Path:
    path = practice_db_path(name)
    path.parent.mkdir(parents=True, exist_ok=True)
    temp = path.with_suffix(".building")
    temp.unlink(missing_ok=True)
    conn = sqlite3.connect(temp)
    try:
        conn.executescript(_dataset_path(name).read_text(encoding="utf-8"))
        conn.commit()
    finally:
        conn.close()
    temp.replace(path)
    return path


def reset_practice_db(name: str) -> Path:
    """Throw away the practice copy and rebuild it from the original file."""
    practice_db_path(name).unlink(missing_ok=True)
    return build_practice_db(name)


def open_practice_connection(name: str, time_limit: float = DEFAULT_TIME_LIMIT) -> sqlite3.Connection:
    conn = sqlite3.connect(ensure_practice_db(name), isolation_level=None, timeout=5, factory=GuardedConnection)
    conn.execute("PRAGMA foreign_keys = ON")
    guard_connection(conn, time_limit)
    return conn


# ------------------------------------------------------------- safety


def guard_connection(conn: GuardedConnection, time_limit: float) -> None:
    def authorizer(action, arg1, arg2, dbname, source):
        if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH):
            return sqlite3.SQLITE_DENY
        if action == sqlite3.SQLITE_PRAGMA and (arg1 or "").lower() in _DENIED_PRAGMAS:
            return sqlite3.SQLITE_DENY
        if action == _SQLITE_FUNCTION and (arg2 or "").lower() == "load_extension":
            return sqlite3.SQLITE_DENY
        return sqlite3.SQLITE_OK

    conn.set_authorizer(authorizer)
    deadline = {"t": None}

    def progress() -> int:
        if deadline["t"] is not None and time.perf_counter() > deadline["t"]:
            return 1
        return 0

    conn.set_progress_handler(progress, 20_000)
    conn.academy_deadline = deadline
    conn.academy_limit = time_limit


def strip_comments(sql: str) -> str:
    sql = re.sub(r"/\*.*?\*/", " ", sql, flags=re.S)
    return re.sub(r"--[^\n]*", " ", sql)


def split_statements(sql: str) -> list[str]:
    """Split text into separate SQL statements (semicolons inside quotes are handled)."""
    statements, buffer = [], ""
    for char in sql:
        buffer += char
        if char == ";" and sqlite3.complete_statement(buffer):
            if strip_comments(buffer).strip(" \t\r\n;"):
                statements.append(buffer.strip())
            buffer = ""
    if strip_comments(buffer).strip(" \t\r\n;"):
        statements.append(buffer.strip())
    return statements


def execute(conn: sqlite3.Connection, sql_text: str, max_rows: int = MAX_ROWS) -> list[StatementResult]:
    """Run every statement in ``sql_text``; stop at the first error."""
    results: list[StatementResult] = []
    deadline = getattr(conn, "academy_deadline", {"t": None})
    limit = getattr(conn, "academy_limit", DEFAULT_TIME_LIMIT)
    for statement in split_statements(sql_text):
        result = StatementResult(sql=statement)
        cleaned = strip_comments(statement).strip().upper()
        if re.match(r"VACUUM\b.*\bINTO\b", cleaned, re.S):
            result.error = "VACUUM INTO is not allowed in the practice lab (it writes a database file)."
            results.append(result)
            break
        started = time.perf_counter()
        deadline["t"] = started + limit
        try:
            cursor = conn.execute(statement)
            if cursor.description:
                result.columns = [d[0] for d in cursor.description]
                rows = cursor.fetchmany(max_rows + 1)
                result.truncated = len(rows) > max_rows
                result.rows = [tuple(r) for r in rows[:max_rows]]
            result.rowcount = cursor.rowcount
        except sqlite3.Error as exc:
            message = str(exc)
            if message == "interrupted":
                message = f"The query took too long (more than {limit:g} seconds) and was stopped."
            elif "not authorized" in message:
                message = ("not authorized: the practice lab does not allow this statement "
                           "(ATTACH, DETACH and some PRAGMA settings are blocked to protect your data).")
            result.error = message
        except Warning as exc:  # sqlite3.Warning e.g. "You can only execute one statement at a time"
            result.error = str(exc)
        finally:
            deadline["t"] = None
        result.elapsed = round(time.perf_counter() - started, 4)
        results.append(result)
        if result.error:
            break
    return results


# ------------------------------------------------------------- inspection


def quote_identifier(name: str) -> str:
    return '"' + name.replace('"', '""') + '"'


def table_names(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    ).fetchall()
    return [r[0] for r in rows]


def view_names(conn: sqlite3.Connection) -> list[str]:
    return [r[0] for r in conn.execute("SELECT name FROM sqlite_master WHERE type = 'view' ORDER BY name")]


def table_columns(conn: sqlite3.Connection, table: str) -> list[dict]:
    rows = conn.execute(f"PRAGMA table_info({quote_identifier(table)})").fetchall()
    fks = {r[3]: f"{r[2]}.{r[4]}" for r in conn.execute(f"PRAGMA foreign_key_list({quote_identifier(table)})")}
    return [
        {"column": r[1], "type": r[2] or "(any)", "required": bool(r[3]), "primary key": bool(r[5]),
         "links to": fks.get(r[1], "")}
        for r in rows
    ]


def table_row_count(conn: sqlite3.Connection, table: str) -> int:
    return conn.execute(f"SELECT COUNT(*) FROM {quote_identifier(table)}").fetchone()[0]


def sample_rows(conn: sqlite3.Connection, table: str, limit: int = 5) -> StatementResult:
    return execute(conn, f"SELECT * FROM {quote_identifier(table)} LIMIT {int(limit)}")[0]


# ------------------------------------------------------------- checking


def _norm_value(value):
    if isinstance(value, float):
        value = round(value, 6)
        if value.is_integer():
            return int(value)
    return value


def _sort_key(row: tuple):
    return tuple((0, 0, "") if v is None else (1, v, "") if isinstance(v, (int, float)) else (2, 0, str(v))
                 for v in row)


def _normalise_rows(rows: list[tuple], ordered: bool) -> list[tuple]:
    normalised = [tuple(_norm_value(v) for v in row) for row in rows]
    return normalised if ordered else sorted(normalised, key=_sort_key)


def _final_query(results: list[StatementResult]) -> StatementResult | None:
    for result in reversed(results):
        if result.is_query:
            return result
    return None


@lru_cache(maxsize=256)
def _expected(dataset: str, mtime: int, solution: str, verify: str) -> StatementResult | None:
    conn = fresh_connection(dataset)
    try:
        results = execute(conn, solution, max_rows=100_000)
        if any(r.error for r in results):
            errors = "; ".join(r.error for r in results if r.error)
            raise ValueError(f"The exercise's own solution failed: {errors}")
        if verify:
            results = execute(conn, verify, max_rows=100_000)
        return _final_query(results)
    finally:
        conn.close()


def expected_result(exercise: Exercise) -> StatementResult | None:
    path = _dataset_path(exercise.dataset)
    return _expected(exercise.dataset, path.stat().st_mtime_ns, exercise.solution,
                     str(exercise.check.get("verify") or ""))


def _describe_row(row: tuple) -> str:
    return "(" + ", ".join("NULL" if v is None else repr(v) for v in row) + ")"


def check_sql_exercise(exercise: Exercise, user_sql: str) -> SqlCheckOutcome:
    if not strip_comments(user_sql).strip(" \t\r\n;"):
        return SqlCheckOutcome(False, "Your answer is empty - write a query first.")
    check = exercise.check or {}
    ordered = bool(check.get("ordered", False))
    verify = str(check.get("verify") or "")

    expected = expected_result(exercise)
    conn = fresh_connection(exercise.dataset)
    try:
        statements = execute(conn, user_sql, max_rows=100_000)
        errors = [r for r in statements if r.error]
        if errors:
            return SqlCheckOutcome(False, "Your SQL produced an error, so it could not be checked.",
                                   [f"Error: {errors[0].error}"], None, expected, statements)
        if verify:
            verify_results = execute(conn, verify, max_rows=100_000)
            user_result = _final_query(verify_results)
        else:
            user_result = _final_query(statements)
    finally:
        conn.close()

    if expected is None:
        return SqlCheckOutcome(False, "This exercise has no expected result to compare with (content problem).")
    if user_result is None:
        return SqlCheckOutcome(False, "Your SQL ran, but it did not return a result to check. "
                                      "This exercise needs a SELECT query.", [], None, expected, statements)

    details: list[str] = []
    if len(user_result.columns) != len(expected.columns):
        details.append(
            f"Your result has {len(user_result.columns)} column(s) ({', '.join(user_result.columns)}), "
            f"but the expected result has {len(expected.columns)} ({', '.join(expected.columns)})."
        )
        return SqlCheckOutcome(False, "The columns are not right yet.", details, user_result, expected, statements)

    if check.get("columns"):
        wanted = [c.lower() for c in expected.columns]
        got = [c.lower() for c in user_result.columns]
        if wanted != got:
            details.append(f"Column names should be: {', '.join(expected.columns)} "
                           f"(yours: {', '.join(user_result.columns)}). Use AS to rename columns.")
            return SqlCheckOutcome(False, "The column names are not right yet.", details, user_result, expected,
                                   statements)

    user_rows = _normalise_rows(user_result.rows, ordered)
    expected_rows = _normalise_rows(expected.rows, ordered)
    if user_rows == expected_rows:
        if not ordered and not check.get("columns"):
            note = "" if [c.lower() for c in user_result.columns] == [c.lower() for c in expected.columns] else \
                f" (Tip: the model answer names the columns {', '.join(expected.columns)}.)"
        else:
            note = ""
        return SqlCheckOutcome(True, "Correct! Your result matches the expected result." + note, details,
                               user_result, expected, statements)

    if len(user_rows) != len(expected_rows):
        details.append(f"Your result has {len(user_rows)} row(s), but the expected result has "
                       f"{len(expected_rows)}.")
        if len(user_rows) > len(expected_rows):
            details.append("You have too many rows: check your WHERE / HAVING conditions or a missing "
                           "DISTINCT, LIMIT or JOIN condition.")
        else:
            details.append("You have too few rows: a condition may be too strict, or a JOIN type may be "
                           "dropping rows.")
    elif ordered and sorted(user_rows, key=_sort_key) == sorted(expected_rows, key=_sort_key):
        details.append("You have exactly the right rows, but in the wrong order. Check your ORDER BY.")
    else:
        for number, (mine, theirs) in enumerate(zip(user_rows, expected_rows), 1):
            if mine != theirs:
                position = f"Row {number}" if ordered else "At least one row"
                details.append(f"{position} differs. Expected {_describe_row(theirs)} but got {_describe_row(mine)}.")
                break
    return SqlCheckOutcome(False, "Not quite yet - your result is different from the expected result.",
                           details, user_result, expected, statements)
