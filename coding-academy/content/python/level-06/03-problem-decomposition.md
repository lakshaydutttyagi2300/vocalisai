---
id: py-6-3-problem-decomposition
title: Breaking problems into smaller functions
track: python
level: 6
order: 3
minutes: 45
summary: How to turn a big task into small, named, testable functions - plan in plain English first, write one function at a time, and test each piece before combining them.
objectives:
  - Break a problem into steps and turn each step into a function
  - Write small functions that each do one job
  - Test functions individually with simple calls and assert
  - Use a main() function to organise a program
  - Recognise duplicated code and replace it with a function
prerequisites: [py-6-2-arguments-and-scope]
tags: [decomposition, design, main, reusable, assert, testing, single responsibility, refactoring]
---

## Simple explanation

Big problems are solved by splitting them into small problems. For a "shopping receipt" program:

1. **Read** the items.
2. **Calculate** each line total.
3. **Add** a discount if eligible.
4. **Format** the receipt.

Each step becomes a **small function with a clear name**. Then a `main()` function calls them in order. Small
functions are easier to write, test, understand, and reuse.

A quick way to check a function works is `assert`:

```python
def line_total(qty, price):
    return qty * price

assert line_total(3, 2.5) == 7.5     # silent if correct, AssertionError if not
```

## Real-world analogy

Cooking a three-course dinner: you do not think "make dinner" all at once. You plan: make the soup, roast the
vegetables, bake the dessert. Each is a separate recipe you can practise and perfect on its own. The **menu**
(the `main` function) says in what order to prepare them.

## Technical definition

- **Decomposition**: dividing a problem into sub-problems until each is simple to solve.
- **Single responsibility**: each function does one thing; its name says what (a verb: `calculate_total`,
  `format_receipt`, `is_valid_email`).
- **Pure functions** (output depends only on inputs, no printing or global changes) are the easiest to test and
  reuse. Keep `input()`/`print()` in a few "outer" functions and the logic in pure ones.
- **`assert condition, message`** raises `AssertionError` with the message when the condition is false - a
  lightweight test. (Level 10 introduces proper testing tools.)
- **`main()` and the `__name__` guard**:

  ```python
  def main():
      ...

  if __name__ == "__main__":
      main()
  ```

  `__name__` is `"__main__"` when the file is run directly, but the module's name when it is imported. The guard
  lets other programs import your functions without running `main()`.
- **DRY - Don't Repeat Yourself**: if you copy-paste code, turn it into a function with parameters for the parts
  that differ.

## Step-by-step examples

**Example 1 - from a plan to functions**

Plan in plain English (pseudo-code) first:

```text
for each item: line total = quantity x price
subtotal = sum of line totals
if subtotal >= 100: 10% discount
print each line and the total
```

Then code, one function per idea:

```python
def line_total(qty, price):
    return qty * price

def subtotal(items):
    return sum(line_total(qty, price) for name, qty, price in items)

def discount(amount):
    return amount * 0.10 if amount >= 100 else 0

def format_line(name, qty, price):
    return f"{name:<10}{qty:>3} x {price:>6.2f} = {line_total(qty, price):>7.2f}"

def main():
    items = [("Shirt", 2, 25.0), ("Shoes", 1, 60.0)]
    for name, qty, price in items:
        print(format_line(name, qty, price))
    total = subtotal(items)
    total -= discount(total)
    print(f"Total: {total:.2f}")

if __name__ == "__main__":
    main()
```

Output:

```text
Shirt       2 x  25.00 =   50.00
Shoes       1 x  60.00 =   60.00
Total: 99.00
```

**Example 2 - testing each piece**

```python
assert line_total(2, 25.0) == 50.0
assert discount(99) == 0
assert discount(200) == 20.0
assert subtotal([("A", 1, 10), ("B", 2, 5)]) == 20
print("All tests passed")
```

If a test fails, you know *which* small piece is wrong.

**Example 3 - removing duplication**

Before (repeated logic):

```python
print("Rent:", round(1100 / 2, 2))
print("Food:", round(385.5 / 2, 2))
print("Travel:", round(92.25 / 2, 2))
```

After:

```python
def half(amount):
    return round(amount / 2, 2)

for label, amount in [("Rent", 1100), ("Food", 385.5), ("Travel", 92.25)]:
    print(f"{label}:", half(amount))
```

If the rule changes (split three ways), you change one line.

## Common mistakes

- **One giant function** that reads, calculates and prints everything - hard to test and fix.
- **Functions that do two unrelated things** (e.g. calculate *and* print) - split them.
- **Vague names** like `do_stuff()`, `process()`, `x()`.
- **Testing only the whole program**: when it fails, you don't know where. Test the pieces.
- **Starting to type code before having a plan** for anything bigger than a few lines.

## Practical application

