"""Interactive exercise widgets used in lessons and in the practice labs."""

from __future__ import annotations

import pandas as pd
import streamlit as st

from academy import progress, sql_engine
from academy.content import Exercise, Library
from academy.error_explainer import explain_python_error, explain_sql_error
from academy.python_checker import CheckOutcome, check_python_exercise
from academy.python_runner import RunResult, run_python
from academy.sql_engine import SqlCheckOutcome, StatementResult
from academy.ui.common import python_timeout, safe_key

DIFFICULTY_BADGES = {
    "beginner": ":green-badge[Beginner]",
    "intermediate": ":orange-badge[Intermediate]",
    "challenge": ":red-badge[Challenge]",
}

EDITOR_HELP = ("Type your code here. The Tab key indents by 4 spaces (Shift+Tab removes them). "
               "To leave the editor with the keyboard, press Esc and then Tab.")


# ---------------------------------------------------------------- shared helpers


def _init_editor(state_key: str, draft_key: str, starter: str) -> None:
    if state_key not in st.session_state:
        draft = progress.load_draft(draft_key)
        st.session_state[state_key] = draft if draft is not None else starter


def _reset_editor(state_key: str, draft_key: str, starter: str, result_key: str) -> None:
    st.session_state[state_key] = starter
    st.session_state.pop(result_key, None)
    progress.delete_draft(draft_key)


def _hints_and_solution(exercise: Exercise, prefix: str, language: str) -> None:
    hints_key = f"hints_shown_{prefix}"
    if hints_key not in st.session_state:
        st.session_state[hints_key] = int(progress.get_help_usage(exercise.key).get("hints_shown") or 0)
    shown = st.session_state[hints_key]
    for number, hint in enumerate(exercise.hints[:shown], 1):
        st.info(f"**Hint {number}:** {hint}", icon="💡")
    if shown < len(exercise.hints):
        label = "Show a hint" if shown == 0 else "Show the next hint"
        if st.button(f"💡 {label} ({len(exercise.hints) - shown} left)", key=f"hintbtn_{prefix}"):
            st.session_state[hints_key] = shown + 1
            progress.record_hint(exercise.key, shown + 1)
            st.rerun()

    if exercise.solution:
        with st.expander("🔑 Solution and explanation"):
            st.caption("Try to solve it yourself first - struggling a little is how learning happens. "
                       "Use the hints before looking here.")
            reveal = st.checkbox("I have tried - show me the solution", key=f"reveal_{prefix}")
            if reveal:
                if not st.session_state.get(f"revealed_logged_{prefix}"):
                    progress.record_solution_viewed(exercise.key)
                    st.session_state[f"revealed_logged_{prefix}"] = True
                st.code(exercise.solution, language=language)
                if exercise.explanation:
                    st.markdown(exercise.explanation)
                st.caption("Viewing the solution is fine - but exercises passed after viewing it count only "
                           "half towards your mastery score. Try again tomorrow without looking!")


def _after_check(exercise: Exercise, library: Library | None, passed: bool) -> None:
    """If this pass completed the lesson, celebrate (the page reloads to update its status)."""
    if not passed or library is None:
        return
    lesson = library.lessons.get(exercise.lesson_id)
    if lesson and progress.refresh_completion(lesson):
        st.session_state["just_completed"] = lesson.title
        st.rerun()


def show_completion_message() -> None:
    """Call near the top of any page that shows exercises or quizzes."""
    title = st.session_state.pop("just_completed", None)
    if title:
        st.balloons()
        st.success(f"🎉 Lesson complete: **{title}**. It is now scheduled for a quick review tomorrow "
                   "(see Progress & Revision).")


# ---------------------------------------------------------------- python


