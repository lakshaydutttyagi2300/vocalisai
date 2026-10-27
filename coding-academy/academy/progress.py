"""Progress tracking, mastery estimates, revision scheduling and recommendations.

How the app decides your status for a lesson
--------------------------------------------
* Started     - you opened the lesson.
* Practising  - you have attempted its exercises or quiz.
* Completed   - ALL completion criteria are met:
                  1. you marked the lesson as read,
                  2. you scored at least the pass mark (default 70%) in its quiz,
                  3. you passed every *beginner* exercise.
* Mastered    - completed, a mastery score of 85% or more, AND you passed at
                least one spaced-revision review on a later day.
* Needs revision (a warning flag) - your recent quiz answers for the lesson are
                below 60% correct, or you failed an exercise 3+ times without
                passing it yet.

Mastery score = average of
  (a) the share of your most recent answers (up to 10) to this lesson's
      quiz questions that were correct, and
  (b) your exercise score: 1 point for each auto-checked exercise passed
      before looking at the solution, 0.5 if passed after looking.

Spaced revision (a simple "Leitner box" system)
-----------------------------------------------
When you complete a lesson it is scheduled for review tomorrow. Passing a
review (80%+) moves it to the next box and the gap grows:
1, 3, 7, 14, 30, 60, 120 days. Failing a review moves it back to box 0
(review again tomorrow).
"""

from __future__ import annotations

import json
import random
from dataclasses import dataclass, field
from datetime import date, datetime, timedelta

from academy import db
from academy.content import Exercise, Lesson, Library, QuizQuestion

REVIEW_INTERVALS = [1, 3, 7, 14, 30, 60, 120]
REVIEW_PASS = 0.8
MASTERY_THRESHOLD = 0.85
WEAK_THRESHOLD = 0.6
RECENT_ANSWERS = 10


# ---------------------------------------------------------------- snapshot


@dataclass
class Snapshot:
    """Everything needed to compute statuses, loaded with one connection."""

    lessons: dict[str, dict] = field(default_factory=dict)
    attempts: dict[str, list[dict]] = field(default_factory=dict)  # exercise_key -> attempts (oldest first)
    help: dict[str, dict] = field(default_factory=dict)
    answers: dict[str, list[dict]] = field(default_factory=dict)  # lesson_id -> answers (newest first)
    lesson_quiz_scores: dict[str, list[float]] = field(default_factory=dict)  # lesson_id -> % newest first
    reviews: dict[str, dict] = field(default_factory=dict)
    settings: dict[str, str] = field(default_factory=dict)


def load_snapshot() -> Snapshot:
    snap = Snapshot()
    with db.connect() as conn:
        snap.lessons = {r["lesson_id"]: dict(r) for r in conn.execute("SELECT * FROM lesson_progress")}
        for r in conn.execute("SELECT * FROM exercise_attempts ORDER BY id"):
            snap.attempts.setdefault(r["exercise_key"], []).append(dict(r))
        snap.help = {r["exercise_key"]: dict(r) for r in conn.execute("SELECT * FROM exercise_help")}
        for r in conn.execute(
            "SELECT a.lesson_id, a.question_id, a.correct, q.created_at FROM quiz_answers a "
            "JOIN quiz_attempts q ON q.id = a.attempt_id ORDER BY a.id DESC"
        ):
            snap.answers.setdefault(r["lesson_id"], []).append(dict(r))
        for r in conn.execute(
            "SELECT quiz_key, score, total FROM quiz_attempts WHERE kind = 'lesson' ORDER BY id DESC"
        ):
            if r["total"]:
                snap.lesson_quiz_scores.setdefault(r["quiz_key"], []).append(r["score"] / r["total"])
        snap.reviews = {r["lesson_id"]: dict(r) for r in conn.execute("SELECT * FROM review_state")}
        snap.settings = dict(db.DEFAULT_SETTINGS)
        snap.settings.update({r["key"]: r["value"] for r in conn.execute("SELECT key, value FROM settings")})
    return snap


# ---------------------------------------------------------------- exercise status


@dataclass
class ExerciseStatus:
    attempts: int = 0
    passed: bool = False
    passed_independently: bool = False
    failed_attempts: int = 0
    solution_viewed: bool = False
    hints_shown: int = 0
    last_code: str = ""
    self_assessed: bool = False