Every project in this app is designed around decomposition: the expense tracker has `load`, `add_expense`,
`summary_by_category`, `save`. Professional code is organised the same way, which is why reading other people's
code gets easier once you think in functions.

## Revision notes

- Plan in plain English → one function per step → `main()` calls them in order.
- Small functions with clear verb names, one job each.
- Keep input/output at the edges; keep calculations in pure functions.
- `assert expected == actual` as a quick test of each function.
- `if __name__ == "__main__": main()` - runs main only when the file is run directly.
- DRY: repeated code → a function with parameters.

```exercise
id: celsius-functions
title: Split a converter into functions
difficulty: beginner
instructions: |
  Write two pure functions:

  - `c_to_f(c)` returns Fahrenheit (`c * 9 / 5 + 32`)
  - `f_to_c(f)` returns Celsius (`(f - 32) * 5 / 9`)

  Then print a small table for 0, 25 and 100 °C:

  ```text
  0 C = 32.0 F
  25 C = 77.0 F
  100 C = 212.0 F
  ```
starter: |
  def c_to_f(c):
      pass

  def f_to_c(f):
      pass

  for c in [0, 25, 100]:
      print(c, "C =", c_to_f(c), "F")
hints:
  - "`return c * 9 / 5 + 32`"
  - "`return (f - 32) * 5 / 9`"
solution: |
  def c_to_f(c):
      return c * 9 / 5 + 32

  def f_to_c(f):
      return (f - 32) * 5 / 9

  for c in [0, 25, 100]:
      print(c, "C =", c_to_f(c), "F")
explanation: |
  Each function does one conversion and returns the result; printing happens outside. That makes the functions
  reusable and easy to test.
check:
  expected: |
    0 C = 32.0 F
    25 C = 77.0 F
    100 C = 212.0 F
  tests:
    - name: f_to_c converts correctly
      code: |
        assert f_to_c(212) == 100 and f_to_c(32) == 0
    - name: converting there and back gives the original
      code: |
        assert abs(f_to_c(c_to_f(37)) - 37) < 1e-9
```

