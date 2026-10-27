"""SQL practice engine: datasets, safe execution, checking."""

import sqlite3

from academy import paths, sql_engine
from academy.content import Exercise


def sql_exercise(solution, check=None, dataset="school"):
    return Exercise(id="e", lesson_id="l", kind="sql", title="t", difficulty="beginner", instructions="i",
                    solution=solution, check=check or {}, dataset=dataset)


def test_all_datasets_build():
    datasets = sql_engine.list_datasets()
    assert {"school", "shop", "company", "inventory", "expenses", "quality", "blank"} <= set(datasets)
    for name in datasets:
        conn = sql_engine.fresh_connection(name)
        conn.execute("PRAGMA foreign_key_check").fetchall()
        conn.close()


def test_split_statements_handles_semicolons_in_text():
    statements = sql_engine.split_statements("SELECT 'a;b'; -- comment\nSELECT 2;\n\n-- only a comment")
    assert statements == ["SELECT 'a;b';", "-- comment\nSELECT 2;"]


def test_execute_queries_and_changes():
    conn = sql_engine.fresh_connection("school")
    results = sql_engine.execute(conn, "SELECT COUNT(*) AS n FROM students; UPDATE students SET city = 'X';")
    assert results[0].columns == ["n"] and results[0].rows == [(24,)]
    assert results[1].rowcount == 24 and "24 row(s) changed" in results[1].message


def test_execution_stops_at_first_error():
    conn = sql_engine.fresh_connection("school")
    results = sql_engine.execute(conn, "SELECT * FROM nope; SELECT 1;")
    assert len(results) == 1 and "no such table" in results[0].error


def test_attach_and_vacuum_into_are_blocked(tmp_path):
    conn = sql_engine.fresh_connection("school")
    results = sql_engine.execute(conn, f"ATTACH DATABASE '{paths.DB_PATH}' AS progress;")
    assert results[0].error and "not authorized" in results[0].error
    results = sql_engine.execute(conn, f"VACUUM INTO '{tmp_path / 'copy.db'}';")
    assert results[0].error
    assert not (tmp_path / "copy.db").exists()


def test_runaway_query_is_stopped():
    conn = sql_engine.fresh_connection("school", time_limit=0.5)
    results = sql_engine.execute(conn, "WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x + 1 FROM n) "
                                       "SELECT COUNT(*) FROM n;")
    assert "took too long" in results[0].error


def test_practice_database_reset():
    conn = sql_engine.open_practice_connection("school")
    sql_engine.execute(conn, "DELETE FROM enrollments; DROP TABLE enrollments;")
    assert "enrollments" not in sql_engine.table_names(conn)
    conn.close()
    sql_engine.reset_practice_db("school")
    conn = sql_engine.open_practice_connection("school")
    assert "enrollments" in sql_engine.table_names(conn)
    conn.close()
    # the original sample file is untouched
    assert "CREATE TABLE enrollments" in (paths.CONTENT_DIR / "sql/datasets/school.sql").read_text()


def test_check_unordered_and_ordered():
    unordered = sql_exercise("SELECT first_name FROM students WHERE city = 'London';")
    assert sql_engine.check_sql_exercise(unordered, "SELECT first_name FROM students WHERE city='London' "
                                                    "ORDER BY first_name DESC").passed
    ordered = sql_exercise("SELECT first_name FROM students ORDER BY birth_date;", {"ordered": True})
    outcome = sql_engine.check_sql_exercise(ordered, "SELECT first_name FROM students ORDER BY birth_date DESC;")
    assert not outcome.passed and "wrong order" in " ".join(outcome.details)


def test_check_reports_columns_and_rows():
    exercise = sql_exercise("SELECT first_name, city FROM students;")
    outcome = sql_engine.check_sql_exercise(exercise, "SELECT first_name FROM students;")
    assert not outcome.passed and "column" in " ".join(outcome.details)
    outcome = sql_engine.check_sql_exercise(exercise, "SELECT first_name, city FROM students LIMIT 3;")
    assert not outcome.passed and "3 row(s)" in " ".join(outcome.details)
    outcome = sql_engine.check_sql_exercise(exercise, "SELEC first_name FROM students;")
    assert not outcome.passed and "error" in outcome.summary


def test_check_with_verify_query_for_changes():
    exercise = sql_exercise("INSERT INTO courses (id, title, department, credits) VALUES (9, 'Poetry', 'Languages', 2);",
                            {"verify": "SELECT id, title, credits FROM courses ORDER BY id;"})
    good = "INSERT INTO courses (id, title, department, credits) VALUES (9, 'Poetry', 'Languages', 2);"
    assert sql_engine.check_sql_exercise(exercise, good).passed
    assert not sql_engine.check_sql_exercise(exercise, "DELETE FROM courses WHERE id = 1;").passed


def test_float_tolerance_and_int_float_equality():
    exercise = sql_exercise("SELECT 10.0 / 4;")
    assert sql_engine.check_sql_exercise(exercise, "SELECT 2.5000000001;").passed
    assert sql_engine.check_sql_exercise(sql_exercise("SELECT 3;"), "SELECT 3.0;").passed


def test_column_names_check():
    exercise = sql_exercise("SELECT first_name AS name FROM students;", {"columns": True})
    assert sql_engine.check_sql_exercise(exercise, "SELECT first_name AS name FROM students;").passed
    assert not sql_engine.check_sql_exercise(exercise, "SELECT first_name FROM students;").passed


def test_progress_database_not_reachable():
    # the SQL lab works on its own files; make sure nothing points at the progress DB
    conn = sql_engine.open_practice_connection("shop")
    files = [row[2] for row in conn.execute("PRAGMA database_list")]
    conn.close()
    assert str(paths.DB_PATH) not in files
    assert sqlite3.connect(paths.DB_PATH).execute("SELECT COUNT(*) FROM settings").fetchone()[0] >= 0
