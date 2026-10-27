"""Every built-in lesson, exercise, quiz and project is complete and correct.

The most important test here: each exercise's model solution must pass that
exercise's own automatic check (so learners are never marked wrong for a
correct answer because of a content mistake).
"""

import pytest

from academy.content import DIFFICULTIES, STANDARD_SECTIONS, TRACKS, load_library
from academy.python_checker import check_python_exercise
from academy.sql_engine import check_sql_exercise, list_datasets

LIBRARY = load_library()
LESSONS = LIBRARY.all_lessons()
EXERCISES = [e for e in LIBRARY.exercises() if not e.is_manual]


def test_no_content_problems():
    assert LIBRARY.problems == []


def test_lessons_exist_for_both_tracks():
    for track in TRACKS:
        assert LIBRARY.track_lessons(track), track


@pytest.mark.parametrize("lesson", LESSONS, ids=lambda ls: ls.id)
def test_lesson_has_the_standard_structure(lesson):
    headings = {h.lower() for h, _ in lesson.sections}
    missing = [s for s in STANDARD_SECTIONS if s.lower() not in headings]
    assert not missing, f"{lesson.id} is missing sections: {missing}"
    assert lesson.summary and len(lesson.objectives) >= 2
    assert len(lesson.quiz) >= 5, f"{lesson.id}: needs at least 5 quiz questions"
    assert len(lesson.exercises) >= 3, f"{lesson.id}: needs at least 3 exercises"
    levels = {e.difficulty for e in lesson.exercises}
    assert "beginner" in levels, f"{lesson.id}: needs a beginner exercise"
    assert levels & {"intermediate", "challenge"}, f"{lesson.id}: needs a harder exercise"
    for exercise in lesson.exercises:
        assert exercise.difficulty in DIFFICULTIES
        for test in exercise.check.get("tests", []) or []:
            body = test.get("code", "").strip()
            assert body not in ("", "pass") and "assert True" not in body and "if False" not in body, \
                f"{exercise.key}: placeholder check '{test.get('name')}'"
        assert exercise.hints, f"{exercise.key}: needs at least one hint"
        if not exercise.is_manual:
            assert exercise.explanation, f"{exercise.key}: needs an explanation"
    for question in lesson.quiz:
        assert question.explanation, f"{question.key}: needs an explanation"


@pytest.mark.parametrize("lesson", LESSONS, ids=lambda ls: ls.id)
def test_links_between_lessons_are_valid(lesson):
    for prereq in lesson.prerequisites:
        assert prereq in LIBRARY.lessons, f"{lesson.id}: unknown prerequisite {prereq}"
    if lesson.next:
        assert lesson.next in LIBRARY.lessons, f"{lesson.id}: unknown next lesson {lesson.next}"


@pytest.mark.parametrize("exercise", EXERCISES, ids=lambda e: e.key)
def test_model_solution_passes_its_own_check(exercise):
    if exercise.kind == "python":
        outcome = check_python_exercise(exercise, exercise.solution, timeout=20)
    else:
        assert exercise.dataset in list_datasets(), f"{exercise.key}: unknown dataset {exercise.dataset}"
        outcome = check_sql_exercise(exercise, exercise.solution)
    assert outcome.passed, f"{exercise.key}: model solution fails:\n{outcome.feedback_text()}"


@pytest.mark.parametrize("exercise", [e for e in EXERCISES if e.starter.strip() and e.starter.strip() != e.solution.strip()],
                         ids=lambda e: e.key)
def test_unfinished_starter_code_does_not_pass(exercise):
    if exercise.check.get("starter_may_pass"):
        pytest.skip("starter is allowed to pass for this exercise")
    if exercise.kind == "python":
        outcome = check_python_exercise(exercise, exercise.starter, timeout=20)
    else:
        outcome = check_sql_exercise(exercise, exercise.starter)
    assert not outcome.passed, f"{exercise.key}: the starter code already passes - the check is too weak"


def test_ids_are_unique():
    ids = [l.id for l in LESSONS]
    assert len(ids) == len(set(ids))


def test_projects_are_complete():
    for project in LIBRARY.projects.values():
        assert project.stages, project.id
        assert project.required_task_ids, project.id
        for skill in project.skills:
            assert skill in LIBRARY.lessons, f"{project.id}: unknown skill lesson {skill}"
        if project.dataset:
            assert project.dataset in list_datasets(), project.id