```exercise
id: assert-tests
title: Write your own tests
difficulty: beginner
instructions: |
  The function `is_valid_pin(pin)` should return `True` only for strings of exactly 4 digits. Below it, write
  **at least four `assert` statements** testing it (two valid and two invalid examples), then print
  `All tests passed`.

  ```text
  All tests passed
  ```
starter: |
  def is_valid_pin(pin):
      return len(pin) == 4 and pin.isdigit()

  # write your assert statements here

  print("All tests passed")
hints:
  - "`assert is_valid_pin(\"1234\")` - passes silently."
  - "`assert not is_valid_pin(\"12a4\")` - checks an invalid example."
solution: |
  def is_valid_pin(pin):
      return len(pin) == 4 and pin.isdigit()

  assert is_valid_pin("1234")
  assert is_valid_pin("0000")
  assert not is_valid_pin("123")
  assert not is_valid_pin("12a4")
  print("All tests passed")
explanation: |
  `assert` does nothing when the condition is True and stops the program with AssertionError when it is False.
  Testing both valid and invalid inputs is important - many bugs hide in the "should be rejected" cases.
check:
  expected: |
    All tests passed
  tests:
    - name: at least four assert statements
      code: |
        import ast
        found = sum(isinstance(node, ast.Assert) for node in ast.walk(ast.parse(SOURCE)))
        assert found >= 4, f"Found {found} assert statements - write at least 4."
```

```exercise
id: dry-refactor
title: Remove the repetition
difficulty: intermediate
instructions: |
  The starter prints three labelled boxes with repeated code. Write a function `box(label, width)` that
  **returns** the three lines as one string (lines joined with `"\n"`), and use it in a loop over the
  `labels` list. The output must stay exactly the same:

  ```text
  +--------+
  |Inbox   |
  +--------+
  +--------+
  |Sent    |
  +--------+
  +--------+
  |Drafts  |
  +--------+
  ```
starter: |
  labels = ["Inbox", "Sent", "Drafts"]
  print("+" + "-" * 8 + "+")
  print("|" + "Inbox".ljust(8) + "|")
  print("+" + "-" * 8 + "+")
  print("+" + "-" * 8 + "+")
  print("|" + "Sent".ljust(8) + "|")
  print("+" + "-" * 8 + "+")
  print("+" + "-" * 8 + "+")
  print("|" + "Drafts".ljust(8) + "|")
  print("+" + "-" * 8 + "+")
hints:
  - "`border = \"+\" + \"-\" * width + \"+\"` and `middle = \"|\" + label.ljust(width) + \"|\"`."
  - "`return \"\\n\".join([border, middle, border])`"
  - "`for label in labels: print(box(label, 8))`"
solution: |
  labels = ["Inbox", "Sent", "Drafts"]

  def box(label, width):
      border = "+" + "-" * width + "+"
      middle = "|" + label.ljust(width) + "|"
      return "\n".join([border, middle, border])

  for label in labels:
      print(box(label, 8))
explanation: |
  The repeated pattern became one function with parameters for what changes (the label and the width).
  `ljust(width)` pads text with spaces on the right to the given width.
check:
  expected: |
    +--------+
    |Inbox   |
    +--------+
    +--------+
    |Sent    |
    +--------+
    +--------+
    |Drafts  |
    +--------+
  requires: [def, for]
  tests:
    - name: box returns the three lines as a string
      code: |
        assert box("Hi", 4) == "+----+\n|Hi  |\n+----+"
```

```exercise
id: grade-report
title: A grade report in small functions
difficulty: challenge
instructions: |
  Build a report from the `results` dictionary using **three functions**:

  - `average(scores)` - returns the average (no rounding),
  - `letter(avg)` - returns `"A"` for 85+, `"B"` for 70+, `"C"` for 55+, otherwise `"F"`,
  - `report_line(name, scores)` - returns a line like `Asha    83.0 A` (name left-aligned in 8, average with 1
    decimal right-aligned in 5, a space, the letter).

  Then print a line for each student, in order:

  ```text
  Asha     83.0 B
  Ben      57.7 C
  Chen     91.3 A
  ```
starter: |
  results = {"Asha": [82, 90, 77], "Ben": [45, 60, 68], "Chen": [88, 95, 91]}
hints:
  - "`letter` can use early returns: `if avg >= 85: return \"A\"` ..."
  - "`report_line` calls the other two: `avg = average(scores)` then `f\"{name:<8}{avg:>5.1f} {letter(avg)}\"`."
solution: |
  results = {"Asha": [82, 90, 77], "Ben": [45, 60, 68], "Chen": [88, 95, 91]}

  def average(scores):
      return sum(scores) / len(scores)

  def letter(avg):
      if avg >= 85:
          return "A"
      if avg >= 70:
          return "B"
      if avg >= 55:
          return "C"
      return "F"

  def report_line(name, scores):
      avg = average(scores)
      return f"{name:<8}{avg:>5.1f} {letter(avg)}"

  for name, scores in results.items():
      print(report_line(name, scores))
explanation: |
  Each function has one job and can be tested alone; `report_line` combines them. Note Asha's 83.0 is a B: the A
  grade starts at 85.
check:
  expected: |
    Asha     83.0 B
    Ben      57.7 C
    Chen     91.3 A
  tests:
    - name: average works
      code: |
        assert average([1, 2, 3, 4]) == 2.5
    - name: letter handles the boundaries
      code: |
        assert [letter(85), letter(84.9), letter(70), letter(55), letter(54.9)] == ["A", "B", "B", "C", "F"]
    - name: report_line formats one line
      code: |
        assert report_line("Zoe", [100]) == "Zoe     100.0 A"
```

```quiz
- id: q1
  question: What is the main benefit of splitting a program into small functions?
  options:
    - Each piece can be understood, tested and reused on its own
    - The program uses less memory
    - Python requires it
    - It hides errors
  answer: Each piece can be understood, tested and reused on its own
  explanation: Small functions make bugs easier to find and code easier to change.
- id: q2
  question: What does `assert 2 + 2 == 5` do?
  options:
    - Raises AssertionError
    - Prints False
    - Nothing
    - Changes 2 + 2 to 5
  answer: Raises AssertionError
  explanation: assert stops the program when its condition is False.
- id: q3
  question: Which is the best function name for "calculate the total price of a basket"?
  options:
    - basket_total
    - do_it
    - x
    - function1
  answer: basket_total
  explanation: Names should say what the function does or returns.
- id: q4
  question: What does `if __name__ == "__main__":` allow?
  options:
    - Running main() only when the file is run directly, not when it is imported
    - Running the file twice
    - Making main() private
    - Speeding up the program
  answer: Running main() only when the file is run directly, not when it is imported
  explanation: Imported modules have their own name in __name__, so their main() does not run automatically.
- id: q5
  question: You copy-pasted the same five lines in three places with small differences. What should you do?
  options:
    - Turn them into a function with parameters for the differences
    - Copy them a fourth time
    - Put them in a comment
    - Nothing
  answer: Turn them into a function with parameters for the differences
  explanation: DRY - Don't Repeat Yourself. One function means one place to fix.
- id: q6
  question: Which function is easiest to test?
  options:
    - One that takes inputs as parameters and returns a result without printing
    - One that asks for input() and prints the result
    - One that changes global variables
    - One that does everything at once
  answer: One that takes inputs as parameters and returns a result without printing
  explanation: Pure functions can be checked with a simple assert.
```
