---
id: py-10-4-testing-and-debugging
title: Testing and debugging your code
track: python
level: 10
order: 4
minutes: 50
summary: Prove your code works with assert-based tests and unittest, think about edge cases, and debug systematically instead of guessing.
objectives:
  - Write test functions with assert for normal cases and edge cases
  - Use unittest test cases and read the results
  - Find a bug by writing a failing test first
  - Debug systematically - reproduce, isolate, inspect, fix, re-test
prerequisites: [py-6-3-problem-decomposition, py-7-3-exceptions]
tags: [testing, test, assert, unittest, pytest, edge case, bug, debugging, breakpoint, pdb, regression, tdd]
---

## Simple explanation

A **test** is a small piece of code that checks another piece of code gives the right answer:

```python
def add_vat(price):
    return round(price * 1.2, 2)

def test_add_vat():
    assert add_vat(10) == 12.0
    assert add_vat(0) == 0
    assert add_vat(9.99) == 11.99

test_add_vat()
print("all tests passed")
```

If any `assert` is false, Python stops with an `AssertionError` that shows which line failed. Tests let you
change code later without fear: run them, and you know immediately if you broke something.

**Debugging** is finding *why* code is wrong. Don't guess - follow steps: reproduce the problem, make the input
as small as possible, look at the values (print or a debugger), fix, and add a test so the bug never returns.

## Real-world analogy

Tests are a **pre-flight checklist**: pilots don't trust memory, they check each item every time. Debugging is
**detective work**: gather clues (error messages, values), form a theory, test the theory, and only then make an
arrest (the fix).

## Technical definition

- **Unit test**: tests one function/class in isolation. **Integration test**: tests parts working together.
  **Regression test**: added after a bug is fixed so it can't come back.
- **Edge cases**: empty inputs, zero, negative numbers, one item, very large values, unusual text (spaces,
  capitals, accents), missing data.
- **`unittest`** (standard library): subclass `unittest.TestCase`, write methods starting with `test_`, and use
  `self.assertEqual(a, b)`, `self.assertTrue(x)`, `self.assertRaises(ValueError)`.
- **`pytest`** (third-party, `pip install pytest`): plain functions named `test_*` with bare `assert`, discovered
  automatically by running `pytest` in a terminal. Most professionals use it. This app's own tests use pytest.
- **Test-driven development (TDD)**: write a failing test first, then the code that makes it pass, then tidy up.
- **Debugging tools**: reading the traceback bottom-up; `print(f"{x=}")` shows a variable's name and value;
  `breakpoint()` pauses the program in the **pdb** debugger (on your own computer - not in the practice lab):
  `n` next line, `s` step into, `p x` print x, `c` continue, `q` quit. Editors like VS Code have visual debuggers.
- **Rubber-duck debugging**: explaining the code line by line, out loud, often reveals the bug.

## Step-by-step examples

**Example 1 - testing an exception**

```python
def safe_divide(a, b):
    if b == 0:
        raise ValueError("cannot divide by zero")
    return a / b

def test_safe_divide():
    assert safe_divide(10, 4) == 2.5
    try:
        safe_divide(1, 0)
        assert False, "expected ValueError"
    except ValueError:
        pass

test_safe_divide()
print("ok")
```

**Example 2 - the same with unittest**

```python
import unittest

class TestSafeDivide(unittest.TestCase):
    def test_normal(self):
        self.assertEqual(safe_divide(10, 4), 2.5)

    def test_zero(self):
        with self.assertRaises(ValueError):
            safe_divide(1, 0)

suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestSafeDivide)
result = unittest.TestResult()
suite.run(result)
print(result.testsRun, "run,", len(result.failures), "failed,", len(result.errors), "errors")
```

On your own computer you would usually just write `unittest.main()` at the bottom, or run `pytest`.

**Example 3 - `f"{x=}"` while debugging**