def exercise_status(snap: Snapshot, exercise: Exercise) -> ExerciseStatus:
    attempts = snap.attempts.get(exercise.key, [])
    help_row = snap.help.get(exercise.key, {})
    status = ExerciseStatus(
        attempts=len(attempts),
        solution_viewed=bool(help_row.get("solution_viewed")),
        hints_shown=int(help_row.get("hints_shown") or 0),
    )
    viewed_at = help_row.get("solution_viewed_at")
    for attempt in attempts:
        if attempt["passed"]:
            status.passed = True
            status.self_assessed = status.self_assessed or bool(attempt["self_assessed"])
            if not viewed_at or attempt["created_at"] < viewed_at:
                status.passed_independently = True
    if not status.passed:
        status.failed_attempts = sum(1 for a in attempts if not a["passed"])
    if attempts:
        status.last_code = attempts[-1]["code"]
    return status


# ---------------------------------------------------------------- lesson status


@dataclass
class LessonStatus:
    lesson_id: str
    state: str  # "not started", "started", "practising", "completed", "mastered"
    opened: bool = False
    read_done: bool = False
    completed: bool = False
    completed_at: str | None = None
    quiz_best: float | None = None
    quiz_last: float | None = None
    quiz_accuracy: float | None = None
    exercises_total: int = 0
    exercises_passed: int = 0
    exercise_score: float | None = None
    mastery_score: float | None = None
    needs_revision: bool = False
    revision_reasons: list[str] = field(default_factory=list)
    review_due: bool = False
    review_box: int | None = None
    review_due_date: str | None = None
    criteria: list[tuple[str, bool]] = field(default_factory=list)

    @property
    def label(self) -> str:
        return self.state.capitalize()


def pass_mark(snap: Snapshot) -> float:
    try:
        return max(1, min(100, int(snap.settings.get("quiz_pass_percent", "70")))) / 100
    except ValueError:
        return 0.7


def completion_criteria(lesson: Lesson, snap: Snapshot) -> list[tuple[str, bool]]:
    row = snap.lessons.get(lesson.id, {})
    criteria = [("Mark the lesson as read", bool(row.get("read_done")))]
    if lesson.quiz:
        mark = pass_mark(snap)
        best = max(snap.lesson_quiz_scores.get(lesson.id, [0.0]) or [0.0])
        criteria.append((f"Score at least {mark:.0%} in the lesson quiz", best >= mark))
    beginner = [ex for ex in lesson.exercises if ex.difficulty == "beginner"]
    for ex in beginner:
        criteria.append((f"Pass the beginner exercise \"{ex.title}\"", exercise_status(snap, ex).passed))
    return criteria


def lesson_status(lesson: Lesson, snap: Snapshot) -> LessonStatus:
    row = snap.lessons.get(lesson.id)
    status = LessonStatus(lesson_id=lesson.id, state="not started")
    status.opened = row is not None
    status.read_done = bool(row and row["read_done"])
    status.completed_at = row["completed_at"] if row else None
    status.completed = bool(status.completed_at)
    status.criteria = completion_criteria(lesson, snap)

    scores = snap.lesson_quiz_scores.get(lesson.id, [])
    if scores:
        status.quiz_best = max(scores)
        status.quiz_last = scores[0]
    answers = snap.answers.get(lesson.id, [])[:RECENT_ANSWERS]
    if answers:
        status.quiz_accuracy = sum(a["correct"] for a in answers) / len(answers)

    checked = [ex for ex in lesson.exercises if not ex.is_manual]
    status.exercises_total = len(lesson.exercises)
    points = 0.0
    any_attempt = False
    for ex in lesson.exercises:
        ex_status = exercise_status(snap, ex)
        any_attempt = any_attempt or ex_status.attempts > 0
        if ex_status.passed:
            status.exercises_passed += 1
        if not ex.is_manual:
            points += 1.0 if ex_status.passed_independently else 0.5 if ex_status.passed else 0.0
        if not ex_status.passed and ex_status.failed_attempts >= 3:
            status.needs_revision = True
            status.revision_reasons.append(f"Exercise \"{ex.title}\" failed {ex_status.failed_attempts} times")
    if checked:
        status.exercise_score = points / len(checked)

    parts = [p for p in (status.quiz_accuracy, status.exercise_score) if p is not None]
    if parts and (answers or any_attempt):
        status.mastery_score = sum(parts) / len(parts)

    if status.quiz_accuracy is not None and status.quiz_accuracy < WEAK_THRESHOLD:
        status.needs_revision = True
        status.revision_reasons.append(f"Recent quiz answers only {status.quiz_accuracy:.0%} correct")

    review = snap.reviews.get(lesson.id)
    if review:
        status.review_box = review["box"]
        status.review_due_date = review["due_date"]
        status.review_due = review["due_date"] <= db.today()

    if status.completed:
        status.state = "completed"
        if (status.mastery_score or 0) >= MASTERY_THRESHOLD and (status.review_box or 0) >= 1:
            status.state = "mastered"
    elif answers or any_attempt:
        status.state = "practising"
    elif status.opened:
        status.state = "started"
    return status


