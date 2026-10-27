"""Lesson page and academy overview (shared by the Python and SQL academies)."""

from __future__ import annotations

import streamlit as st

from academy import personal, progress
from academy.content import TRACK_NAMES, Lesson, Library
from academy.ui.common import (PAGES, STATE_ICONS, get_library, lesson_link, page_link, percent,
                               safe_key, show_content_problems, state_badge)
from academy.ui.exercises import render_exercise, show_completion_message
from academy.ui.quiz import render_quiz

LEARN_SECTIONS_ORDER = ["Simple explanation", "Real-world analogy", "Technical definition", "Step-by-step examples",
                        "Common mistakes", "Practical application"]
SECTION_ICONS = {
    "Simple explanation": "💬", "Real-world analogy": "🧭", "Technical definition": "📐",
    "Step-by-step examples": "🧪", "Common mistakes": "⚠️", "Practical application": "🛠️",
}


def _record_open_once(lesson: Lesson) -> None:
    if st.session_state.get("_last_opened_lesson") != lesson.id:
        progress.record_lesson_open(lesson.id)
        st.session_state["_last_opened_lesson"] = lesson.id


def _lesson_header(lesson: Lesson, library: Library, status: progress.LessonStatus) -> None:
    level = library.level_of(lesson)
    level_text = f"Level {lesson.level}: {level.title}" if level else f"Level {lesson.level}"
    page = PAGES.get("python_academy" if lesson.track == "python" else "sql_academy")
    if page is not None:
        st.page_link(page, label=f"{TRACK_NAMES[lesson.track]} Academy  ›  {level_text}", icon="⬅️")
    st.title(lesson.title)
    meta = [state_badge(status.state), f":gray-badge[⏱ about {lesson.minutes} minutes]"]
    if status.needs_revision:
        meta.append(":red-badge[Needs revision]")
    if status.review_due:
        meta.append(":blue-badge[Review due]")
    if status.mastery_score is not None:
        meta.append(f":gray-badge[Mastery estimate {status.mastery_score:.0%}]")
    st.markdown(" ".join(meta))
    if lesson.summary:
        st.markdown(f"*{lesson.summary}*")

    bookmarked = personal.is_bookmarked("lesson", lesson.id)
    with st.container(horizontal=True):
        if st.button("★ Bookmarked" if bookmarked else "☆ Bookmark this lesson", key=f"bm_{lesson.id}"):
            personal.toggle_bookmark("lesson", lesson.id, lesson.title)
            st.rerun()
        previous = library.previous_lesson(lesson)
        following = library.next_lesson(lesson)
        if previous:
            lesson_link(previous, label=f"Previous: {previous.title}", icon="◀️")
        if following:
            lesson_link(following, label=f"Next: {following.title}", icon="▶️")


def _learn_tab(lesson: Lesson, library: Library, status: progress.LessonStatus) -> None:
    left, right = st.columns(2)
    with left:
        st.markdown("##### 🎯 What you will learn")
        for objective in lesson.objectives:
            st.markdown(f"- {objective}")
    with right:
        st.markdown("##### 📋 Before you start")
        if lesson.prerequisites:
            for prereq_id in lesson.prerequisites:
                prereq = library.lessons.get(prereq_id)
                if prereq:
                    done = status_for(prereq_id).completed
                    lesson_link(prereq, label=f"{'✅' if done else '⬜'} {prereq.title}")
        else:
            st.markdown("Nothing - this lesson starts from zero.")
    if lesson.intro:
        st.markdown(lesson.intro)
    shown = set()
    for name in LEARN_SECTIONS_ORDER:
        body = lesson.section(name)
        if body:
            st.markdown(f"### {SECTION_ICONS.get(name, '')} {name}")
            st.markdown(body)
            shown.add(name.lower())
    for heading, body in lesson.sections:
        if heading.lower() not in shown and heading.lower() != "revision notes":
            st.markdown(f"### {heading}")
            st.markdown(body)
    st.divider()
    if status.read_done:
        st.success("You marked this lesson as read. Next: try the exercises in the **Practise** tab.", icon="📖")
    elif st.button("✅ I have read this lesson", key=f"read_{lesson.id}", type="primary"):
        progress.set_read_done(lesson.id)
        if progress.refresh_completion(lesson):
            st.session_state["just_completed"] = lesson.title
        st.rerun()


