"""Quizzes and assessments: revision quizzes, lesson quizzes, level assessments, history."""

import random

import pandas as pd
import streamlit as st

from academy import db, progress
from academy.content import TRACK_NAMES
from academy.ui.common import get_library, lesson_link
from academy.ui.exercises import show_completion_message
from academy.ui.quiz import render_quiz

library = get_library()
st.title("🧠 Quizzes & Assessments")
show_completion_message()
statuses = progress.all_statuses(library)

tab_names = ["🔁 Revision quiz", "📘 Lesson quizzes", "🏅 Level assessments", "📜 History"]
default_tab = tab_names[0] if st.query_params.get("mode") == "review" else None
review_tab, lesson_tab, level_tab, history_tab = st.tabs(tab_names, key="quiz_tabs", default=default_tab)

with review_tab:
    st.markdown("Short mixed quizzes on lessons that are **due for review** (spaced repetition) or that you "
                "**found difficult**. Reviewing just before you would forget is the most efficient way to "
                "remember things long-term.")
    due = [lid for lid, s in statuses.items() if s.review_due]
    weak = [lid for lid, s in statuses.items() if s.needs_revision]
    if not due and not weak:
        st.success("Nothing is due for review right now. Complete more lessons, or come back tomorrow.")
        upcoming = sorted((s.review_due_date, lid) for lid, s in statuses.items() if s.review_due_date)
        if upcoming:
            st.caption(f"Next review: {library.lessons[upcoming[0][1]].title} on {upcoming[0][0]}.")
    else:
        st.markdown(f"Due for review: **{len(due)}** lesson(s) · Needs strengthening: **{len(weak)}** lesson(s)")
        seed_key = "review_seed"
        st.session_state.setdefault(seed_key, random.randint(1, 10_000))
        questions = progress.build_review_quiz(library, statuses, seed=st.session_state[seed_key])
        if questions:
            render_quiz(f"review-{db.today()}", "review", "Revision quiz", questions, library=library,
                        key_prefix=f"review_{st.session_state[seed_key]}")
            if st.button("Give me a different set of questions", key="new_review"):
                st.session_state[seed_key] = random.randint(1, 10_000)
                st.rerun()
        else:
            st.info("The lessons due for review have no quiz questions.")

with lesson_tab:
    track = st.radio("Track", ["python", "sql"], format_func=TRACK_NAMES.get, horizontal=True, key="quiz_track")
    lessons = [ls for ls in library.track_lessons(track) if ls.quiz]
    if lessons:
        def label(ls):
            s = statuses[ls.id]
            best = f" - best {s.quiz_best:.0%}" if s.quiz_best is not None else ""
            return f"Level {ls.level} · {ls.title}{best}"
        lesson = st.selectbox("Choose a lesson", lessons, format_func=label, key="quiz_lesson")
        lesson_link(lesson, label="Open the lesson first (recommended)", icon="📖")
        render_quiz(lesson.id, "lesson", f"Lesson quiz: {lesson.title}", lesson.quiz, library=library,
                    key_prefix=f"quizpage_{lesson.id}")
    else:
        st.info("No quizzes for this track yet.")

with level_tab:
    st.markdown("A level assessment mixes questions from every lesson in a level - a good check before moving "
                "on to the next level.")
    track = st.radio("Track", ["python", "sql"], format_func=TRACK_NAMES.get, horizontal=True, key="level_track")
    levels = [lv for lv in library.levels.get(track, []) if any(ls.quiz for ls in lv.lessons)]
    if levels:
        level = st.selectbox("Level", levels, format_func=lambda lv: f"Level {lv.number}: {lv.title}",
                             key="level_choice")
        seed = st.session_state.setdefault(f"level_seed_{track}_{level.number}", random.randint(1, 10_000))
        questions = progress.build_level_assessment(library, track, level.number, seed=seed)
        st.caption(f"{len(questions)} questions.")
        render_quiz(f"level:{track}:{level.number}", "level", f"{TRACK_NAMES[track]} level {level.number} assessment",
                    questions, library=library, key_prefix=f"level_{track}_{level.number}_{seed}")
    else:
        st.info("No levels with quizzes yet.")

with history_tab:
    attempts = progress.recent_quiz_attempts(200)
    if not attempts:
        st.info("You have not taken any quizzes yet.")
    else:
        frame = pd.DataFrame([{
            "Date": a["created_at"].replace("T", " "),
            "Quiz": a["title"] or a["quiz_key"],
            "Type": a["kind"],
            "Score": f"{a['score']}/{a['total']}",
            "Percent": round(100 * a["score"] / a["total"]) if a["total"] else 0,
        } for a in attempts])
        st.dataframe(frame, hide_index=True, width="stretch",
                     column_config={"Percent": st.column_config.ProgressColumn("Percent", min_value=0,
                                                                               max_value=100, format="%d%%")})