def all_statuses(library: Library, snap: Snapshot | None = None) -> dict[str, LessonStatus]:
    snap = snap or load_snapshot()
    return {lesson.id: lesson_status(lesson, snap) for lesson in library.all_lessons()}


# ---------------------------------------------------------------- recording


def record_lesson_open(lesson_id: str) -> None:
    stamp = db.now()
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO lesson_progress (lesson_id, first_opened_at, last_opened_at) VALUES (?, ?, ?) "
            "ON CONFLICT (lesson_id) DO UPDATE SET last_opened_at = excluded.last_opened_at",
            (lesson_id, stamp, stamp),
        )
        conn.execute(
            "INSERT INTO settings (key, value) VALUES ('current_lesson', ?) "
            "ON CONFLICT (key) DO UPDATE SET value = excluded.value",
            (lesson_id,),
        )


def set_read_done(lesson_id: str, done: bool = True) -> None:
    record_lesson_open(lesson_id)
    with db.connect() as conn:
        conn.execute("UPDATE lesson_progress SET read_done = ? WHERE lesson_id = ?", (int(done), lesson_id))
        db.record_activity(conn)


def refresh_completion(lesson: Lesson) -> bool:
    """Mark the lesson completed when all criteria are met. Returns True if it just became complete."""
    snap = load_snapshot()
    row = snap.lessons.get(lesson.id)
    if not row or row["completed_at"]:
        return False
    if all(met for _, met in completion_criteria(lesson, snap)):
        with db.connect() as conn:
            conn.execute("UPDATE lesson_progress SET completed_at = ? WHERE lesson_id = ?", (db.now(), lesson.id))
            tomorrow = (date.today() + timedelta(days=REVIEW_INTERVALS[0])).isoformat()
            conn.execute(
                "INSERT INTO review_state (lesson_id, box, due_date) VALUES (?, 0, ?) "
                "ON CONFLICT (lesson_id) DO NOTHING",
                (lesson.id, tomorrow),
            )
        return True
    return False


def record_exercise_attempt(exercise: Exercise, code: str, passed: bool, feedback: str = "",
                            self_assessed: bool = False) -> None:
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO exercise_attempts (exercise_key, lesson_id, kind, code, passed, self_assessed, feedback, "
            "created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (exercise.key, exercise.lesson_id, exercise.kind, code, int(passed), int(self_assessed),
             feedback[:4000], db.now()),
        )
        db.record_activity(conn)


def save_draft(key: str, code: str) -> None:
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO exercise_drafts (exercise_key, code, updated_at) VALUES (?, ?, ?) "
            "ON CONFLICT (exercise_key) DO UPDATE SET code = excluded.code, updated_at = excluded.updated_at",
            (key, code, db.now()),
        )


def load_draft(key: str) -> str | None:
    with db.connect() as conn:
        row = conn.execute("SELECT code FROM exercise_drafts WHERE exercise_key = ?", (key,)).fetchone()
    return row["code"] if row else None


def delete_draft(key: str) -> None:
    with db.connect() as conn:
        conn.execute("DELETE FROM exercise_drafts WHERE exercise_key = ?", (key,))


def get_help_usage(key: str) -> dict:
    with db.connect() as conn:
        row = conn.execute("SELECT * FROM exercise_help WHERE exercise_key = ?", (key,)).fetchone()
    return dict(row) if row else {"hints_shown": 0, "solution_viewed": 0}


def record_hint(key: str, hints_shown: int) -> None:
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO exercise_help (exercise_key, hints_shown) VALUES (?, ?) "
            "ON CONFLICT (exercise_key) DO UPDATE SET hints_shown = MAX(hints_shown, excluded.hints_shown)",
            (key, hints_shown),
        )


def record_solution_viewed(key: str) -> None:
    with db.connect() as conn:
        conn.execute(
            "INSERT INTO exercise_help (exercise_key, solution_viewed, solution_viewed_at) VALUES (?, 1, ?) "
            "ON CONFLICT (exercise_key) DO UPDATE SET solution_viewed = 1, "
            "solution_viewed_at = COALESCE(solution_viewed_at, excluded.solution_viewed_at)",
            (key, db.now()),
        )


