---
id: py-7-3-exceptions
title: Handling errors with try, except, else and finally
track: python
level: 7
order: 3
minutes: 45
summary: Stop errors from crashing your program - catch specific exceptions, give helpful messages, retry bad input, clean up with finally, raise your own errors, and debug with tracebacks.
objectives:
  - Catch specific exceptions with try / except
  - Use else and finally correctly
  - Re-ask for input until it is valid using try/except in a loop
  - Raise exceptions with raise to report invalid situations
  - Read a multi-level traceback and debug systematically
prerequisites: [py-7-1-reading-writing-files, py-6-1-defining-functions]
tags: [exception, try, except, else, finally, raise, ValueError, traceback, debugging, error handling]
---

## Simple explanation

Some errors are **expected**: users type letters instead of numbers, files go missing, networks fail. Instead of
crashing, a program can **catch** the error and react:

```python
try:
    age = int(input("Age: "))
    print("Next year you will be", age + 1)
except ValueError:
    print("That was not a whole number.")
```

- Code in `try` runs normally.
- If a `ValueError` happens inside it, Python **jumps** to the `except ValueError:` block instead of crashing.
- If no error happens, the `except` block is skipped.

Two optional extras:
- `else:` runs only if **no** exception happened.
- `finally:` runs **always** - error or not - and is used for clean-up.

You can also **raise** your own errors when something is wrong: `raise ValueError("Amount must be positive")`.

## Real-world analogy

`try/except` is like a **trapeze artist's safety net**. The artist (your code) performs normally; if they fall
(an exception), the net catches them and the show goes on. `finally` is the **stagehand who tidies up after every
performance**, whether it went well or not. `raise` is the artist **shouting "stop!"** when a rope looks unsafe.

## Technical definition

- **Syntax**:

  ```text
  try:
      risky code
  except SomeError as err:
      handle it (err holds the exception object; str(err) is its message)
  except (ErrorA, ErrorB):
      handle either
  else:
      runs if no exception was raised in try
  finally:
      always runs
  ```

- Except clauses are checked **in order**; the first matching one runs. Exceptions form a hierarchy
  (`FileNotFoundError` is a kind of `OSError`, which is a kind of `Exception`).
- Catch **specific** exceptions. A bare `except:` or `except Exception:` hides real bugs (even typos become
  "handled").
- `raise ExceptionType("message")` creates an error on purpose. Inside an `except` block, a bare `raise`
  re-raises the current exception.
- An uncaught exception travels **up the call stack** - from the function where it happened, to its caller, and
  so on - until handled or the program ends. The **traceback** lists this path, most recent call last.
- Common built-in exceptions: `ValueError`, `TypeError`, `KeyError`, `IndexError`, `ZeroDivisionError`,
  `FileNotFoundError`, `PermissionError`.

## Step-by-step examples

**Example 1 - keep asking until valid** (Input: `ten`, `-3`, `12`)

```python
while True:
    text = input("Quantity: ")
    try:
        quantity = int(text)
    except ValueError:
        print("Please type a whole number.")
        continue
    if quantity <= 0:
        print("Please type a positive number.")
        continue
    break
print("Ordering", quantity)
```

Output:

```text
Quantity: ten
Please type a whole number.
Quantity: -3
Please type a positive number.
Quantity: 12
Ordering 12
```

**Example 2 - missing file with a default**

```python
def load_notes(filename):
    try:
        with open(filename, encoding="utf-8") as f:
            return f.read()
    except FileNotFoundError:
        return ""          # no notes yet - that is fine

print(repr(load_notes("does_not_exist.txt")))   # ''
```

**Example 3 - else and finally**

```python
def divide(a, b):
    try:
        result = a / b
    except ZeroDivisionError:
        print("Cannot divide by zero")
        return None
    else:
        print("Division worked")
        return result
    finally:
        print("divide() finished")

print(divide(10, 2))
print(divide(1, 0))
```

Output:

```text
Division worked
divide() finished
5.0
Cannot divide by zero
divide() finished
None
```

`finally` ran both times - even though each branch had a `return`.

**Example 4 - raising your own errors**

```python
def withdraw(balance, amount):
    if amount <= 0:
        raise ValueError("Amount must be positive")
    if amount > balance:
        raise ValueError(f"Insufficient funds: balance is {balance}")
    return balance - amount

try:
    withdraw(100, 250)
except ValueError as err:
    print("Error:", err)
```

Output: `Error: Insufficient funds: balance is 100`

**Example 5 - reading a traceback through functions**

```python
def average(numbers):
    return sum(numbers) / len(numbers)

def report(data):
    print("Average:", average(data))

report([])
```

```text
Traceback (most recent call last):
  File "your_code.py", line 7, in <module>
    report([])
  File "your_code.py", line 5, in report
    print("Average:", average(data))
  File "your_code.py", line 2, in average
    return sum(numbers) / len(numbers)
ZeroDivisionError: division by zero
```