def show_run_result(result: RunResult) -> None:
    if result.stdout:
        st.markdown("**Output** (what your program printed):")
        st.code(result.stdout.rstrip("\n"), language="text")
    elif result.ok:
        st.caption("Your program ran without errors but printed nothing. Use `print(...)` to show something.")
    if result.output_truncated:
        st.warning("The output was cut short because it was very long.")
    if result.timed_out:
        explanation = explain_python_error(None, timed_out=True)
        st.error(f"Stopped after {result.timeout_seconds:g} seconds.", icon="⏱️")
        st.markdown(explanation.as_markdown())
    elif result.error:
        error = result.error
        line = f" on line {error['line']}" if error.get("line") else ""
        st.error(f"**{error['type']}**{line}: {error.get('message', '')}", icon="🐞")
        explanation = explain_python_error(error)
        if explanation:
            with st.container(border=True):
                st.markdown(explanation.as_markdown())
        if error.get("traceback"):
            with st.expander("Technical details (the full error message, called a *traceback*)"):
                st.code(error["traceback"], language="text")
                st.caption("Read a traceback from the bottom up: the last line names the error, the lines "
                           "above show where it happened.")
    if result.ok:
        st.caption(f"Finished in {result.duration:.2f} seconds.")


def show_check_outcome(outcome: CheckOutcome) -> None:
    if outcome.passed:
        st.success(outcome.summary, icon="✅")
    else:
        st.warning(outcome.summary, icon="🔎")
    for detail in outcome.details:
        icon = "✅" if detail.passed else "❌"
        st.markdown(f"{icon} {detail.name}" + (f" - {detail.message}" if detail.message else ""))
        if not detail.passed and detail.expected is not None:
            left, right = st.columns(2)
            with left:
                st.caption("Expected output")
                st.code(detail.expected.rstrip("\n") or "(nothing)", language="text")
            with right:
                st.caption("Your output")
                st.code((detail.actual or "").rstrip("\n") or "(nothing)", language="text")
    if outcome.run and not outcome.passed and (outcome.run.error or outcome.run.timed_out):
        with st.expander("What went wrong when running your code", expanded=True):
            show_run_result(outcome.run)


def _expected_example(exercise: Exercise) -> tuple[str, str] | None:
    check = exercise.check or {}
    if check.get("hide_expected"):
        return None
    if "expected" in check:
        return str(check.get("stdin", exercise.stdin) or ""), str(check["expected"])
    cases = check.get("cases") or []
    if cases:
        return str(cases[0].get("stdin", "") or ""), str(cases[0].get("expected", ""))
    return None


def render_python_exercise(exercise: Exercise, library: Library | None = None, *, number: int | None = None) -> None:
    prefix = safe_key(exercise.key)
    code_key, stdin_key, result_key = f"code_py_{prefix}", f"stdin_{prefix}", f"result_{prefix}"
    _init_editor(code_key, exercise.key, exercise.starter)
    if stdin_key not in st.session_state:
        example = _expected_example(exercise)
        st.session_state[stdin_key] = exercise.stdin or (example[0] if example else "")

    title = f"{number}. {exercise.title}" if number else exercise.title
    st.markdown(f"#### {title} {DIFFICULTY_BADGES.get(exercise.difficulty, '')}")
    st.markdown(exercise.instructions)

    example = _expected_example(exercise)
    if example and example[1].strip():
        with st.expander("Expected result (example)"):
            if example[0].strip():
                st.caption("When the program is given this input:")
                st.code(example[0].rstrip("\n"), language="text")
            st.caption("it should print exactly:")
            st.code(example[1].rstrip("\n"), language="text")

    if exercise.is_manual:
        done = progress.load_snapshot().attempts.get(exercise.key)
        if done and any(a["passed"] for a in done):
            st.success("You marked this task as done.", icon="✅")
        elif st.button("✅ I have done this", key=f"manual_{prefix}"):
            progress.record_exercise_attempt(exercise, "(practical task)", True, "Marked as done", self_assessed=True)
            _after_check(exercise, library, True)
            st.rerun()
        _hints_and_solution(exercise, prefix, "python")
        return

    code = st.text_area("Your code", key=code_key, height=max(140, 24 * (exercise.starter.count("\n") + 4)),
                        help=EDITOR_HELP)
    if "input(" in (code or "") or exercise.stdin:
        st.text_area("Input for your program - type one answer per line (used by `input()`)",
                     key=stdin_key, height=80)

    with st.container(horizontal=True):
        run_clicked = st.button("▶ Run", key=f"run_{prefix}", help="Run your code and see what it prints.")
        check_clicked = st.button("✓ Check my answer", key=f"check_{prefix}", type="primary",
                                  help="Run the automatic checks for this exercise.")
        st.button("↺ Reset", key=f"reset_{prefix}", on_click=_reset_editor,
                  args=(code_key, exercise.key, exercise.starter, result_key),
                  help="Put the starter code back (your current code is lost).")

    if run_clicked or check_clicked:
        progress.save_draft(exercise.key, code or "")
    if run_clicked:
        with st.spinner("Running your code..."):
            st.session_state[result_key] = ("run", run_python(code or "", st.session_state.get(stdin_key, ""),
                                                              timeout=python_timeout()))
    if check_clicked:
        with st.spinner("Checking your answer..."):
            outcome = check_python_exercise(exercise, code or "", timeout=python_timeout())
        progress.record_exercise_attempt(exercise, code or "", outcome.passed, outcome.feedback_text())
        st.session_state[result_key] = ("check", outcome)
        _after_check(exercise, library, outcome.passed)

    stored = st.session_state.get(result_key)
    if stored:
        kind, value = stored
        with st.container(border=True):
            if kind == "run":
                show_run_result(value)
            else:
                show_check_outcome(value)
                if value.passed and exercise.explanation:
                    with st.expander("Why this works (model solution)"):
                        st.code(exercise.solution, language="python")
                        st.markdown(exercise.explanation)
    _hints_and_solution(exercise, prefix, "python")