# ---------------------------------------------------------------- quizzes


@dataclass
class QuizResult:
    score: int
    total: int
    per_question: list[tuple[QuizQuestion, object, bool]]
    per_lesson: dict[str, tuple[int, int]]
    attempt_id: int

    @property
    def percent(self) -> float:
        return self.score / self.total if self.total else 0.0


def grade_and_record_quiz(quiz_key: str, kind: str, title: str, questions: list[QuizQuestion],
                          answers: dict[str, object]) -> QuizResult:
    """Grade answers (keyed by question.key), store them, update revision boxes for review quizzes."""
    per_question = []
    per_lesson: dict[str, list[int]] = {}
    for question in questions:
        given = answers.get(question.key)
        correct = question.is_correct(given)
        per_question.append((question, given, correct))
        tally = per_lesson.setdefault(question.lesson_id, [0, 0])
        tally[0] += int(correct)
        tally[1] += 1
    score = sum(1 for _, _, c in per_question if c)
    with db.connect() as conn:
        cursor = conn.execute(
            "INSERT INTO quiz_attempts (quiz_key, kind, title, score, total, created_at) VALUES (?, ?, ?, ?, ?, ?)",
            (quiz_key, kind, title, score, len(questions), db.now()),
        )
        attempt_id = cursor.lastrowid
        conn.executemany(
            "INSERT INTO quiz_answers (attempt_id, lesson_id, question_id, given, correct) VALUES (?, ?, ?, ?, ?)",
            [(attempt_id, q.lesson_id, q.id, None if g is None else str(g), int(c)) for q, g, c in per_question],
        )
        db.record_activity(conn)
        if kind == "review":
            for lesson_id, (right, total) in per_lesson.items():
                _update_review(conn, lesson_id, right / total >= REVIEW_PASS)
    return QuizResult(score, len(questions), per_question,
                      {k: (v[0], v[1]) for k, v in per_lesson.items()}, attempt_id)


def _update_review(conn, lesson_id: str, passed: bool) -> None:
    row = conn.execute("SELECT box FROM review_state WHERE lesson_id = ?", (lesson_id,)).fetchone()
    box = row["box"] if row else 0
    box = min(box + 1, len(REVIEW_INTERVALS) - 1) if passed else 0
    due = (date.today() + timedelta(days=REVIEW_INTERVALS[box] if passed else 1)).isoformat()
    conn.execute(
        "INSERT INTO review_state (lesson_id, box, due_date, last_reviewed_at) VALUES (?, ?, ?, ?) "
        "ON CONFLICT (lesson_id) DO UPDATE SET box = excluded.box, due_date = excluded.due_date, "
        "last_reviewed_at = excluded.last_reviewed_at",
        (lesson_id, box, due, db.now()),
    )


def build_review_quiz(library: Library, statuses: dict[str, LessonStatus], max_questions: int = 12,
                      seed: int | None = None) -> list[QuizQuestion]:
    """Questions from lessons due for review first, then lessons that need revision."""
    rng = random.Random(seed)
    due = [lid for lid, s in statuses.items() if s.review_due]
    weak = [lid for lid, s in statuses.items() if s.needs_revision and lid not in due]
    chosen: list[QuizQuestion] = []
    for lesson_id in due + weak:
        lesson = library.lessons.get(lesson_id)
        if not lesson or not lesson.quiz:
            continue
        picks = list(lesson.quiz)
        rng.shuffle(picks)
        chosen.extend(picks[:3])
        if len(chosen) >= max_questions:
            break
    return chosen[:max_questions]


def build_level_assessment(library: Library, track: str, level: int, max_questions: int = 15,
                           seed: int | None = None) -> list[QuizQuestion]:
    rng = random.Random(seed)
    questions = [q for lesson in library.track_lessons(track) if lesson.level == level for q in lesson.quiz]
    rng.shuffle(questions)
    return questions[:max_questions]


