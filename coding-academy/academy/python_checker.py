"""Automatic checking of Python exercises.

An exercise's ``check`` section can combine:

    requires: [for, f-string]   # the code must use these constructs
    forbid:   [while]           # ...and must not use these
    cases:                      # run with this input, compare the printed output
      - stdin: "Sam"
        expected: |
          What is your name? Sam
          Hello, Sam!
    contains: ["Hello"]         # printed output must contain these texts
    require_text: ["+"]         # the code itself must contain these texts
    min_comments: 2             # the code must contain at least this many # comments
    variants:                   # re-run with a changed line, to prove the code is general
      - replace: ["minutes = 157", "minutes = 61"]
        expected: "1 hours 1 minutes"
    forbid_text: ["15"]         # ...and must not contain these (e.g. a typed-in answer)
    tests:                      # Python checks run after your code
      - name: add(2, 3) gives 5
        code: assert add(2, 3) == 5
    ignore_case: true           # optional, for output comparison
    type: manual                # not auto-checked; you confirm it yourself

If nothing is specified, the exercise passes when the code runs without error.
"""

from __future__ import annotations

import ast
import io
import re
import tokenize
from dataclasses import dataclass, field

from academy.content import Exercise
from academy.python_runner import RunResult, run_python


@dataclass
class CheckDetail:
    name: str
    passed: bool
    message: str = ""
    expected: str | None = None
    actual: str | None = None


@dataclass
class CheckOutcome:
    passed: bool
    summary: str
    details: list[CheckDetail] = field(default_factory=list)
    run: RunResult | None = None

    def feedback_text(self) -> str:
        lines = [self.summary]
        for d in self.details:
            mark = "PASS" if d.passed else "FAIL"
            lines.append(f"[{mark}] {d.name}" + (f" - {d.message}" if d.message else ""))
        return "\n".join(lines)


CONSTRUCTS = {
    "for": ("a `for` loop", (ast.For,)),
    "while": ("a `while` loop", (ast.While,)),
    "if": ("an `if` statement", (ast.If,)),
    "def": ("a function definition (`def`)", (ast.FunctionDef,)),
    "function": ("a function definition (`def`)", (ast.FunctionDef,)),
    "return": ("a `return` statement", (ast.Return,)),
    "class": ("a `class`", (ast.ClassDef,)),
    "try": ("a `try`/`except` block", (ast.Try,)),
    "f-string": ("an f-string (`f\"...{value}...\"`)", (ast.JoinedStr,)),
    "list-comprehension": ("a list comprehension (`[... for ... in ...]`)", (ast.ListComp,)),
    "dict-comprehension": ("a dictionary comprehension", (ast.DictComp,)),
    "set-comprehension": ("a set comprehension", (ast.SetComp,)),
    "generator-expression": ("a generator expression", (ast.GeneratorExp,)),
    "lambda": ("a `lambda` function", (ast.Lambda,)),
    "with": ("a `with` statement", (ast.With,)),
    "import": ("an `import`", (ast.Import, ast.ImportFrom)),
    "break": ("`break`", (ast.Break,)),
    "continue": ("`continue`", (ast.Continue,)),
    "yield": ("`yield` (a generator)", (ast.Yield, ast.YieldFrom)),
    "augmented-assignment": ("an update such as `+=`", (ast.AugAssign,)),
    "boolean-operator": ("`and` / `or`", (ast.BoolOp,)),
    "list": ("a list (`[...]`)", (ast.List, ast.ListComp)),
    "dict": ("a dictionary (`{key: value}`)", (ast.Dict, ast.DictComp)),
    "tuple": ("a tuple", (ast.Tuple,)),
    "set": ("a set", (ast.Set, ast.SetComp)),
    "slice": ("slicing (`[start:stop]`)", (ast.Slice,)),
    "assert": ("`assert`", (ast.Assert,)),
    "raise": ("`raise`", (ast.Raise,)),
    "global": ("`global`", (ast.Global,)),
}


def _friendly(name: str) -> str:
    if name in CONSTRUCTS:
        return CONSTRUCTS[name][0]
    if name.startswith("call:"):
        return f"the `{name[5:]}()` function"
    if name.startswith("method:"):
        return f"the `.{name[7:]}()` method"
    return {"else": "an `else` branch", "elif": "an `elif` branch", "comment": "a comment (`# ...`)",
            "decorator": "a decorator (`@...`)", "type-hints": "type hints",
            "inline-comment": "an inline comment (`code  # note`)",
            "nested-if": "an `if` inside another `if` (a nested if)",
            "nested-loop": "a loop inside another loop (nested loops)",
            "variable": "a variable"}.get(name, f"`{name}`")


