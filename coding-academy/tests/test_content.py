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


def _text_blocks(markdown: str) -> list[str]:
    import re
    return re.findall(r"```text\n(.*?)```", markdown, re.S)


def _norm(text: str) -> list[str]:
    lines = [line.rstrip() for line in text.strip("\n").split("\n")]
    return [line for line in lines]


@pytest.mark.parametrize("exercise", [e for e in EXERCISES if e.kind == "python"], ids=lambda e: e.key)
def test_example_output_in_instructions_matches_the_check(exercise):
    """If the instructions show an example output, it must equal what the checker expects."""
    check = exercise.check
    expected = check.get("expected")
    if expected is None and check.get("cases"):
        expected = check["cases"][0].get("expected")
    blocks = _text_blocks(exercise.instructions)
    if expected is None or not blocks:
        return
    assert any(_norm(block) == _norm(str(expected)) for block in blocks), (
        f"{exercise.key}: the example in the instructions differs from the checked output.\n"
        f"Checked output:\n{expected}\nInstruction examples:\n" + "\n---\n".join(blocks))


def _order_by_terms(sql: str) -> list[str]:
    """The terms of the last ORDER BY clause of a query (lower-case, without ASC/DESC)."""
    import re
    from academy.sql_engine import strip_comments
    text = strip_comments(sql).strip().rstrip(";")
    matches = list(re.finditer(r"\border\s+by\b", text, re.I))
    if not matches:
        return []
    clause = re.split(r"\b(limit|offset)\b", text[matches[-1].end():], flags=re.I)[0]
    if "(" in clause or ")" in clause:  # inside a window or subquery - can't analyse simply
        return []
    terms = []
    for term in clause.split(","):
        term = re.sub(r"\s+(asc|desc)\b|\s+nulls\s+(first|last)\b|\s+collate\s+\w+", "", term.strip(), flags=re.I)
        terms.append(term.strip().lower())
    return terms


@pytest.mark.parametrize("exercise", [e for e in EXERCISES if e.kind == "sql" and e.check.get("ordered")
                                      and not e.check.get("verify")], ids=lambda e: e.key)
def test_ordered_sql_exercises_have_no_ties(exercise):
    """When row order is checked, the ORDER BY must decide the order of every row (no ties)."""
    from academy.sql_engine import expected_result
    result = expected_result(exercise)
    terms = _order_by_terms(exercise.solution)
    columns = [c.lower() for c in result.columns]
    positions = []
    for term in terms:
        name = term.split(".")[-1]
        if term.isdigit():
            positions.append(int(term) - 1)
        elif name in columns:
            positions.append(columns.index(name))
        else:
            pytest.skip(f"ORDER BY term {term!r} is not an output column - can't check ties")
    if not positions:
        pytest.skip("no simple ORDER BY to analyse")
    keys = [tuple(row[i] for i in positions) for row in result.rows]
    duplicates = {k for k in keys if keys.count(k) > 1}
    assert not duplicates, f"{exercise.key}: rows tie on the ORDER BY columns {terms}: {sorted(duplicates)[:3]}"


@pytest.mark.parametrize("lesson", LESSONS, ids=lambda ls: ls.id)
def test_quiz_options_and_answers_are_text_in_the_source(lesson):
    """Unquoted words like NULL, Yes or False would be read by YAML as None/True/False instead of text."""
    import re
    import yaml
    text = lesson.path.read_text(encoding="utf-8") if getattr(lesson, "path", None) else None
    if text is None:
        pytest.skip("lesson has no source file path")
    for block in re.findall(r"^```quiz[ \t]*\n(.*?)^```[ \t]*$", text, re.S | re.M):
        for question in yaml.safe_load(block):
            values = list(question.get("options") or [])
            answer = question.get("answer")
            values += answer if isinstance(answer, list) else [answer]
            bad = [v for v in values if not isinstance(v, (str, int, float)) or isinstance(v, bool)]
            assert not bad, f"{lesson.id} {question.get('id')}: quote these values in the quiz: {bad}"


SQL_LESSONS = [lesson for lesson in LESSONS if lesson.track == "sql"]


@pytest.mark.parametrize("lesson", SQL_LESSONS, ids=lambda ls: ls.id)
def test_sql_examples_in_lessons_run_on_a_sample_database(lesson):
    """Every ```sql example in a lesson's text must run without error on at least one sample database.

    Examples that deliberately show an error say so in a comment (they contain the word "error")."""
    import re
    from academy.sql_engine import execute, fresh_connection
    text = lesson.path.read_text(encoding="utf-8")
    text = re.sub(r"^```(exercise|quiz)[ \t]*\n.*?^```[ \t]*$", "", text, flags=re.S | re.M)
    failures = []
    for block in re.findall(r"^```sql[ \t]*\n(.*?)^```[ \t]*$", text, re.S | re.M):
        if "error" in block.lower():
            continue
        errors = []
        for dataset in list_datasets():
            conn = fresh_connection(dataset)
            try:
                results = execute(conn, block)
            finally:
                conn.close()
            problems = [r.error for r in results if r.error]
            if not problems:
                break
            errors.append(f"{dataset}: {problems[0]}")
        else:
            failures.append(f"{block.strip()[:80]!r} -> {errors[:3]}")
    assert not failures, f"{lesson.id}: examples that don't run anywhere:\n" + "\n".join(failures)


@pytest.mark.parametrize("lesson", [ls for ls in LESSONS if ls.track == "python"], ids=lambda ls: ls.id)
def test_python_examples_in_lessons_are_valid_python(lesson):
    """Every ```python example must at least be valid Python.

    Deliberate examples of syntax errors are recognised by the error name in or just after the block."""
    import ast
    import re
    text = lesson.path.read_text(encoding="utf-8")
    text = re.sub(r"^```(exercise|quiz)[ \t]*\n.*?^```[ \t]*$", "", text, flags=re.S | re.M)
    failures = []
    for match in re.finditer(r"^```python[ \t]*\n(.*?)^```[ \t]*$", text, re.S | re.M):
        block, after = match.group(1), text[match.end():match.end() + 400]
        if re.search(r"SyntaxError|IndentationError", block + after):
            continue
        try:
            ast.parse(block)
        except SyntaxError as exc:
            failures.append(f"line {exc.lineno}: {exc.msg} in {block.strip()[:60]!r}")
    assert not failures, f"{lesson.id}: invalid Python examples:\n" + "\n".join(failures)