```python
items = [4, 8, 15]
total = sum(items)
print(f"{items=} {total=}")      # items=[4, 8, 15] total=27
```

## Common mistakes

- **Testing only the happy path** - most bugs live in edge cases (empty list, zero, negative).
- **Comparing floats exactly** - `0.1 + 0.2 == 0.3` is False. Use `round(...)` or `math.isclose(a, b)`.
- **Changing several things at once while debugging** - change one thing, re-run, observe.
- **Deleting the failing test** instead of fixing the code. A failing test is information.
- **Tests that always pass** (`assert True`, or testing the code against itself) - a test must be able to fail.
- **Leaving debug prints and `breakpoint()` calls** in finished code.

## Practical application

Professional teams run thousands of tests automatically on every change. For your own projects, start small: a
`test_*.py` file with a handful of asserts for the trickiest functions. When you find a bug, first write a test
that fails because of it, then fix the code - the test stays forever as protection.

## Revision notes

- `assert condition, "message"` - silent when true, AssertionError when false.
- Test normal cases **and** edge cases; test that errors are raised when they should be.
- unittest: `TestCase`, `test_` methods, `assertEqual`, `assertRaises`. pytest: plain functions + assert.
- Debug: reproduce → shrink → inspect (`f"{x=}"`, debugger) → fix → add a regression test.
- Floats: compare with `round` or `math.isclose`.

```exercise
id: write-asserts
title: Write tests for a function
difficulty: beginner
instructions: |
  `initials(name)` is already written. Write a function `test_initials()` containing **at least four** `assert`
  statements: a normal two-word name, a three-word name, a name with extra spaces, and a lower-case name. Call
  it and print `tests passed`. Your tests are also run against a broken version of `initials` to make sure they
  can catch mistakes.

  ```text
  tests passed
  ```
starter: |
  def initials(name):
      return "".join(word[0].upper() for word in name.split())

  def test_initials():
      pass  # write your asserts here

  test_initials()
  print("tests passed")
hints:
  - "Example: `assert initials(\"Ada Lovelace\") == \"AL\"`"
  - "`\"  grace   hopper \"` should still give `\"GH\"` because `split()` ignores extra spaces."
  - "A lower-case name like `\"alan turing\"` should give `\"AT\"`."
solution: |
  def initials(name):
      return "".join(word[0].upper() for word in name.split())

  def test_initials():
      assert initials("Ada Lovelace") == "AL"
      assert initials("Mary Ann Evans") == "MAE"
      assert initials("  grace   hopper ") == "GH"
      assert initials("alan turing") == "AT"

  test_initials()
  print("tests passed")
explanation: |
  Good tests cover the normal case and the awkward ones. Because the checker also runs your tests against a
  version of `initials` that forgets `.upper()`, a test file that checks nothing real would be caught.
check:
  expected: |
    tests passed
  tests:
    - name: your test function contains at least four asserts
      code: |
        import ast
        tree = ast.parse(SOURCE)
        func = next(n for n in ast.walk(tree) if isinstance(n, ast.FunctionDef) and n.name == "test_initials")
        count = sum(isinstance(n, ast.Assert) for n in ast.walk(func))
        assert count >= 4, f"test_initials has {count} assert(s); write at least four"
    - name: your tests catch a version that forgets upper()
      code: |
        def initials(name):
            return "".join(word[0] for word in name.split())
        try:
            test_initials()
        except AssertionError:
            pass
        else:
            raise AssertionError("Your tests did not notice a broken initials() that forgets .upper()")
```

```exercise
id: find-bug-with-test
title: Fix the bug the tests reveal
difficulty: beginner
instructions: |
  `average_score` should return the average of a list of scores rounded to 1 decimal, and **0.0 for an empty
  list**. The tests at the bottom show it has bugs. Fix the function (not the tests) so all tests pass.

  ```text
  all 4 tests passed
  ```
starter: |
  def average_score(scores):
      total = 0
      for s in scores:
          total += s
      return round(total / (len(scores) - 1), 1)

  def run_tests():
      assert average_score([10, 20, 30]) == 20.0
      assert average_score([7]) == 7.0
      assert average_score([1, 2]) == 1.5
      assert average_score([]) == 0.0
      print("all 4 tests passed")

  run_tests()
hints:
  - "Run it and read which assert fails first. What should you divide by to get an average?"
  - "Dividing by `len(scores)` fixes the first three tests. What happens with an empty list?"
  - "Add `if not scores: return 0.0` at the top of the function."
solution: |
  def average_score(scores):
      if not scores:
          return 0.0
      total = 0
      for s in scores:
          total += s
      return round(total / len(scores), 1)

  def run_tests():
      assert average_score([10, 20, 30]) == 20.0
      assert average_score([7]) == 7.0
      assert average_score([1, 2]) == 1.5
      assert average_score([]) == 0.0
      print("all 4 tests passed")

  run_tests()
explanation: |
  There were two bugs: an off-by-one error (`len - 1`) and a crash (ZeroDivisionError) for an empty list. The
  tests pointed straight at both. Notice the edge cases - one item and no items - are what exposed them.
check:
  expected: |
    all 4 tests passed
  require_text: ["assert average_score([]) == 0.0", "assert average_score([1, 2]) == 1.5"]
```

```exercise
id: unittest-case
title: A unittest test case
difficulty: intermediate
instructions: |
  Write a `unittest.TestCase` class `TestParsePrice` for the given `parse_price` function with **three** test
  methods:

  - `test_plain` - `"12.50"` gives `12.5`
  - `test_currency_symbol` - `"£3"` gives `3.0`
  - `test_invalid` - `"abc"` raises `ValueError` (use `self.assertRaises`)

  The starter runs the tests and prints a summary.

  ```text
  3 run, 0 failed, 0 errors
  ```
starter: |
  import unittest

  def parse_price(text):
      text = text.strip().lstrip("£$€")
      return float(text)

  # write the TestParsePrice class here

  suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestParsePrice)
  result = unittest.TestResult()
  suite.run(result)
  print(result.testsRun, "run,", len(result.failures), "failed,", len(result.errors), "errors")