def count_comments(code: str, inline_only: bool = False) -> int:
    """Number of # comments (inline_only: comments that follow code on the same line)."""
    try:
        tokens = list(tokenize.generate_tokens(io.StringIO(code).readline))
    except (tokenize.TokenError, SyntaxError):
        return 0
    count = 0
    for tok in tokens:
        if tok.type == tokenize.COMMENT:
            if not inline_only or tok.line[:tok.start[1]].strip():
                count += 1
    return count


def uses_construct(tree: ast.AST, code: str, name: str) -> bool:
    """True when the code contains the named construct."""
    if name in CONSTRUCTS:
        node_types = CONSTRUCTS[name][1]
        return any(isinstance(node, node_types) for node in ast.walk(tree))
    if name == "nested-loop":
        loops = (ast.For, ast.While)
        return any(isinstance(node, loops) and any(isinstance(inner, loops) for child in node.body
                                                   for inner in ast.walk(child))
                   for node in ast.walk(tree))
    if name == "nested-if":
        return any(isinstance(node, ast.If) and any(isinstance(child, ast.If) for child in node.body)
                   for node in ast.walk(tree))
    if name == "elif":
        return re.search(r"^\s*elif\b", code, re.M) is not None
    if name == "else":
        return re.search(r"^\s*else\s*:", code, re.M) is not None
    if name == "comment":
        return count_comments(code) > 0
    if name == "inline-comment":
        return count_comments(code, inline_only=True) > 0
    if name == "decorator":
        return any(getattr(node, "decorator_list", None) for node in ast.walk(tree))
    if name == "type-hints":
        return any(
            (isinstance(node, ast.FunctionDef) and (node.returns or any(a.annotation for a in node.args.args)))
            or isinstance(node, ast.AnnAssign)
            for node in ast.walk(tree)
        )
    if name == "variable":
        return any(isinstance(node, (ast.Assign, ast.AnnAssign)) for node in ast.walk(tree))
    if name.startswith("call:"):
        wanted = name[5:]
        return any(
            isinstance(node, ast.Call)
            and ((isinstance(node.func, ast.Name) and node.func.id == wanted)
                 or (isinstance(node.func, ast.Attribute) and node.func.attr == wanted))
            for node in ast.walk(tree)
        )
    if name.startswith("method:"):
        wanted = name[7:]
        return any(
            isinstance(node, ast.Call) and isinstance(node.func, ast.Attribute) and node.func.attr == wanted
            for node in ast.walk(tree)
        )
    raise ValueError(f"unknown construct '{name}'")


def normalise_output(text: str, ignore_case: bool = False, ignore_spaces: bool = False) -> list[str]:
    lines = [line.rstrip() for line in text.replace("\r\n", "\n").split("\n")]
    while lines and not lines[-1]:
        lines.pop()
    if ignore_spaces:
        lines = [re.sub(r"\s+", " ", line).strip() for line in lines]
    if ignore_case:
        lines = [line.lower() for line in lines]
    return lines


def compare_output(expected: str, actual: str, ignore_case=False, ignore_spaces=False) -> str | None:
    """Return None when they match, otherwise a plain-English description of the first difference."""
    exp = normalise_output(expected, ignore_case, ignore_spaces)
    act = normalise_output(actual, ignore_case, ignore_spaces)
    if exp == act:
        return None
    for number, (e, a) in enumerate(zip(exp, act), 1):
        if e != a:
            return f"Line {number} of your output is `{a}` but it should be `{e}`."
    if len(act) < len(exp):
        missing = exp[len(act)]
        if not act:
            return "Your program did not print anything."
        return (f"Your output has {len(act)} line(s) but {len(exp)} are expected. "
                f"The next expected line is `{missing}`.")
    extra = act[len(exp)]
    return f"Your output has extra lines. The first unexpected line is `{extra}`."


def _run_failed_detail(run: RunResult, label: str) -> CheckDetail:
    if run.timed_out:
        return CheckDetail(label, False, f"Your program did not finish within {run.timeout_seconds:g} seconds "
                                         "(is there a loop that never ends?).", actual=run.stdout)
    err = run.error or {}
    where = f" on line {err['line']}" if err.get("line") else ""
    return CheckDetail(label, False, f"Your program stopped with a {err.get('type', 'error')}{where}: "
                                     f"{err.get('message', '')}", actual=run.stdout)


