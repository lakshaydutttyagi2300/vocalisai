"""Progress tracking, mastery, revision, notes, backup and restore."""

import io
import json
import sqlite3
import zipfile
from datetime import date, timedelta

import pytest

from academy import backup, db, paths, personal, progress
from academy.content import Exercise, Lesson, Library, QuizQuestion


def tiny_library() -> Library:
    lesson = Lesson(id="L1", track="python", level=0, order=1, title="Tiny", path=paths.APP_DIR / "x.md")
    lesson.exercises = [
        Exercise(id="b", lesson_id="L1", kind="python", title="B", difficulty="beginner", instructions="i",
                 solution="print(1)"),
        Exercise(id="c", lesson_id="L1", kind="python", title="C", difficulty="challenge", instructions="i",
                 solution="print(1)"),
    ]
    lesson.quiz = [QuizQuestion(id=f"q{i}", lesson_id="L1", type="choice", question="?", answer="a",
                                options=["a", "b"]) for i in range(4)]
    library = Library(lessons={"L1": lesson})
    from academy.content import Level
    library.levels = {"python": [Level("python", 0, "Zero", "", [lesson])], "sql": []}
    return library


def test_opening_a_lesson_is_not_mastery():
    library = tiny_library()
    progress.record_lesson_open("L1")
    status = progress.lesson_status(library.lessons["L1"], progress.load_snapshot())
    assert status.state == "started"
    assert status.mastery_score is None
    assert not status.completed


def test_completion_requires_all_criteria_and_schedules_review():
    library = tiny_library()
    lesson = library.lessons["L1"]
    progress.record_lesson_open("L1")
    progress.set_read_done("L1")
    assert not progress.refresh_completion(lesson)
    progress.grade_and_record_quiz("L1", "lesson", "quiz", lesson.quiz, {q.key: "a" for q in lesson.quiz})
    assert not progress.refresh_completion(lesson)  # beginner exercise still missing
    progress.record_exercise_attempt(lesson.exercises[0], "print(1)", True)
    assert progress.refresh_completion(lesson)
    status = progress.lesson_status(lesson, progress.load_snapshot())
    assert status.completed and status.state == "completed"
    assert status.review_due_date == (date.today() + timedelta(days=1)).isoformat()


def test_mastery_needs_review_and_high_score():
    library = tiny_library()
    lesson = library.lessons["L1"]
    progress.set_read_done("L1")
    answers = {q.key: "a" for q in lesson.quiz}
    progress.grade_and_record_quiz("L1", "lesson", "quiz", lesson.quiz, answers)
    for exercise in lesson.exercises:
        progress.record_exercise_attempt(exercise, "x", True)
    progress.refresh_completion(lesson)
    assert progress.lesson_status(lesson, progress.load_snapshot()).state == "completed"
    progress.grade_and_record_quiz("review-1", "review", "Review", lesson.quiz, answers)
    status = progress.lesson_status(lesson, progress.load_snapshot())
    assert status.review_box == 1 and status.state == "mastered"


def test_solution_viewing_halves_exercise_credit():
    library = tiny_library()
    lesson = library.lessons["L1"]
    progress.record_solution_viewed(lesson.exercises[0].key)
    import time
    time.sleep(1.1)
    progress.record_exercise_attempt(lesson.exercises[0], "x", True)
    status = progress.lesson_status(lesson, progress.load_snapshot())
    assert status.exercise_score == 0.25  # 0.5 for one of two exercises


def test_failing_quiz_flags_revision_and_failed_review_resets_box():
    library = tiny_library()
    lesson = library.lessons["L1"]
    progress.grade_and_record_quiz("L1", "lesson", "quiz", lesson.quiz, {q.key: "b" for q in lesson.quiz})
    status = progress.lesson_status(lesson, progress.load_snapshot())
    assert status.needs_revision
    progress.grade_and_record_quiz("r", "review", "Review", lesson.quiz, {q.key: "b" for q in lesson.quiz})
    status = progress.lesson_status(lesson, progress.load_snapshot())
    assert status.review_box == 0