# ---------------------------------------------------------------- sql


def unique_columns(columns: list[str]) -> list[str]:
    seen: dict[str, int] = {}
    result = []
    for name in columns:
        count = seen.get(name, 0)
        seen[name] = count + 1
        result.append(name if count == 0 else f"{name} ({count + 1})")
    return result


def result_frame(result: StatementResult) -> pd.DataFrame:
    return pd.DataFrame([list(r) for r in result.rows], columns=unique_columns(result.columns))


def show_statement_results(results: list[StatementResult], show_sql: bool = None) -> None:
    if not results:
        st.info("There was no SQL statement to run.")
        return
    multiple = len(results) > 1 if show_sql is None else show_sql
    for result in results:
        if multiple:
            st.caption(f"`{result.sql[:160]}{'...' if len(result.sql) > 160 else ''}`")
        if result.error:
            st.error(f"**Error:** {result.error}", icon="🐞")
            with st.container(border=True):
                st.markdown(explain_sql_error(result.error).as_markdown())
        elif result.is_query:
            if result.rows:
                st.dataframe(result_frame(result), hide_index=True, width="stretch")
            else:
                st.dataframe(pd.DataFrame(columns=unique_columns(result.columns)), hide_index=True, width="stretch")
            st.caption(result.message + f" ({result.elapsed * 1000:.0f} ms)")
        else:
            st.success(result.message, icon="✅")


@st.cache_data(show_spinner=False)
def dataset_overview(dataset: str) -> list[tuple[str, list[dict], int]]:
    conn = sql_engine.fresh_connection(dataset)
    try:
        return [(t, sql_engine.table_columns(conn, t), sql_engine.table_row_count(conn, t))
                for t in sql_engine.table_names(conn)]
    finally:
        conn.close()


def show_dataset_tables(dataset: str) -> None:
    for table, columns, count in dataset_overview(dataset):
        cols = ", ".join(f"`{c['column']}`" for c in columns)
        st.markdown(f"- **{table}** ({count} rows): {cols}")


def show_sql_check_outcome(outcome: SqlCheckOutcome) -> None:
    if outcome.passed:
        st.success(outcome.summary, icon="✅")
    else:
        st.warning(outcome.summary, icon="🔎")
    for detail in outcome.details:
        st.markdown(f"- {detail}")
    errors = [s for s in outcome.statements if s.error]
    if errors:
        with st.container(border=True):
            st.markdown(explain_sql_error(errors[0].error).as_markdown())
    if outcome.user_result is not None:
        st.caption("Your result")
        st.dataframe(result_frame(outcome.user_result), hide_index=True, width="stretch")