def recent_quiz_attempts(limit: int = 20) -> list[dict]:
    with db.connect() as conn:
        rows = conn.execute("SELECT * FROM quiz_attempts ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [dict(r) for r in rows]


def missed_questions(library: Library, limit: int = 10) -> list[tuple[QuizQuestion, int]]:
    """Questions whose most recent answer was wrong, with how many times they were missed."""
    with db.connect() as conn:
        rows = conn.execute(
            "SELECT lesson_id, question_id, correct, COUNT(*) OVER (PARTITION BY lesson_id, question_id) AS n, "
            "SUM(1 - correct) OVER (PARTITION BY lesson_id, question_id) AS wrong, "
            "ROW_NUMBER() OVER (PARTITION BY lesson_id, question_id ORDER BY id DESC) AS rn "
            "FROM quiz_answers"
        ).fetchall()
    result = []
    for r in rows:
        if r["rn"] == 1 and not r["correct"]:
            lesson = library.lessons.get(r["lesson_id"])
            question = next((q for q in lesson.quiz if q.id == r["question_id"]), None) if lesson else None
            if question:
                result.append((question, r["wrong"]))
    result.sort(key=lambda item: -item[1])
    return result[:limit]


# ---------------------------------------------------------------- recommendations


def next_lesson(library: Library, track: str, statuses: dict[str, LessonStatus]) -> Lesson | None:
    for lesson in library.track_lessons(track):
        if not statuses[lesson.id].completed:
            return lesson
    return None


def continue_lesson(library: Library, snap: Snapshot) -> Lesson | None:
    current = snap.settings.get("current_lesson", "")
    return library.lessons.get(current)


@dataclass
class TrackSummary:
    track: str
    total: int
    completed: int
    mastered: int
    started: int


def track_summary(library: Library, track: str, statuses: dict[str, LessonStatus]) -> TrackSummary:
    lessons = library.track_lessons(track)
    return TrackSummary(
        track=track,
        total=len(lessons),
        completed=sum(1 for ls in lessons if statuses[ls.id].completed),
        mastered=sum(1 for ls in lessons if statuses[ls.id].state == "mastered"),
        started=sum(1 for ls in lessons if statuses[ls.id].state != "not started"),
    )


def activity_streak() -> tuple[int, int]:
    """(current streak in days, total active days)."""
    with db.connect() as conn:
        days = {r["day"] for r in conn.execute("SELECT day FROM activity WHERE actions > 0")}
    streak = 0
    cursor = date.today()
    if cursor.isoformat() not in days:
        cursor -= timedelta(days=1)
    while cursor.isoformat() in days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak, len(days)


def exercise_totals() -> dict[str, int]:
    with db.connect() as conn:
        row = conn.execute(
            "SELECT COUNT(*) AS attempts, COUNT(DISTINCT CASE WHEN passed THEN exercise_key END) AS passed, "
            "SUM(CASE WHEN passed THEN 0 ELSE 1 END) AS failed FROM exercise_attempts"
        ).fetchone()
    return {"attempts": row["attempts"] or 0, "passed": row["passed"] or 0, "failed": row["failed"] or 0}


# ---------------------------------------------------------------- export / reset


def export_progress(library: Library) -> dict:
    """A readable JSON-friendly summary of all progress (for your own records)."""
    snap = load_snapshot()
    statuses = all_statuses(library, snap)
    lessons = []
    for lesson in library.all_lessons():
        s = statuses[lesson.id]
        lessons.append({
            "lesson_id": lesson.id, "title": lesson.title, "track": lesson.track, "level": lesson.level,
            "state": s.state, "completed_at": s.completed_at, "quiz_best": s.quiz_best,
            "mastery_score": s.mastery_score, "needs_revision": s.needs_revision,
            "exercises_passed": s.exercises_passed, "exercises_total": s.exercises_total,
            "next_review": s.review_due_date,
        })
    with db.connect() as conn:
        quizzes = [dict(r) for r in conn.execute("SELECT * FROM quiz_attempts ORDER BY id")]
        attempts = [dict(r) for r in conn.execute(
            "SELECT exercise_key, kind, passed, self_assessed, created_at FROM exercise_attempts ORDER BY id")]
    return {"exported_at": db.now(), "lessons": lessons, "quiz_attempts": quizzes, "exercise_attempts": attempts}


def export_progress_json(library: Library) -> str:
    return json.dumps(export_progress(library), indent=2, ensure_ascii=False)


def reset_all_progress() -> None:
    """Delete learning progress (keeps notes, bookmarks, lab files and settings)."""
    with db.connect() as conn:
        for table in ("lesson_progress", "exercise_attempts", "exercise_drafts", "exercise_help", "quiz_answers",
                      "quiz_attempts", "review_state", "project_tasks", "project_status", "activity"):
            conn.execute(f"DELETE FROM {table}")
        conn.execute("DELETE FROM settings WHERE key = 'current_lesson'")


def days_since(iso_timestamp: str | None) -> int | None:
    if not iso_timestamp:
        return None
    try:
        return (datetime.now() - datetime.fromisoformat(iso_timestamp)).days
    except ValueError:
        return None
