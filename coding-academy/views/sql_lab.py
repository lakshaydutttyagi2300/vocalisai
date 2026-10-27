"""SQL Practice Lab: explore sample databases, run any SQL, practise exercises."""

import sqlite3

import pandas as pd
import streamlit as st

from academy import personal, sql_engine
from academy.ui.common import get_library
from academy.ui.exercises import (EDITOR_HELP, render_sql_exercise, result_frame, show_completion_message,
                                  show_statement_results)

library = get_library()
st.title("🗄️ SQL Practice Lab")
st.markdown("Explore the sample databases and run any SQL you like. You are working on a **practice copy**: "
            "if you change or delete data, press *Reset practice database* to get the original back.")
show_completion_message()

datasets = sql_engine.list_datasets()
if not datasets:
    st.error("No sample databases were found in content/sql/datasets.")
    st.stop()

playground, exercises, about = st.tabs(["🧪 Playground", "🎯 Exercises", "ℹ️ About SQLite"], key="sql_lab_tabs")

with playground:
    names = list(datasets)
    default = st.query_params.get("dataset", "school")
    if "sql_dataset" not in st.session_state:
        st.session_state["sql_dataset"] = default if default in names else names[0]
    dataset = st.selectbox("Practice database", names, key="sql_dataset",
                           format_func=lambda n: f"{datasets[n].title} - {datasets[n].description}")
    editor_key = f"code_sql_lab_{dataset}"
    st.session_state.setdefault(editor_key, "SELECT *\nFROM " + ("students" if dataset == "school" else
                                                                  "customers" if dataset == "shop" else
                                                                  "sqlite_master") + "\nLIMIT 10;")

    schema_col, work_col = st.columns([1, 2])
    conn = sql_engine.open_practice_connection(dataset)
    try:
        with schema_col:
            st.markdown("##### Tables")
            tables = sql_engine.table_names(conn)
            if not tables:
                st.caption("No tables yet. Create one with `CREATE TABLE`.")
            for table in tables:
                with st.expander(f"📋 {table} ({sql_engine.table_row_count(conn, table)} rows)"):
                    st.dataframe(pd.DataFrame(sql_engine.table_columns(conn, table)), hide_index=True,
                                 width="stretch")
                    sample = sql_engine.sample_rows(conn, table)
                    if sample.rows:
                        st.caption("First rows:")
                        st.dataframe(result_frame(sample), hide_index=True, width="stretch")
                    if st.button("Insert a query for this table", key=f"ins_{dataset}_{table}"):
                        st.session_state["_insert_sql"] = (editor_key, f"SELECT *\nFROM {table}\nLIMIT 20;")
                        st.rerun()
            views = sql_engine.view_names(conn)
            if views:
                st.caption("Views: " + ", ".join(views))
    finally:
        conn.close()

    with work_col:
        pending = st.session_state.pop("_insert_sql", None)
        if pending:
            st.session_state[pending[0]] = pending[1]
        saved = personal.list_lab_files("sql")
        if saved:
            choice = st.selectbox("Open a saved query", ["-"] + [f["name"] for f in saved], key="sql_saved_choice")
            if choice != "-" and st.button("Load it into the editor", key="sql_load_saved"):
                st.session_state["_insert_sql"] = (editor_key, personal.get_lab_file("sql", choice)["code"])
                st.rerun()
        sql_text = st.text_area("Your SQL (you can run several statements separated by `;`)", key=editor_key,
                                height=220, help=EDITOR_HELP)
        with st.container(horizontal=True):
            run_clicked = st.button("▶ Run", type="primary", key="sql_run")
            plan_clicked = st.button("🔍 Explain query plan", key="sql_plan",
                                     help="Shows how SQLite will execute the query (lesson: indexes and plans).")
            with st.popover("💾 Save query"):
                save_name = st.text_input("Name", key="sql_save_name")
                if st.button("Save", key="sql_save_btn"):
                    if save_name.strip():
                        personal.save_lab_file("sql", save_name, sql_text or "")
                        st.toast("Query saved")
                    else:
                        st.warning("Type a name first.")
            with st.popover("↺ Reset practice database"):
                st.markdown(f"This throws away all changes you made to the **{datasets[dataset].title}** practice "
                            "database and restores the original sample data. Your progress is not affected.")
                if st.button("Yes, reset it", key="sql_reset_yes", type="primary"):
                    sql_engine.reset_practice_db(dataset)
                    st.session_state.pop("sql_results", None)
                    st.toast("Practice database reset")
                    st.rerun()

        if run_clicked:
            conn = sql_engine.open_practice_connection(dataset)
            try:
                results = sql_engine.execute(conn, sql_text or "")
            finally:
                conn.close()
            st.session_state["sql_results"] = (dataset, results)
            history = st.session_state.setdefault("sql_history", [])
            if sql_text and (not history or history[0] != sql_text):
                history.insert(0, sql_text)
                del history[15:]
        if plan_clicked:
            statements = sql_engine.split_statements(sql_text or "")
            if statements:
                conn = sql_engine.open_practice_connection(dataset)
                try:
                    results = sql_engine.execute(conn, "EXPLAIN QUERY PLAN " + statements[-1])
                finally:
                    conn.close()
                st.session_state["sql_results"] = (dataset, results)
        stored = st.session_state.get("sql_results")
        if stored and stored[0] == dataset:
            with st.container(border=True):
                show_statement_results(stored[1])
        history = st.session_state.get("sql_history", [])
        if history:
            with st.expander(f"🕘 Query history (this session, {len(history)})"):
                for number, past in enumerate(history):
                    st.code(past, language="sql")
                    if st.button("Use this query", key=f"hist_{number}"):
                        st.session_state["_insert_sql"] = (editor_key, past)
                        st.rerun()

with exercises:
    lessons = [ls for ls in library.track_lessons("sql") if any(not e.is_manual for e in ls.exercises)]
    if not lessons:
        st.info("No SQL exercises found.")
    else:
        lesson = st.selectbox("Lesson", lessons, format_func=lambda ls: f"Level {ls.level} · {ls.title}",
                              key="sql_ex_lesson")
        options = [e for e in lesson.exercises if not e.is_manual]
        exercise = st.selectbox("Exercise", options, format_func=lambda e: f"{e.title} ({e.difficulty})",
                                key="sql_ex_choice")
        with st.container(border=True):
            render_sql_exercise(exercise, library)

with about:
    st.markdown(f"This app uses **SQLite version {sqlite3.sqlite_version}**, which is built into Python - "
                "nothing extra to install, no server, no internet.")
    st.markdown("""
- SQLite stores a whole database in **one file**. Your practice copies are in the app's `data/practice_databases`
  folder; the original sample data is in `content/sql/datasets` and is never changed.
- Most SQL you learn here works the same in **PostgreSQL**, **MySQL** and **SQL Server**. Where it differs,
  lessons point it out - see also the Knowledge Base article *SQLite compared with other databases*.
- Window functions need SQLite 3.25 or newer, and `RIGHT JOIN` / `FULL OUTER JOIN` need SQLite 3.39 or newer.
- For safety the lab blocks `ATTACH`, `DETACH`, `VACUUM INTO` and a few settings, so your progress
  database can never be touched from here. Queries are stopped after a few seconds.
""")
