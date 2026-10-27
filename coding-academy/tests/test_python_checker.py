"""Automatic checking of Python exercises."""

from academy.content import Exercise
from academy.python_checker import compare_output, check_python_exercise


def make(check, stdin="", solution="print('x')"):
    return Exercise(id="e", lesson_id="l", kind="python", title="t", difficulty="beginner",
                    instructions="i", solution=solution, check=check, stdin=stdin)


def test_compare_output_messages():
    assert compare_output("a\nb\n", "a\nb") is None
    assert compare_output("a  \n", "a\n\n\n") is None
    assert "Line 2" in compare_output("a\nb", "a\nc")
    assert "did not print anything" in compare_output("a", "")
    assert "extra lines" in compare_output("a", "a\nb")


def test_expected_output_pass_and_fail():
    exercise = make({"expected": "Hello\n"})
    assert check_python_exercise(exercise, 'print("Hello")').passed
    outcome = check_python_exercise(exercise, 'print("hello")')
    assert not outcome.passed
    assert "Line 1" in outcome.details[0].message


def test_multiple_input_cases():
    exercise = make({"cases": [{"stdin": "2\n", "expected": "Number? 2\n4\n"},
                               {"stdin": "5\n", "expected": "Number? 5\n10\n"}]})
    assert check_python_exercise(exercise, 'n = int(input("Number? "))\nprint(n * 2)').passed
    assert not check_python_exercise(exercise, 'n = int(input("Number? "))\nprint(4)').passed


def test_required_and_forbidden_constructs():
    exercise = make({"expected": "0\n1\n2\n", "requires": ["for"], "forbid": ["while"]})
    assert check_python_exercise(exercise, "for i in range(3):\n    print(i)").passed
    outcome = check_python_exercise(exercise, "i = 0\nwhile i < 3:\n    print(i)\n    i += 1")
    assert not outcome.passed
    assert any("for" in d.message for d in outcome.details if not d.passed)


def test_forbid_text_stops_typed_answers():
    exercise = make({"expected": "15\n", "forbid_text": ["15"]})
    assert check_python_exercise(exercise, "print(7 + 8)").passed
    assert not check_python_exercise(exercise, "print(15)").passed


def test_tests_and_contains():
    exercise = make({"tests": [{"name": "square works", "code": "assert square(4) == 16"}],
                     "contains": ["ready"]})
    good = "def square(n):\n    return n * n\nprint('ready')"
    assert check_python_exercise(exercise, good).passed
    assert not check_python_exercise(exercise, "def square(n):\n    return n + n\nprint('ready')").passed


def test_errors_and_empty_code_fail_cleanly():
    exercise = make({"expected": "x\n"})
    assert not check_python_exercise(exercise, "").passed
    outcome = check_python_exercise(exercise, "print(")
    assert not outcome.passed and "syntax" in outcome.summary.lower()
    outcome = check_python_exercise(exercise, "while True:\n    pass", timeout=2)
    assert not outcome.passed and "did not finish" in outcome.details[0].message


def test_nested_if_construct():
    exercise = make({"expected": "x\n", "requires": ["nested-if"]})
    nested = "a = 1\nif a:\n    if a > 0:\n        print('x')"
    flat = "a = 1\nif a and a > 0:\n    print('x')"
    elif_only = "a = 1\nif a < 0:\n    print('y')\nelif a > 0:\n    print('x')"
    assert check_python_exercise(exercise, nested).passed
    assert not check_python_exercise(exercise, flat).passed
    assert not check_python_exercise(exercise, elif_only).passed


def test_nested_loop_construct():
    exercise = make({"expected": "x\n", "requires": ["nested-loop"]})
    assert check_python_exercise(exercise, "for a in range(1):\n    for b in range(1):\n        print('x')").passed
    assert check_python_exercise(exercise, "for a in range(1):\n    if a == 0:\n        while False:\n            pass\n    print('x')").passed
    assert not check_python_exercise(exercise, "for a in range(1):\n    print('x')\nfor b in range(0):\n    pass").passed