Read from the bottom: the error happened in `average` (line 2), which was called by `report` (line 5), which was
called from the main program (line 7). The *cause* is the empty list passed at the top.

## Common mistakes

- **Catching everything** (`except:` / `except Exception:`) - hides bugs and makes debugging much harder.
- **Putting too much code in `try`** - keep only the line(s) that can fail, so you know what went wrong.
- **Silently ignoring errors** (`except ValueError: pass`) - at least tell the user or log it.
- **Using exceptions for normal decisions** when an `if` is clearer (e.g. `if key in d` instead of catching
  KeyError everywhere).
- **Losing the message**: use `except ValueError as err:` and show `err`.

## Practical application

Input validation, reading files that might be missing or damaged, network calls that can time out, converting
messy data - real programs must survive all of these. The projects use try/except to make tools that never crash
on bad input, and the app you are using catches errors so a problem in one lesson file cannot break everything.

## Revision notes

- `try:` risky code → `except SpecificError as err:` handle → `else:` if no error → `finally:` always.
- Catch specific exceptions; never bare `except:`.
- Validation loop: `while True:` + `try: int(...)` + `except ValueError: continue` + `break` when valid.
- `raise ValueError("clear message")` to signal invalid situations.
- Tracebacks: bottom line = what; lines above = the chain of calls, most recent last.

```exercise
id: safe-int
title: A number that cannot crash
difficulty: beginner
instructions: |
  Ask `Number: `. If the input is a whole number, print its square; otherwise print `Not a number` - without
  crashing.

  ```text
  Number: 7
  49
  ```
starter: |
  text = input("Number: ")
  n = int(text)
  print(n * n)
hints:
  - "Put the risky conversion inside `try:`."
  - "`except ValueError:` then print the message."
solution: |
  text = input("Number: ")
  try:
      n = int(text)
      print(n * n)
  except ValueError:
      print("Not a number")
explanation: |
  `int("abc")` raises ValueError; the except block catches it and prints a friendly message instead of a
  traceback.
stdin: "7"
check:
  cases:
    - {stdin: "7", expected: "Number: 7\n49\n"}
    - {stdin: "seven", expected: "Number: seven\nNot a number\n"}
    - {stdin: "2.5", expected: "Number: 2.5\nNot a number\n"}
  requires: [try]
```

```exercise
id: retry-input
title: Ask again until valid
difficulty: beginner
instructions: |
  Keep asking `Rating (1-5): ` until the user types a whole number from 1 to 5. For text, print
  `Please type a number.`; for numbers out of range print `Please choose 1 to 5.` Finally print
  `Thanks for rating <n>!`

  ```text
  Rating (1-5): great
  Please type a number.
  Rating (1-5): 9
  Please choose 1 to 5.
  Rating (1-5): 4
  Thanks for rating 4!
  ```
starter: |
  while True:
      text = input("Rating (1-5): ")
hints:
  - "Inside the loop: `try: rating = int(text)` / `except ValueError: print(...); continue`"
  - "Then check the range; `continue` if wrong, otherwise `break`."
solution: |
  while True:
      text = input("Rating (1-5): ")
      try:
          rating = int(text)
      except ValueError:
          print("Please type a number.")
          continue
      if 1 <= rating <= 5:
          break
      print("Please choose 1 to 5.")
  print(f"Thanks for rating {rating}!")
explanation: |
  The loop only ends with `break` when both checks pass. `continue` restarts the loop after a bad answer.
stdin: |
  great
  9
  4
check:
  cases:
    - stdin: "great\n9\n4\n"
      expected: |
        Rating (1-5): great
        Please type a number.
        Rating (1-5): 9
        Please choose 1 to 5.
        Rating (1-5): 4
        Thanks for rating 4!
    - stdin: "5\n"
      expected: |
        Rating (1-5): 5
        Thanks for rating 5!
  requires: [try, while]
```

