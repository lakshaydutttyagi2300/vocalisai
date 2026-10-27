"""The Python runner: output, input, errors, limits and safety rules."""

from academy import paths
from academy.python_runner import clear_sandbox, list_sandbox_files, run_python


def test_prints_output():
    result = run_python('print("Hello")\nprint(2 + 3)')
    assert result.ok
    assert result.stdout == "Hello\n5\n"


def test_input_is_echoed_like_a_terminal():
    result = run_python('name = input("Name? ")\nprint("Hi", name)', "Sam")
    assert result.stdout == "Name? Sam\nHi Sam\n"


def test_missing_input_gives_eof_error():
    result = run_python('input("Name? ")')
    assert result.error["type"] == "EOFError"


def test_runtime_error_reports_type_line_and_clean_traceback():
    result = run_python("x = 1\nprint(y)")
    assert result.error["type"] == "NameError"
    assert result.error["line"] == 2
    assert "your_code.py" in result.error["traceback"]
    assert "sandbox_bootstrap" not in result.error["traceback"]


def test_syntax_error_is_reported():
    result = run_python('print("hi"')
    assert result.error["type"] == "SyntaxError"
    assert result.error["line"] == 1


def test_infinite_loop_is_stopped_but_keeps_earlier_output():
    result = run_python('print("before")\nwhile True:\n    pass', timeout=2)
    assert result.timed_out
    assert "before" in result.stdout


def test_endless_printing_is_stopped():
    result = run_python("while True:\n    print('spam')", timeout=10)
    assert result.error and result.error["type"] == "OutputLimitReached"
    assert result.output_truncated


def test_files_can_be_written_inside_the_practice_folder():
    result = run_python('open("notes.txt", "w").write("hello")\nprint(open("notes.txt").read())')
    assert result.ok and result.stdout == "hello\n"
    assert (paths.SANDBOX_DIR / "notes.txt").read_text() == "hello"
    assert [p.name for p in list_sandbox_files()] == ["notes.txt"]
    assert clear_sandbox() == 1
    assert list_sandbox_files() == []


def test_writing_outside_the_practice_folder_is_blocked(tmp_path):
    target = tmp_path / "outside.txt"
    result = run_python(f'open(r"{target}", "w").write("x")')
    assert result.error["type"] == "PermissionError"
    assert result.error["blocked"]
    assert not target.exists()


def test_deleting_outside_the_practice_folder_is_blocked(tmp_path):
    keep = tmp_path / "important.txt"
    keep.write_text("precious")
    folder = tmp_path / "folder"
    folder.mkdir()
    for code in (f'import os\nos.remove(r"{keep}")', f'import shutil\nshutil.rmtree(r"{folder}")',
                 f'import os\nos.rename(r"{keep}", "stolen.txt")'):
        result = run_python(code)
        assert result.error["type"] == "PermissionError", code
    assert keep.read_text() == "precious"
    assert folder.exists()


def test_escaping_with_chdir_is_still_blocked(tmp_path):
    result = run_python(f'import os\nos.chdir(r"{tmp_path}")\nopen("escape.txt", "w")')
    assert result.error["type"] == "PermissionError"
    assert not (tmp_path / "escape.txt").exists()


def test_starting_other_programs_is_blocked():
    for code in ('import subprocess\nsubprocess.run(["echo", "hi"])', 'import os\nos.system("echo hi")'):
        result = run_python(code)
        assert result.error["type"] == "PermissionError", code


def test_sqlite_inside_folder_allowed_outside_blocked(tmp_path):
    inside = run_python('import sqlite3\nc = sqlite3.connect("my.db")\nc.execute("create table t(x)")\nprint("ok")')
    assert inside.ok
    outside = run_python(f'import sqlite3\nsqlite3.connect(r"{tmp_path / "x.db"}")')
    assert outside.error["type"] == "PermissionError"


def test_exit_ends_program_normally():
    result = run_python('print("a")\nexit()\nprint("b")')
    assert result.ok and result.stdout == "a\n"


def test_unicode_output():
    assert run_python('print("café ✓ 你好")').stdout == "café ✓ 你好\n"


def test_automatic_checks_run_after_the_code():
    result = run_python("def add(a, b):\n    return a + b\nprint('done')", tests=[
        {"name": "adds", "code": "assert add(2, 3) == 5"},
        {"name": "wrong on purpose", "code": "assert add(1, 1) == 3, 'expected 3'"},
        {"name": "sees output", "code": "assert OUTPUT == 'done\\n'"},
    ])
    assert [t["passed"] for t in result.tests] == [True, False, True]
    assert result.tests[1]["message"] == "expected 3"
