---
id: py-0-3-how-errors-happen
title: How errors happen (and why they are normal)
track: python
level: 0
order: 3
minutes: 30
summary: Syntax errors, runtime errors and logic errors - what they are, how to read an error message, and a calm step-by-step way to fix them.
objectives:
  - Accept that errors are a normal, everyday part of programming
  - Tell the difference between syntax errors, runtime errors and logic errors
  - Find the line number and error type in an error message
  - Fix simple errors using a step-by-step debugging approach
prerequisites: [py-0-1-what-is-a-program]
tags: [error, bug, debugging, syntax error, runtime error, logic error, traceback, exception]
---

## Simple explanation

Every programmer - beginner or expert - sees error messages **every day**. An error does not mean you are bad at
this. It means the computer found something it cannot do, and it is telling you *where* and *why*. Error
messages are help, not punishment.

A mistake in a program is called a **bug**. Finding and fixing bugs is called **debugging**.

There are three kinds of errors:

1. **Syntax errors** - you broke the *grammar* of Python: a missing bracket, a missing quote mark, a typo in
   the structure. Python reads your whole program before running it, notices the problem, and runs
   **nothing**.
2. **Runtime errors** - the grammar is fine, the program starts, but at some line Python is asked to do
   something impossible (use a name that does not exist, divide by zero...). The program stops at that line.
   Lines *before* it have already run.
3. **Logic errors** - the program runs without any error message, but the **result is wrong**: you asked for
   the wrong thing. These are the trickiest, because Python cannot know what you *meant*.

## Real-world analogy

Imagine giving directions to a taxi driver:

- **Syntax error:** "Go turn left the at" - the sentence is not proper language, so the driver cannot even
  start.
- **Runtime error:** "Drive to 42 Banana Street" - a fine sentence, but halfway there the driver discovers that
  Banana Street does not exist, and stops.
- **Logic error:** "Drive to the airport" when you wanted the train station - the driver follows the
  instructions perfectly, and you end up in the wrong place.

## Technical definition

- **SyntaxError** (and its cousin **IndentationError**): raised when the Python *parser* cannot understand the
  code. Detected *before* any line runs.
- **Exception**: Python's name for a runtime error. Each has a **type** (`NameError`, `TypeError`,
  `ZeroDivisionError`...) and a **message**.
- **Traceback**: the full error report printed when an exception is not handled. It lists the lines that were
  running (most recent last) and ends with the error type and message.
- **Logic error**: incorrect behaviour with no exception. Found by comparing actual output with expected output
  (testing).

**How to read a traceback:**

```text
Traceback (most recent call last):
  File "your_code.py", line 2, in <module>
    print(total)
          ^^^^^
NameError: name 'total' is not defined
```

1. Read the **last line first**: the error **type** (`NameError`) and **message** (`name 'total' is not
   defined`).
2. Look for the **line number** (`line 2`) and the code shown underneath it.
3. The `^^^^^` marks show exactly where on the line Python got stuck.

## Step-by-step examples

**Example 1 - a syntax error**

```python
print("Hello)
```

Output:

```text
  File "your_code.py", line 1
    print("Hello)
          ^
SyntaxError: unterminated string literal (detected at line 1)
```

"Unterminated string" means a piece of text was opened with `"` but never closed. Fix: `print("Hello")`.

**Example 2 - a runtime error (earlier lines still run)**

```python
print("Start")
print(10 / 0)
print("End")
```

Output:

```text
Start
Traceback (most recent call last):
  File "your_code.py", line 2, in <module>
    print(10 / 0)
          ~~~^~~
ZeroDivisionError: division by zero
```

`Start` was printed because line 1 ran before the error. Line 3 never ran.

**Example 3 - a logic error (no message at all)**

```python
print("A dozen eggs is", 10, "eggs")
```

Output: `A dozen eggs is 10 eggs`. Python is happy - but a dozen is 12. Only *you* can notice this, by
checking the result. This is why the exercises in this app compare your output with the expected output.

**A calm debugging routine**

1. **Read** the last line of the error message. What type? What does the message say?
2. **Go to** the line number. Also look at the line *above* - syntax mistakes are often one line earlier.
3. **Compare** with a working example from the lesson. Look for missing brackets, quotes, colons, and spelling.
4. **Change one thing**, run again, and see if the message changes.
5. Still stuck? Search the error name in the **Knowledge Base**, use a **hint**, or take a short break.

## Common mistakes

- **Panicking and changing many things at once.** Change one thing at a time so you know what fixed it.
- **Only looking at the reported line.** For syntax errors the real mistake (like a missing `)`) is often on the
  line *before*.
- **Ignoring the message and guessing.** The message usually says exactly what is wrong - read it slowly.
- **Assuming "no error" means "correct".** Logic errors produce no message. Always check the output.

## Practical application

Professional developers spend a large part of their time reading error messages and debugging. Becoming calm
and methodical about errors is one of the most valuable skills you can build - and you start building it now.

## Revision notes

- Errors are normal. A mistake is a **bug**; fixing it is **debugging**.
- **Syntax error**: grammar broken → nothing runs. Check brackets, quotes, colons, spelling.
- **Runtime error (exception)**: program stops at the failing line; earlier lines already ran.
- **Logic error**: no message, wrong result. Found by checking output.
- Read a **traceback** from the **bottom**: error type and message, then the line number, then the `^` marker.
- Debug calmly: read → go to the line (and the one above) → compare → change one thing → run again.