def check_python_exercise(exercise: Exercise, code: str, timeout: float | None = None) -> CheckOutcome:
    check = exercise.check or {}
    details: list[CheckDetail] = []

    if not code.strip():
        return CheckOutcome(False, "Your code is empty - write some code first.")

    try:
        tree = ast.parse(code)
    except SyntaxError:
        run = run_python(code, exercise.stdin, timeout=timeout)
        return CheckOutcome(False, "Python could not read your code (a syntax error). Fix it and check again.",
                            [_run_failed_detail(run, "Your code runs")], run)

    for name in check.get("requires", []) or []:
        ok = uses_construct(tree, code, name)
        details.append(CheckDetail(f"Uses {_friendly(name)}", ok,
                                   "" if ok else f"This exercise asks you to use {_friendly(name)}."))
    for name in check.get("forbid", []) or []:
        bad = uses_construct(tree, code, name)
        details.append(CheckDetail(f"Does not use {_friendly(name)}", not bad,
                                   "" if not bad else f"This exercise asks you to solve it without {_friendly(name)}."))

    if check.get("min_comments"):
        wanted = int(check["min_comments"])
        found = count_comments(code)
        details.append(CheckDetail(f"Has at least {wanted} comments", found >= wanted,
                                   "" if found >= wanted else f"You have {found} comment(s); {wanted} are needed."))
    for text in check.get("require_text", []) or []:
        ok = str(text) in code
        details.append(CheckDetail(f"Code contains `{text}`", ok,
                                   "" if ok else f"This exercise expects your code to contain `{text}`."))
    for text in check.get("forbid_text", []) or []:
        bad = str(text) in code
        details.append(CheckDetail(f"Code does not contain `{text}`", not bad,
                                   "" if not bad else f"Do not type `{text}` yourself - let Python work it out."))

    ignore_case = bool(check.get("ignore_case"))
    ignore_spaces = bool(check.get("ignore_spaces"))
    cases = list(check.get("cases") or [])
    if "expected" in check:
        cases.insert(0, {"stdin": check.get("stdin", exercise.stdin), "expected": check["expected"]})
    contains = [str(c) for c in (check.get("contains") or [])]
    tests = list(check.get("tests") or [])

    last_run: RunResult | None = None
    for number, case in enumerate(cases, 1):
        stdin = str(case.get("stdin", "") or "")
        label = "Output is correct" if len(cases) == 1 else f"Output for test input {number} is correct"
        run = run_python(code, stdin, timeout=timeout)
        last_run = run
        if not run.ok:
            details.append(_run_failed_detail(run, label))
            continue
        problem = compare_output(str(case.get("expected", "")), run.stdout, ignore_case, ignore_spaces)
        message = problem or ""
        if problem and stdin.strip() and len(cases) > 1:
            message = f"(with input {stdin.strip()!r}) " + problem
        details.append(CheckDetail(label, problem is None, message,
                                   expected=str(case.get("expected", "")), actual=run.stdout))

    for number, variant in enumerate(check.get("variants") or [], 1):
        old, new = (str(part) for part in variant["replace"])
        label = f"Also works when `{old}` becomes `{new}`"
        if old not in code:
            details.append(CheckDetail(label, False, f"Keep the line `{old}` exactly as it is, so the checker can "
                                                     "try your program with a different value."))
            continue
        run = run_python(code.replace(old, new, 1), str(variant.get("stdin", "") or ""), timeout=timeout)
        if not run.ok:
            details.append(_run_failed_detail(run, label))
            continue
        problem = compare_output(str(variant.get("expected", "")), run.stdout, ignore_case, ignore_spaces)
        details.append(CheckDetail(label, problem is None,
                                   problem or "", expected=str(variant.get("expected", "")), actual=run.stdout))
        last_run = last_run or run

    if contains or tests or last_run is None:
        stdin = str(check.get("stdin", exercise.stdin) or "")
        run = run_python(code, stdin, timeout=timeout, tests=tests)
        last_run = run
        if not run.ok:
            details.append(_run_failed_detail(run, "Your code runs without errors"))
        else:
            if not cases and not tests and not contains:
                details.append(CheckDetail("Your code runs without errors", True))
            haystack = run.stdout.lower() if ignore_case else run.stdout
            for text in contains:
                needle = text.lower() if ignore_case else text
                found = needle in haystack
                details.append(CheckDetail(f"Output contains `{text}`", found,
                                           "" if found else f"Your output should include `{text}`.",
                                           actual=run.stdout))
            for test in run.tests:
                details.append(CheckDetail(test["name"], bool(test["passed"]), test.get("message", "")))

    passed = bool(details) and all(d.passed for d in details)
    failed = sum(1 for d in details if not d.passed)
    if passed:
        summary = "Correct! All checks passed."
    else:
        summary = f"Not quite yet: {failed} of {len(details)} check(s) did not pass. Read the details below."
    return CheckOutcome(passed, summary, details, last_run)