```exercise
id: raise-errors
title: Raise a clear error
difficulty: intermediate
instructions: |
  Complete `set_age(age)`: it should `raise ValueError("Age must be a whole number")` if `age` is not an `int`,
  `raise ValueError("Age must be between 0 and 130")` if it is out of range, and otherwise return the age.
  The starter code calls it with several values and prints what happens:

  ```text
  OK: 42
  Error: Age must be between 0 and 130
  Error: Age must be a whole number
  ```
starter: |
  def set_age(age):
      pass

  for value in [42, 200, "x"]:
      try:
          print("OK:", set_age(value))
      except ValueError as err:
          print("Error:", err)
hints:
  - "`if not isinstance(age, int): raise ValueError(\"Age must be a whole number\")`"
  - "`if age < 0 or age > 130: raise ValueError(\"Age must be between 0 and 130\")`"
solution: |
  def set_age(age):
      if not isinstance(age, int):
          raise ValueError("Age must be a whole number")
      if age < 0 or age > 130:
          raise ValueError("Age must be between 0 and 130")
      return age

  for value in [42, 200, "x"]:
      try:
          print("OK:", set_age(value))
      except ValueError as err:
          print("Error:", err)
explanation: |
  Raising an exception stops the function immediately and hands the problem to the caller, who decides how to
  react. `isinstance(age, int)` checks the type.
check:
  expected: |
    OK: 42
    Error: Age must be between 0 and 130
    Error: Age must be a whole number
  requires: [raise]
```

```exercise
id: robust-loader
title: A robust number loader
difficulty: challenge
instructions: |
  Write `load_numbers(filename)` that reads one number per line and returns a tuple `(numbers, problems)`:

  - `numbers` - a list of floats for the lines that are valid numbers (skip blank lines),
  - `problems` - a list of messages like `line 3: 'abc' is not a number` for invalid lines,
  - if the file does not exist, return `([], ["file not found"])`.

  The starter creates `readings.txt` and prints the results:

  ```text
  [12.5, 7.0, 3.25]
  ["line 3: 'abc' is not a number", "line 5: 'n/a' is not a number"]
  []
  ['file not found']
  ```
starter: |
  with open("readings.txt", "w", encoding="utf-8") as f:
      f.write("12.5\n7\nabc\n\nn/a\n3.25\n")

  def load_numbers(filename):
      pass

  numbers, problems = load_numbers("readings.txt")
  print(numbers)
  print(problems)
  numbers, problems = load_numbers("missing.txt")
  print(numbers)
  print(problems)
hints:
  - "Wrap the file opening in `try: ... except FileNotFoundError: return [], [\"file not found\"]`."
  - "Number the lines with a counter (or `enumerate(f, start=1)`), `strip()` each, and `continue` if empty."
  - "Inside, `try: numbers.append(float(text))` / `except ValueError: problems.append(f\"line {n}: {text!r} is not a number\")`."
solution: |
  with open("readings.txt", "w", encoding="utf-8") as f:
      f.write("12.5\n7\nabc\n\nn/a\n3.25\n")

  def load_numbers(filename):
      numbers = []
      problems = []
      try:
          with open(filename, encoding="utf-8") as f:
              line_number = 0
              for line in f:
                  line_number += 1
                  text = line.strip()
                  if not text:
                      continue
                  try:
                      numbers.append(float(text))
                  except ValueError:
                      problems.append(f"line {line_number}: {text!r} is not a number")
      except FileNotFoundError:
          return [], ["file not found"]
      return numbers, problems

  numbers, problems = load_numbers("readings.txt")
  print(numbers)
  print(problems)
  numbers, problems = load_numbers("missing.txt")
  print(numbers)
  print(problems)
explanation: |
  Two levels of error handling: the outer `try` handles a missing file, the inner one handles each bad line
  without stopping the whole load. `{text!r}` formats the text with quotes (its *repr*), which makes empty or
  odd values visible in messages.
check:
  expected: |
    [12.5, 7.0, 3.25]
    ["line 3: 'abc' is not a number", "line 5: 'n/a' is not a number"]
    []
    ['file not found']
  requires: [try]
```

```quiz
- id: q1
  question: When does the code in an `except ValueError:` block run?
  options:
    - Only when a ValueError happens in the try block
    - Always
    - Only when no error happens
    - When any error at all happens
  answer: Only when a ValueError happens in the try block
  explanation: An except clause handles only the exception types it names (and their sub-types).
- id: q2
  question: When does a `finally` block run?
  options:
    - Always - whether or not an exception happened
    - Only after an exception
    - Only if there was no exception
    - Never, unless you call it
  answer: Always - whether or not an exception happened
  explanation: finally is for clean-up that must always happen.
- id: q3
  question: Why is a bare `except:` a bad idea?
  options:
    - It catches every error, including bugs you did not expect, and hides them
    - It is a SyntaxError
    - It only catches ValueError
    - It makes programs slower
  answer: It catches every error, including bugs you did not expect, and hides them
  explanation: Catch the specific exceptions you expect and can handle.
- id: q4
  question: How do you signal an error yourself?
  type: text
  answer: ["raise", "raise ValueError"]
  explanation: 'raise ValueError("message") creates and throws an exception.'
- id: q5
  question: What does this print?
  code: |
    try:
        print(int("5"))
    except ValueError:
        print("bad")
    else:
        print("good")
  options:
    - 5, then good
    - bad
    - 5, then bad
    - good only
  answer: 5, then good
  explanation: No exception occurred, so the else block ran after try.
- id: q6
  question: In a traceback that goes through several functions, where did the error actually occur?
  options:
    - In the last function listed, just above the error line
    - In the first line of the traceback
    - In the main program always
    - It cannot be known
  answer: In the last function listed, just above the error line
  explanation: Tracebacks list calls with the most recent call last.
```