hints:
  - "`class TestParsePrice(unittest.TestCase):` and each method takes `self`."
  - "`self.assertEqual(parse_price(\"12.50\"), 12.5)`"
  - "`with self.assertRaises(ValueError): parse_price(\"abc\")`"
solution: |
  import unittest

  def parse_price(text):
      text = text.strip().lstrip("£$€")
      return float(text)

  class TestParsePrice(unittest.TestCase):
      def test_plain(self):
          self.assertEqual(parse_price("12.50"), 12.5)

      def test_currency_symbol(self):
          self.assertEqual(parse_price("£3"), 3.0)

      def test_invalid(self):
          with self.assertRaises(ValueError):
              parse_price("abc")

  suite = unittest.defaultTestLoader.loadTestsFromTestCase(TestParsePrice)
  result = unittest.TestResult()
  suite.run(result)
  print(result.testsRun, "run,", len(result.failures), "failed,", len(result.errors), "errors")
explanation: |
  unittest finds methods whose names start with `test_`. `assertRaises` passes only if the error really happens.
  On your own computer `unittest.main()` or `pytest` prints a fuller report.
check:
  expected: |
    3 run, 0 failed, 0 errors
  require_text: ["assertRaises", "assertEqual"]
  requires: [class]
```

```exercise
id: debug-word-count
title: Debug systematically
difficulty: challenge
instructions: |
  `top_words(text, n)` should return the `n` most common words (lower-case, ignoring the punctuation `.,!?`) as
  `(word, count)` pairs, most common first, ties broken alphabetically. It has **three** bugs. Use the tests -
  and `print(f"{variable=}")` if it helps - to find and fix them. Remove any debug prints when you are done.

  ```text
  [('the', 3), ('cat', 2), ('dog', 1)]
  [('a', 2), ('b', 2)]
  []
  all tests passed
  ```