def _practise_tab(lesson: Lesson, library: Library) -> None:
    if not lesson.exercises:
        st.info("This lesson has no exercises.")
        return
    st.caption("Work through the exercises in order. Beginner exercises are required to complete the lesson; "
               "intermediate and challenge exercises build mastery. Use **Run** to try your code and "
               "**Check my answer** when you think it is right.")
    snap = progress.load_snapshot()
    for difficulty in ("beginner", "intermediate", "challenge"):
        group = [e for e in lesson.exercises if e.difficulty == difficulty]
        if not group:
            continue
        st.subheader({"beginner": "🌱 Beginner", "intermediate": "🌿 Intermediate",
                      "challenge": "🌳 Challenge"}[difficulty])
        for exercise in group:
            ex_status = progress.exercise_status(snap, exercise)
            mark = "✅ " if ex_status.passed else ("🔁 " if ex_status.attempts else "")
            number = lesson.exercises.index(exercise) + 1
            prefix = safe_key(exercise.key)
            in_use = f"result_{prefix}" in st.session_state or st.session_state.get(f"hints_shown_{prefix}", 0) > 0
            open_now = in_use or (not ex_status.passed and difficulty == "beginner")
            with st.expander(f"{mark}Exercise {number}: {exercise.title}", expanded=open_now,
                             key=f"exp_{prefix}"):
                render_exercise(exercise, library, number=None)


def _revise_tab(lesson: Lesson, library: Library, status: progress.LessonStatus) -> None:
    notes = lesson.section("Revision notes")
    if notes:
        st.markdown("### 📝 Revision notes")
        st.markdown(notes)
    st.markdown("### ✅ Completion criteria")
    for text, met in status.criteria:
        st.markdown(f"{'✅' if met else '⬜'} {text}")
    if status.completed:
        st.success(f"Completed on {status.completed_at[:10]}.")
    st.markdown("### 📈 How well you know this lesson")
    c1, c2, c3 = st.columns(3)
    c1.metric("Best quiz score", percent(status.quiz_best))
    c2.metric("Exercises passed", f"{status.exercises_passed} / {status.exercises_total}")
    c3.metric("Mastery estimate", percent(status.mastery_score),
              help="Based on your recent quiz answers and on exercises passed without looking at the solution. "
                   "Opening a lesson does not count.")
    if status.revision_reasons:
        st.warning("Revise this lesson: " + "; ".join(status.revision_reasons))
    if status.review_due_date:
        st.caption(f"Next spaced review: {status.review_due_date}")

    st.markdown("### ➡️ What to learn next")
    following = library.next_lesson(lesson)
    if following:
        lesson_link(following, label=f"Next lesson: {following.title}", icon="▶️")
    else:
        st.markdown("You reached the end of this track - try the **Projects** to apply what you learned.")
        page_link("projects", "Go to Projects", icon="🛠️")

    st.markdown("### 🗒️ My notes for this lesson")
    for note in personal.list_notes(lesson_id=lesson.id):
        with st.container(border=True):
            st.markdown(f"**{note['title']}**  \n{note['body']}")
            st.caption(f"Updated {note['updated_at'].replace('T', ' ')}")
    with st.form(f"note_form_{safe_key(lesson.id)}", clear_on_submit=True):
        title = st.text_input("Note title", placeholder=f"e.g. Key idea from {lesson.title}")
        body = st.text_area("Note", placeholder="Write the idea in your own words - this really helps memory.")
        if st.form_submit_button("Save note"):
            if body.strip() or title.strip():
                personal.save_note(title or lesson.title, body, lesson.id)
                st.toast("Note saved")
                st.rerun()
            else:
                st.warning("Write something first.")