```exercise
id: fix-syntax
title: Fix a syntax error
difficulty: beginner
instructions: |
  This program has a **syntax error**. Press **Run** to see the error message, read it, then fix the code so it
  prints:

  ```text
  Debugging is a skill.
  ```
starter: |
  print("Debugging is a skill.)
hints:
  - The message says "unterminated string literal" - a piece of text is missing its closing quote mark.
  - Add a `"` just before the closing bracket `)`.
solution: |
  print("Debugging is a skill.")
explanation: |
  Text must be enclosed by a quote mark at the start *and* at the end. The missing closing `"` made Python
  think the text never ended.
check:
  expected: |
    Debugging is a skill.
```

```exercise
id: fix-name
title: Fix a runtime error
difficulty: beginner
instructions: |
  Run this program. The first line works, but then there is a **NameError**. Read the message and fix the
  mistake so the program prints both lines:

  ```text
  Line one works.
  Line two works too.
  ```
starter: |
  print("Line one works.")
  Print("Line two works too.")
hints:
  - The error message says `name 'Print' is not defined`. Python's names are case-sensitive.
  - Python's printing function is spelled with a lower-case p.
solution: |
  print("Line one works.")
  print("Line two works too.")
explanation: |
  `Print` and `print` are different names to Python. Only `print` exists, so `Print` causes a NameError. Notice
  the first line ran before the error happened - that is typical of runtime errors.
check:
  expected: |
    Line one works.
    Line two works too.
```

```exercise
id: fix-logic
title: Fix a logic error
difficulty: intermediate
instructions: |
  This program runs without any error message - but its answer is wrong. A week has 7 days, so 3 weeks have 21
  days. Fix the calculation (not the text) so it prints:

  ```text
  Days in 3 weeks:
  21
  ```
starter: |
  print("Days in 3 weeks:")
  print(3 + 7)
hints:
  - Which maths operation turns "3 weeks of 7 days" into a number of days?
  - In Python, multiplication is written with a star `*`.
solution: |
  print("Days in 3 weeks:")
  print(3 * 7)
explanation: |
  `3 + 7` adds the numbers (10). We needed 3 groups of 7, which is multiplication: `3 * 7` = 21. Python could not
  warn us - it did exactly what we wrote. That is a logic error.
check:
  expected: |
    Days in 3 weeks:
    21
  forbid_text: ["21"]
```

```exercise
id: fix-three
title: Three bugs in one program
difficulty: challenge
instructions: |
  This program has **three** separate mistakes. Fix them one at a time - run after each fix and read the new
  message. When it is right it prints:

  ```text
  Shopping list:
  apples
  bread
  Items: 2
  ```
starter: |
  print("Shopping list:")
  print("apples"
  print(bread)
  print("Items:", 1 + 2)
hints:
  - The first error is a missing closing bracket on line 2. Syntax errors must be fixed before anything runs.
  - On line 3, `bread` without quote marks makes Python look for a variable called bread.
  - The last one is a logic error - how many items are on the list?
solution: |
  print("Shopping list:")
  print("apples")
  print("bread")
  print("Items:", 1 + 1)
explanation: |
  1. A missing `)` is a syntax error, so nothing ran until it was fixed.
  2. `bread` without quotes is a name, not text → NameError. Text needs quotes.
  3. `1 + 2` gives 3 but there are 2 items - a logic error. `print("Items:", 2)` would also work.
check:
  expected: |
    Shopping list:
    apples
    bread
    Items: 2
```

```quiz
- id: q1
  question: Which kind of error stops a program from running **at all** (no line runs)?
  options:
    - A syntax error
    - A runtime error
    - A logic error
    - None of them
  answer: A syntax error
  explanation: Python checks the grammar of the whole program first. If it finds a syntax error, nothing runs.
- id: q2
  question: A program prints the wrong total but shows no error message. What kind of error is that?
  options:
    - A logic error
    - A syntax error
    - A runtime error
    - It is not an error
  answer: A logic error
  explanation: Logic errors produce wrong results without any message. You find them by checking the output.
- id: q3
  question: When reading a traceback, where should you look first?
  options:
    - The last line, which names the error type and message
    - The first line, "Traceback (most recent call last)"
    - The middle
    - Nowhere - just guess
  answer: The last line, which names the error type and message
  explanation: The last line tells you *what* went wrong; the lines above tell you *where*.
- id: q4
  question: What is the output of this program?
  code: |
    print("A")
    print(1 / 0)
    print("B")
  options:
    - A, then a ZeroDivisionError message (B is never printed)
    - Only the error message
    - A and B, then the error
    - Nothing at all
  answer: A, then a ZeroDivisionError message (B is never printed)
  explanation: Runtime errors stop the program at the failing line. Line 1 already ran; line 3 never runs.
- id: q5
  question: What is the word for finding and fixing mistakes in a program?
  type: text
  answer: ["debugging", "debug"]
  explanation: A mistake is a **bug**; removing bugs is **debugging**.
- id: q6
  question: "The message says `SyntaxError: '(' was never closed` on line 5. Where might the real mistake be?"
  options:
    - On line 5 or a line just before it, where a ( has no matching )
    - Only on line 1
    - In Python itself
    - At the very end of the file only
  answer: On line 5 or a line just before it, where a ( has no matching )
  explanation: Syntax errors are reported where Python got confused, which is at or shortly after the real mistake.
```