def test_text_answers_are_normalised():
    question = QuizQuestion(id="t", lesson_id="L1", type="text", question="?", answer=["SELECT * FROM t"])
    assert question.is_correct("  select *   from t; ")
    assert not question.is_correct("select * from x")


def test_notes_bookmarks_and_lab_files():
    note_id = personal.save_note("Loops", "for repeats", "L1", "Loops, python")
    assert personal.get_note(note_id)["tags"] == "loops, python"
    assert personal.list_notes(search="repeats")[0]["id"] == note_id
    with zipfile.ZipFile(io.BytesIO(personal.notes_as_markdown_zip())) as archive:
        assert any(name.endswith(".md") for name in archive.namelist())
    assert personal.toggle_bookmark("lesson", "L1", "Tiny") is True
    assert personal.is_bookmarked("lesson", "L1")
    assert personal.toggle_bookmark("lesson", "L1", "Tiny") is False
    personal.save_lab_file("python", "calc", "print(1)")
    personal.save_lab_file("python", "calc", "print(2)")
    assert personal.get_lab_file("python", "calc")["code"] == "print(2)"


def test_backup_and_restore_round_trip(tmp_path):
    progress.record_lesson_open("L1")
    personal.save_note("Keep me", "important")
    (paths.SANDBOX_DIR / "data.txt").write_text("sandbox file")
    paths.SECRETS_PATH.write_text(json.dumps({"anthropic_api_key": "secret"}))
    archive = backup.create_backup("manual")
    with zipfile.ZipFile(archive) as z:
        names = z.namelist()
    assert "academy.db" in names and "python_sandbox/data.txt" in names
    assert not any("secrets" in n for n in names)

    # change things after the backup
    personal.save_note("Later", "after backup")
    (paths.SANDBOX_DIR / "data.txt").write_text("changed")
    check = backup.inspect_backup(archive)
    assert check.ok and check.stats["notes"] == 1

    outcome = backup.restore_backup(archive)
    assert outcome["safety_backup"].exists()
    assert [n["title"] for n in personal.list_notes()] == ["Keep me"]
    assert (paths.SANDBOX_DIR / "data.txt").read_text() == "sandbox file"
    # restore from bytes (as uploaded in the browser) also works
    backup.restore_backup(archive.read_bytes())
    assert len(personal.list_notes()) == 1


def test_bad_backups_are_rejected(tmp_path):
    assert not backup.inspect_backup(b"not a zip").ok
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as z:
        z.writestr("hello.txt", "x")
    assert not backup.inspect_backup(buffer.getvalue()).ok
    # a backup from a "newer app" is refused
    newer = tmp_path / "newer.db"
    conn = sqlite3.connect(newer)
    conn.execute(f"PRAGMA user_version = {db.SCHEMA_VERSION + 5}")
    conn.close()
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as z:
        z.write(newer, "academy.db")
    assert not backup.inspect_backup(buffer.getvalue()).ok
    with pytest.raises(ValueError):
        backup.restore_backup(buffer.getvalue())


def test_zip_slip_paths_are_refused():
    archive = backup.create_backup("manual")
    data = io.BytesIO(archive.read_bytes())
    with zipfile.ZipFile(data, "a") as z:
        z.writestr("python_sandbox/../../evil.txt", "x")
    assert not backup.inspect_backup(data.getvalue()).ok


def test_auto_backup_only_when_due_and_pruned():
    assert backup.maybe_auto_backup() is None  # nothing to back up yet
    progress.record_lesson_open("L1")
    first = backup.maybe_auto_backup()
    assert first is not None
    assert backup.maybe_auto_backup() is None  # not due again yet
    db.set_setting("last_auto_backup", "2000-01-01T00:00:00")
    db.set_setting("auto_backup_keep", "1")
    assert backup.maybe_auto_backup() is not None
    assert len([b for b in backup.list_backups() if b.reason == "auto"]) == 1


def test_migrations_are_repeatable_and_reset_keeps_notes():
    assert db.migrate() == db.SCHEMA_VERSION
    assert db.migrate() == db.SCHEMA_VERSION
    personal.save_note("n", "b")
    progress.record_lesson_open("L1")
    progress.reset_all_progress()
    assert progress.load_snapshot().lessons == {}
    assert len(personal.list_notes()) == 1