starter: |
  def top_words(text, n):
      counts = {}
      for word in text.split():
          word = word.strip(".,!?")
          counts[word] = counts.get(word, 1) + 1
      ranked = sorted(counts.items(), key=lambda pair: (pair[1], pair[0]))
      return ranked[:n]

  print(top_words("The cat saw the dog. The cat ran!", 3))
  print(top_words("b a b a", 5))
  print(top_words("", 2))
  assert top_words("x y x", 1) == [("x", 2)]
  assert top_words("Hi hi HI", 1) == [("hi", 3)]
  print("all tests passed")
hints:
  - "Look at the counts: what does `counts.get(word, 1) + 1` give the first time a word appears?"
  - "Are 'The' and 'the' counted together? Something needs `.lower()`."
  - "The sort puts the smallest counts first. Sort by `(-count, word)` to get most common first, then alphabetical."
solution: |
  def top_words(text, n):
      counts = {}
      for word in text.lower().split():
          word = word.strip(".,!?")
          counts[word] = counts.get(word, 0) + 1
      ranked = sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
      return ranked[:n]

  print(top_words("The cat saw the dog. The cat ran!", 3))
  print(top_words("b a b a", 5))
  print(top_words("", 2))
  assert top_words("x y x", 1) == [("x", 2)]
  assert top_words("Hi hi HI", 1) == [("hi", 3)]
  print("all tests passed")
explanation: |
  Bug 1: the default for a new word was 1, so every count was one too high. Bug 2: no `.lower()`, so "The" and
  "the" were different words. Bug 3: sorting by `(count, word)` put the rarest words first; `-count` reverses
  only the count while keeping words alphabetical for ties. Fixing one bug at a time and re-running is the
  systematic way.
check:
  expected: |
    [('the', 3), ('cat', 2), ('dog', 1)]
    [('a', 2), ('b', 2)]
    []
    all tests passed
  forbid_text: ["=}"]
```

```quiz
- id: q1
  question: What happens when `assert total == 10` runs and total is 9?
  options:
    - Python raises an AssertionError
    - Nothing - asserts are only comments
    - total is changed to 10
    - The program prints False and continues
  answer: Python raises an AssertionError
  explanation: An assert is silent when the condition is true and raises AssertionError when it is false.
- id: q2
  question: Which is an edge case for a function that averages a list?
  options:
    - An empty list
    - A list of three ordinary numbers
    - A list of positive integers
    - A list that was sorted
  answer: An empty list
  explanation: Edge cases are the unusual boundaries - empty, zero, one item, negative, huge.
- id: q3
  question: Why is `assert 0.1 + 0.2 == 0.3` a bad test?
  options:
    - Floating-point arithmetic gives 0.30000000000000004, so it fails
    - assert can't compare numbers
    - 0.1 is not a valid number
    - It always passes
  answer: Floating-point arithmetic gives 0.30000000000000004, so it fails
  explanation: Use round() or math.isclose() for floats.
- id: q4
  question: You fixed a bug. What should you add?
  options:
    - A regression test that would have caught the bug
    - A comment saying "fixed"
    - Nothing - fixed is fixed
    - A print statement
  answer: A regression test that would have caught the bug
  explanation: The test makes sure the bug never quietly comes back.
- id: q5
  question: In unittest, which method names are run as tests?
  options:
    - Methods whose names start with test_
    - Every method in the file
    - Methods named run
    - Methods with a docstring
  answer: Methods whose names start with test_
  explanation: pytest uses the same naming convention for functions.
- id: q6
  question: What is the best first step when debugging?
  options:
    - Reproduce the problem reliably
    - Rewrite the whole program
    - Change several lines and hope
    - Delete the tests
  answer: Reproduce the problem reliably
  explanation: Reproduce, shrink the input, inspect values, fix, then add a test.
```
