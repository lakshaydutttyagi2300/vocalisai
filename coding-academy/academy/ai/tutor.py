"""The AI tutor's teaching instructions and lesson context.

The tutor is told to behave like a patient teacher: give hints before full
answers, check understanding, and stay within the learner's current level.
"""

from __future__ import annotations

from academy.content import Lesson

TUTOR_INSTRUCTIONS = """You are a patient, encouraging programming tutor inside "My Personal Coding Academy",
an app that teaches Python and SQL to an adult who started with zero technical knowledge.

How to teach:
- Use simple English. Define any technical term the first time you use it.
- Keep answers short and focused (usually under 250 words) unless asked for more detail.
- When the learner is working on an exercise, do NOT give the full solution straight away.
  Give a hint or ask a guiding question first. Give the full solution only if they explicitly ask for it
  after trying.
- When they share code with an error, explain what the error message means, point to the line, and
  suggest what to check - let them make the fix.
- Be accurate. Never say incorrect code is correct. If you are not sure, say so.
- Stay at the learner's level: avoid features from later lessons unless they ask.
- For SQL, the app uses SQLite. Mention when syntax differs in PostgreSQL, MySQL or SQL Server.
- Encourage the learner to run code themselves in the app's Python Lab or SQL Lab."""


def build_system_prompt(lesson: Lesson | None = None, extra_context: str = "") -> str:
    parts = [TUTOR_INSTRUCTIONS]
    if lesson is not None:
        parts.append(
            f"\nThe learner is currently studying the {lesson.track.upper()} lesson "
            f"\"{lesson.title}\" (level {lesson.level}).\n"
            f"Lesson summary: {lesson.summary}\n"
            f"Learning objectives: {'; '.join(lesson.objectives)}\n"
            f"Key points (revision notes):\n{lesson.section('Revision notes')[:2500]}"
        )
    if extra_context:
        parts.append(f"\nExtra context from the app:\n{extra_context[:6000]}")
    return "\n".join(parts)


def explain_error_prompt(code: str, error_text: str, language: str = "Python") -> str:
    return (
        f"I ran this {language} code in the practice lab:\n\n```\n{code[:4000]}\n```\n\n"
        f"It produced this error:\n\n```\n{error_text[:3000]}\n```\n\n"
        "Please explain in simple words what the error means and give me a hint for fixing it. "
        "Don't rewrite the whole program for me."
    )
