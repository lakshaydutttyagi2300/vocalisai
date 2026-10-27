"""Quiz widget: answer questions, get marked, see an explanation for every question."""

from __future__ import annotations

import streamlit as st

from academy import progress
from academy.content import Library, QuizQuestion
from academy.ui.common import safe_key


def _language(question: QuizQuestion, library: Library | None) -> str:
    if question.code_language:
        return question.code_language
    if library and question.lesson_id in library.lessons:
        return library.lessons[question.lesson_id].track
    return "python"


def render_quiz(quiz_key: str, kind: str, title: str, questions: list[QuizQuestion], *,
                library: Library | None = None, key_prefix: str | None = None) -> None:
    """kind: 'lesson', 'level' or 'review'."""
    prefix = safe_key(key_prefix or quiz_key)
    result_key, version_key = f"quizresult_{prefix}", f"quizversion_{prefix}"
    version = st.session_state.setdefault(version_key, 0)
    if not questions:
        st.info("There are no quiz questions here yet.")
        return

    result = st.session_state.get(result_key)
    if result is None:
        with st.form(f"quizform_{prefix}_{version}"):
            for number, question in enumerate(questions, 1):
                st.markdown(f"**Question {number} of {len(questions)}.** {question.question}")
                if question.code:
                    st.code(question.code.rstrip("\n"), language=_language(question, library))
                widget_key = f"q_{prefix}_{version}_{safe_key(question.key)}"
                if question.type == "choice":
                    st.radio("Choose one answer", question.options, index=None, key=widget_key,
                             label_visibility="collapsed")
                else:
                    st.text_input("Type your answer", key=widget_key, label_visibility="collapsed",
                                  placeholder="Type your answer here")
                st.write("")
            submitted = st.form_submit_button("Submit my answers", type="primary")
        if submitted:
            answers = {}
            for question in questions:
                value = st.session_state.get(f"q_{prefix}_{version}_{safe_key(question.key)}")
                answers[question.key] = value if value not in ("", None) else None
            missing = [i for i, q in enumerate(questions, 1) if answers[q.key] is None]
            if missing:
                st.warning("Please answer every question before submitting (a guess is fine - you will see the "
                           f"correct answers afterwards). Unanswered: {', '.join(map(str, missing))}.")
                return
            graded = progress.grade_and_record_quiz(quiz_key, kind, title, questions, answers)
            st.session_state[result_key] = graded
            if kind == "lesson" and library and quiz_key in library.lessons:
                if progress.refresh_completion(library.lessons[quiz_key]):
                    st.session_state["just_completed"] = library.lessons[quiz_key].title
            st.rerun()
        return

    snap = progress.load_snapshot()
    mark = progress.pass_mark(snap)
    if result.percent >= mark:
        st.success(f"You scored **{result.score} out of {result.total}** ({result.percent:.0%}). Well done!",
                   icon="🎯")
    else:
        st.warning(f"You scored **{result.score} out of {result.total}** ({result.percent:.0%}). The pass mark is "
                   f"{mark:.0%}. Read the explanations below, review the lesson, then try again.", icon="📚")
    if kind == "review":
        for lesson_id, (right, total) in result.per_lesson.items():
            lesson = library.lessons.get(lesson_id) if library else None
            name = lesson.title if lesson else lesson_id
            if right / total >= progress.REVIEW_PASS:
                st.markdown(f"- ✅ **{name}**: {right}/{total} - next review in a longer gap.")
            else:
                st.markdown(f"- 🔁 **{name}**: {right}/{total} - you will see this lesson again tomorrow.")

    for number, (question, given, correct) in enumerate(result.per_question, 1):
        with st.container(border=True):
            st.markdown(f"{'✅' if correct else '❌'} **Question {number}.** {question.question}")
            if question.code:
                st.code(question.code.rstrip("\n"), language=_language(question, library))
            st.markdown(f"Your answer: `{given}`")
            if not correct:
                st.markdown(f"Correct answer: `{question.correct_text}`")
            if question.explanation:
                st.markdown(f"**Why:** {question.explanation}")

    if st.button("Try the quiz again", key=f"retry_{prefix}"):
        st.session_state.pop(result_key, None)
        st.session_state[version_key] = version + 1
        st.rerun()