def render_sql_exercise(exercise: Exercise, library: Library | None = None, *, number: int | None = None) -> None:
    prefix = safe_key(exercise.key)
    code_key, result_key = f"code_sql_{prefix}", f"result_{prefix}"
    _init_editor(code_key, exercise.key, exercise.starter)

    title = f"{number}. {exercise.title}" if number else exercise.title
    st.markdown(f"#### {title} {DIFFICULTY_BADGES.get(exercise.difficulty, '')}")
    st.markdown(exercise.instructions)
    if exercise.is_manual:
        done = progress.load_snapshot().attempts.get(exercise.key)
        if done and any(a["passed"] for a in done):
            st.success("You marked this task as done.", icon="✅")
        elif st.button("✅ I have done this", key=f"manual_{prefix}"):
            progress.record_exercise_attempt(exercise, "(practical task)", True, "Marked as done", self_assessed=True)
            _after_check(exercise, library, True)
            st.rerun()
        _hints_and_solution(exercise, prefix, "sql")
        return

    datasets = sql_engine.list_datasets()
    ds = datasets.get(exercise.dataset)
    with st.expander(f"Tables in the **{ds.title if ds else exercise.dataset}** database"):
        show_dataset_tables(exercise.dataset)
        st.caption("Exercises always run on a fresh copy of the sample database, so you cannot break anything.")

    code = st.text_area("Your SQL", key=code_key, height=max(120, 24 * (exercise.starter.count("\n") + 4)),
                        help=EDITOR_HELP)
    with st.container(horizontal=True):
        run_clicked = st.button("▶ Run", key=f"run_{prefix}", help="Run your SQL on a fresh copy of the database.")
        check_clicked = st.button("✓ Check my answer", key=f"check_{prefix}", type="primary")
        expected_clicked = st.button("👀 Expected result", key=f"expected_{prefix}",
                                     help="See what the correct result looks like (not the query).")
        st.button("↺ Reset", key=f"reset_{prefix}", on_click=_reset_editor,
                  args=(code_key, exercise.key, exercise.starter, result_key))

    if run_clicked or check_clicked:
        progress.save_draft(exercise.key, code or "")
    if run_clicked:
        conn = sql_engine.fresh_connection(exercise.dataset)
        try:
            st.session_state[result_key] = ("run", sql_engine.execute(conn, code or ""))
        finally:
            conn.close()
    if check_clicked:
        outcome = sql_engine.check_sql_exercise(exercise, code or "")
        progress.record_exercise_attempt(exercise, code or "", outcome.passed, outcome.feedback_text())
        st.session_state[result_key] = ("check", outcome)
        _after_check(exercise, library, outcome.passed)
    if expected_clicked:
        st.session_state[result_key] = ("expected", sql_engine.expected_result(exercise))

    stored = st.session_state.get(result_key)
    if stored:
        kind, value = stored
        with st.container(border=True):
            if kind == "run":
                show_statement_results(value)
            elif kind == "check":
                show_sql_check_outcome(value)
                if value.passed and exercise.explanation:
                    with st.expander("Why this works (model solution)"):
                        st.code(exercise.solution, language="sql")
                        st.markdown(exercise.explanation)
            elif value is not None:
                order_note = " The order of rows matters here." if exercise.check.get("ordered") else \
                    " The order of rows does not matter here."
                st.caption("The correct answer produces this result." + order_note)
                st.dataframe(result_frame(value), hide_index=True, width="stretch")
    _hints_and_solution(exercise, prefix, "sql")


def render_exercise(exercise: Exercise, library: Library | None = None, *, number: int | None = None) -> None:
    if exercise.kind == "sql":
        render_sql_exercise(exercise, library, number=number)
    else:
        render_python_exercise(exercise, library, number=number)
