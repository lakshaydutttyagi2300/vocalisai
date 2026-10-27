"""Progress and revision: what you have learned, what to revise, your results over time."""

import pandas as pd
import streamlit as st

from academy import personal, progress
from academy.content import TRACK_NAMES
from academy.ui.common import STATE_ICONS, get_library, lesson_link, page_link

library = get_library()
snap = progress.load_snapshot()
statuses = progress.all_statuses(library, snap)

st.title("📈 Progress & Revision")
st.caption("Your status for each lesson comes from real results - quiz answers and exercises - never just from "
           "opening a lesson. See *How is mastery measured?* at the bottom of this page.")

# --- summary -----------------------------------------------------------------
totals = progress.exercise_totals()
streak, active_days = progress.activity_streak()
cols = st.columns(4)
for col, track in zip(cols[:2], ("python", "sql")):
    summary = progress.track_summary(library, track, statuses)
    col.metric(f"{TRACK_NAMES[track]} lessons", f"{summary.completed}/{summary.total} completed",
               help=f"{summary.mastered} mastered, {summary.started} started")
cols[2].metric("Exercises solved", totals["passed"], help=f"{totals['attempts']} attempts in total")
cols[3].metric("Projects completed", len(personal.completed_projects()))
st.caption(f"Learning streak: {streak} day(s) · Active days in total: {active_days}")

# --- revision ----------------------------------------------------------------
st.subheader("🔁 What to revise")
due = [(library.lessons[lid], s) for lid, s in statuses.items() if s.review_due]
weak = [(library.lessons[lid], s) for lid, s in statuses.items() if s.needs_revision]
if not due and not weak:
    st.success("Nothing needs revision right now.")
else:
    if due:
        st.markdown("**Due for spaced review:**")
        for lesson, s in due:
            lesson_link(lesson, label=f"{lesson.title} (due {s.review_due_date})", icon="🔁")
    if weak:
        st.markdown("**Topics you are struggling with:**")
        for lesson, s in weak:
            lesson_link(lesson, label=f"{lesson.title} - {'; '.join(s.revision_reasons)}", icon="⚠️")
    page_link("quizzes", "Start a revision quiz", icon="🧠", mode="review")

missed = progress.missed_questions(library)
if missed:
    with st.expander(f"❓ Questions you got wrong last time ({len(missed)})"):
        for question, times in missed:
            lesson = library.lessons[question.lesson_id]
            st.markdown(f"- {question.question}  \n  *Lesson: {lesson.title} · missed {times} time(s)*  \n"
                        f"  Correct answer: `{question.correct_text}`")

# --- per-level progress ---------------------------------------------------------
st.subheader("🗺️ Progress by level")
for track in ("python", "sql"):
    st.markdown(f"**{TRACK_NAMES[track]}**")
    for level in library.levels.get(track, []):
        done = sum(1 for ls in level.lessons if statuses[ls.id].completed)
        total = len(level.lessons)
        st.progress(done / total if total else 0, text=f"Level {level.number}: {level.title} - {done}/{total}")

# --- lesson table -----------------------------------------------------------------
st.subheader("📋 Every lesson")
rows = []
for lesson in library.all_lessons():
    s = statuses[lesson.id]
    rows.append({
        "Track": TRACK_NAMES[lesson.track],
        "Level": lesson.level,
        "Lesson": lesson.title,
        "Status": f"{STATE_ICONS[s.state]} {s.state}",
        "Best quiz %": round(100 * s.quiz_best) if s.quiz_best is not None else None,
        "Exercises": f"{s.exercises_passed}/{s.exercises_total}",
        "Mastery %": round(100 * s.mastery_score) if s.mastery_score is not None else None,
        "Needs revision": "yes" if s.needs_revision else "",
        "Next review": s.review_due_date or "",
    })
frame = pd.DataFrame(rows)
show = st.segmented_control("Show", ["All", "Started", "Completed", "Needs revision"], default="All",
                            key="progress_filter")
if show == "Started":
    frame = frame[~frame["Status"].str.contains("not started")]
elif show == "Completed":
    frame = frame[frame["Status"].str.contains("completed|mastered")]
elif show == "Needs revision":
    frame = frame[frame["Needs revision"] == "yes"]
st.dataframe(frame, hide_index=True, width="stretch", column_config={
    "Mastery %": st.column_config.ProgressColumn("Mastery %", min_value=0, max_value=100, format="%d%%"),
})

# --- results over time --------------------------------------------------------------
attempts = list(reversed(progress.recent_quiz_attempts(100)))
if attempts:
    st.subheader("📊 Quiz results over time")
    chart = pd.DataFrame({
        "Attempt": range(1, len(attempts) + 1),
        "Score %": [round(100 * a["score"] / a["total"]) if a["total"] else 0 for a in attempts],
    }).set_index("Attempt")
    st.line_chart(chart, y="Score %", height=240)

# --- export --------------------------------------------------------------------------
st.subheader("📤 Export your progress")
st.caption("A readable copy of your progress for your own records. To keep a restorable copy of ALL your data, "
           "use Backup & Restore instead.")
c1, c2 = st.columns(2)
c1.download_button("Download progress report (CSV for Excel)", pd.DataFrame(rows).to_csv(index=False),
                   file_name="coding-academy-progress.csv", mime="text/csv")
c2.download_button("Download full progress data (JSON)", progress.export_progress_json(library),
                   file_name="coding-academy-progress.json", mime="application/json")

with st.expander("How is mastery measured?"):
    st.markdown(f"""
- **Started** - you opened the lesson.
- **Practising** - you attempted its exercises or quiz.
- **Completed** - you marked it as read, scored at least the pass mark (Settings, default 70%) in its quiz,
  and passed every *beginner* exercise.
- **Mastered** - completed, mastery estimate of {progress.MASTERY_THRESHOLD:.0%} or more, and you passed at least
  one spaced review on a later day.
- **Mastery estimate** - the average of (a) the share of your most recent answers (up to 10) to the lesson's quiz
  questions that were correct and (b) your exercise score (1 point per exercise passed without viewing the
  solution, half a point if you viewed it first).
- **Needs revision** - recent quiz answers below {progress.WEAK_THRESHOLD:.0%} correct, or an exercise failed 3+
  times without being solved yet.
- **Spaced review** - after completing a lesson it comes back for review after 1, 3, 7, 14, 30, 60 and 120 days
  as long as you keep passing (80%+). A failed review starts again at 1 day.
""")
