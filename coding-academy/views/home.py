"""Home dashboard: where you stopped, what to do next, what to revise."""

from datetime import datetime

import streamlit as st

from academy import db, progress
from academy.ui.common import (get_library, learner_name, lesson_link, page_link, percent,
                               show_content_problems, state_badge)

library = get_library()
snap = progress.load_snapshot()
statuses = progress.all_statuses(library, snap)
name = learner_name()

st.title(f"👋 Welcome back{', ' + name if name else ''}!" if snap.lessons else
         f"🎓 Welcome to your Coding Academy{', ' + name if name else ''}!")
show_content_problems(library)

if not snap.lessons:
    with st.container(border=True):
        st.markdown(
            "### Start here\n"
            "This app teaches you **Python** (a programming language) and **SQL** (the language for asking "
            "questions of databases) from absolute zero. Everything runs on your own computer and works "
            "without the internet.\n\n"
            "**How it works**\n"
            "1. Open a lesson and read the **Learn** tab.\n"
            "2. Try the exercises in the **Practise** tab - you type real code and the app checks it.\n"
            "3. Take the short **Quiz**. Passing the quiz and the beginner exercises completes the lesson.\n"
            "4. Come back for quick **reviews** - the app reminds you so you do not forget.\n\n"
            "If you have never programmed before, begin with the very first Python lesson below. "
            "SQL can be started at any time - it does not need Python."
        )
        first = library.track_lessons("python")[:1]
        if first:
            lesson_link(first[0], label=f"Start lesson 1: {first[0].title}", icon="🚀")
        page_link("help", "New to all this? Read 'How to use this app'", icon="❓", article="getting-started")

# --- continue where you stopped -------------------------------------------
left, right = st.columns(2)
with left:
    with st.container(border=True):
        st.markdown("#### ▶️ Continue where you stopped")
        current = progress.continue_lesson(library, snap)
        if current:
            status = statuses[current.id]
            st.markdown(f"**{current.title}**  \n{state_badge(status.state)}")
            unmet = [text for text, met in status.criteria if not met]
            if unmet and not status.completed:
                st.caption("Still to do: " + "; ".join(unmet[:3]))
            lesson_link(current, label="Open lesson", icon="📖")
        else:
            st.caption("You have not opened a lesson yet.")
with right:
    with st.container(border=True):
        st.markdown("#### 🧭 Recommended next")
        for track, label in (("python", "Python"), ("sql", "SQL")):
            upcoming = progress.next_lesson(library, track, statuses)
            if upcoming:
                lesson_link(upcoming, label=f"{label}: {upcoming.title}", icon="➡️")
            else:
                st.markdown(f"{label}: all lessons completed! 🎉")

# --- revision -------------------------------------------------------------
due = [library.lessons[lid] for lid, s in statuses.items() if s.review_due]
weak = [library.lessons[lid] for lid, s in statuses.items() if s.needs_revision and not s.review_due]
with st.container(border=True):
    st.markdown("#### 🔁 Revision")
    if due or weak:
        if due:
            st.markdown(f"**{len(due)} lesson(s) due for a quick review:** " + ", ".join(l.title for l in due[:6]))
        if weak:
            st.markdown("**Topics to strengthen:** " + ", ".join(l.title for l in weak[:6]))
        page_link("quizzes", "Start a revision quiz (about 5 minutes)", icon="🧠", mode="review")
    else:
        st.caption("Nothing to revise right now. Completed lessons are scheduled for spaced review automatically.")

# --- stats ----------------------------------------------------------------
py = progress.track_summary(library, "python", statuses)
sq = progress.track_summary(library, "sql", statuses)
streak, active_days = progress.activity_streak()
totals = progress.exercise_totals()
c1, c2, c3, c4 = st.columns(4)
c1.metric("Python lessons completed", f"{py.completed}/{py.total}")
c2.metric("SQL lessons completed", f"{sq.completed}/{sq.total}")
c3.metric("Exercises solved", totals["passed"])
c4.metric("Learning streak", f"{streak} day{'s' if streak != 1 else ''}", help=f"{active_days} active days in total")

# --- recent results -------------------------------------------------------
recent = progress.recent_quiz_attempts(5)
if recent:
    with st.container(border=True):
        st.markdown("#### 📊 Recent quiz results")
        for attempt in recent:
            pct = attempt["score"] / attempt["total"] if attempt["total"] else 0
            st.markdown(f"- {attempt['title'] or attempt['quiz_key']}: **{attempt['score']}/{attempt['total']}** "
                        f"({percent(pct)}) - {attempt['created_at'][:10]}")
        page_link("progress", "See all progress", icon="📈")

# --- quick links ----------------------------------------------------------
st.markdown("#### 🧰 Practise freely")
q1, q2, q3 = st.columns(3)
with q1:
    page_link("python_lab", "Python Practice Lab", icon="🐍")
with q2:
    page_link("sql_lab", "SQL Practice Lab", icon="🗄️")
with q3:
    page_link("knowledge", "Search the Knowledge Base", icon="🔎")

# --- backup reminder ------------------------------------------------------
last = db.get_setting("last_backup", "")
if snap.lessons:
    try:
        days = (datetime.now() - datetime.fromisoformat(last)).days if last else None
    except ValueError:
        days = None
    if days is None or days > 14:
        st.info("💾 It has been a while since your last backup. Backups protect your progress if your computer "
                "has a problem.", icon="💾")
        page_link("backup", "Make a backup now", icon="💾")