_STATUS_CACHE_KEY = "_status_cache"


def status_for(lesson_id: str) -> progress.LessonStatus:
    return st.session_state[_STATUS_CACHE_KEY][lesson_id]


def render_lesson(lesson: Lesson, library: Library) -> None:
    _record_open_once(lesson)
    statuses = progress.all_statuses(library)
    st.session_state[_STATUS_CACHE_KEY] = statuses
    status = statuses[lesson.id]
    show_completion_message()
    _lesson_header(lesson, library, status)
    quiz_label = f"✅ Quiz ({len(lesson.quiz)})" if lesson.quiz else "✅ Quiz"
    learn, practise, quiz, revise = st.tabs(
        ["📖 Learn", f"✍️ Practise ({len(lesson.exercises)})", quiz_label, "📝 Revise & next"],
        key=f"lesson_tabs_{safe_key(lesson.id)}",
    )
    with learn:
        _learn_tab(lesson, library, status)
    with practise:
        _practise_tab(lesson, library)
    with quiz:
        if lesson.quiz:
            st.caption(f"Answer all {len(lesson.quiz)} questions, then submit. You need "
                       f"{progress.pass_mark(progress.load_snapshot()):.0%} to pass. You can retake it any time.")
        render_quiz(lesson.id, "lesson", f"Lesson quiz: {lesson.title}", lesson.quiz, library=library)
    with revise:
        _revise_tab(lesson, library, status)


def render_academy(track: str) -> None:
    library = get_library()
    lesson_id = st.query_params.get("lesson")
    if lesson_id:
        lesson = library.lessons.get(lesson_id)
        if lesson and lesson.track == track:
            render_lesson(lesson, library)
            return
        st.error("That lesson could not be found. It may have been renamed. Choose a lesson below.")

    name = TRACK_NAMES[track]
    st.title(f"{'🐍' if track == 'python' else '🗄️'} {name} Academy")
    if track == "python":
        st.markdown("Learn Python from absolute zero: what a program is, then variables, decisions, loops, "
                    "collections, functions, files, objects and professional practices.")
    else:
        st.markdown("Learn SQL, the language for asking questions of databases - from your first `SELECT` to "
                    "window functions, database design and query optimisation. All practice uses SQLite on "
                    "your own computer.")
    show_content_problems(library)
    levels = library.levels.get(track, [])
    if not levels:
        st.info("No lessons were found for this track.")
        return
    statuses = progress.all_statuses(library)
    summary = progress.track_summary(library, track, statuses)
    st.progress(summary.completed / summary.total if summary.total else 0,
                text=f"{summary.completed} of {summary.total} lessons completed · {summary.mastered} mastered")
    upcoming = progress.next_lesson(library, track, statuses)
    if upcoming:
        with st.container(border=True):
            st.markdown(f"**Recommended next:** {upcoming.title}  \n{upcoming.summary}")
            lesson_link(upcoming, label="Open this lesson", icon="▶️")

    st.caption("Legend: " + " · ".join(f"{icon} {state.capitalize()}" for state, icon in STATE_ICONS.items()))
    for level in levels:
        done = sum(1 for ls in level.lessons if statuses[ls.id].completed)
        with st.expander(f"Level {level.number}: {level.title}  ({done}/{len(level.lessons)} completed)",
                         expanded=any(not statuses[ls.id].completed for ls in level.lessons) and done > 0
                         or (level.number == levels[0].number and done == 0)):
            if level.description:
                st.markdown(level.description)
            for lesson in level.lessons:
                status = statuses[lesson.id]
                extra = []
                if status.needs_revision:
                    extra.append("needs revision")
                if status.review_due:
                    extra.append("review due")
                if status.mastery_score is not None:
                    extra.append(f"mastery {status.mastery_score:.0%}")
                suffix = f"  ({', '.join(extra)})" if extra else ""
                lesson_link(lesson, label=f"{STATE_ICONS[status.state]} {lesson.title} · {lesson.minutes} min{suffix}")
