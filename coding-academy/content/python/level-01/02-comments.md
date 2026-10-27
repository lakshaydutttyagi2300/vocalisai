---
id: py-1-2-comments
title: Comments - notes for humans
track: python
level: 1
order: 2
minutes: 20
summary: How to write notes in your code that Python ignores, why good comments matter, and how to "switch off" a line while testing.
objectives:
  - Write single-line comments with the # symbol
  - Explain why comments are useful and what makes a good comment
  - Temporarily disable code by "commenting it out"
  - Recognise the difference between a comment and text in quotes
prerequisites: [py-1-1-print]
tags: [comment, hash, documentation, readability, commenting out]
---

## Simple explanation

A **comment** is a note you write in your code for **humans** to read. Python completely **ignores** it.

In Python a comment starts with the hash symbol `#`. Everything from `#` to the end of that line is ignored:

```python
# This whole line is a comment
print("Hello")  # This part after the hash is a comment too
```

Why bother writing things that Python ignores? Because code is read by people far more often than it is
written - including **you, in three months**, when you have forgotten why you did something. Comments explain
the *why*.

Comments are also handy for **"commenting out"** a line: putting `#` in front of a line of code switches it off
without deleting it.

## Real-world analogy

Comments are like **pencil notes in the margin of a recipe**: "use less salt - too salty last time" or "the oven
runs hot". The cook (Python) skips them; the next person reading the recipe finds them very useful.

## Technical definition

- A **comment** in Python begins with `#` (when it is not inside a string) and continues to the end of the
  physical line. The interpreter discards comments while reading the code.
- An **inline comment** sits on the same line as code, after it. Convention: two spaces before the `#`, one
  space after it.
- Python has **no special multi-line comment** symbol; you write several lines each starting with `#`.
  (Triple-quoted strings `"""..."""` are sometimes used as notes, but they are strings, not comments - you will
  meet them as *docstrings* in the Functions level.)
- A `#` inside quotes is just a character: `print("#1 fan")` prints `#1 fan`.

## Step-by-step examples

**Example 1 - explaining the purpose of a program**

```python
# Shopping total calculator
# Prices are in pounds; tax is already included.
print("Total:", 3 + 4 + 2)
```

Output: `Total: 9`. The two comment lines produce no output.

**Example 2 - inline comments**

```python
print(60 * 60 * 24)  # seconds in one day
```

Output: `86400`. The comment explains a "magic" calculation that would otherwise be puzzling.

**Example 3 - commenting out code while testing**

```python
print("Step 1")
# print("Step 2 - temporarily switched off")
print("Step 3")
```

Output:

```text
Step 1
Step 3
```

**Example 4 - a hash inside a string is not a comment**

```python
print("Use # for comments")  # but this one is a real comment
```

Output: `Use # for comments`

**What makes a good comment?**

| Weak comment | Better comment |
|---|---|
| `x = 5  # set x to 5` (repeats the code) | `x = 5  # five attempts before the account locks` (explains why) |
| `# loop` | `# check every order until we find an unpaid one` |

Good comments explain **why** or give **context**. They do not repeat what the code obviously says.

## Common mistakes

- **Forgetting the `#`**, so Python tries to run your English sentence → SyntaxError.
- **Using `//` (from other languages).** In Python, `//` is integer division, not a comment.
- **Leaving out-of-date comments.** A comment that no longer matches the code is worse than no comment - update
  comments when you change code.
- **Commenting every single line.** Too many obvious comments make code *harder* to read.

## Practical application

In real projects, comments explain business rules ("orders over 100 get free delivery"), warn about traps
("this API sometimes returns empty data"), and mark unfinished work (`# TODO: handle refunds`). In this course,
writing a short comment explaining your solution is a great way to check you really understand it.

## Revision notes

- `#` starts a comment; Python ignores everything after it on that line.
- Comments are for humans: explain **why**, not what.
- Inline comment: `code  # note` (two spaces before `#`).
- Put `#` in front of a code line to **comment it out** (switch it off without deleting).
- `#` inside quotes is just a normal character.
- No special multi-line comment: start each line with `#`.

```exercise
id: add-comment
title: Add a comment
difficulty: beginner
instructions: |
  Add a **comment** on the first line explaining what the program does (any text you like, starting with `#`).
  Keep the print line so the program still prints:

  ```text
  Welcome!
  ```
starter: |
  print("Welcome!")
hints:
  - A comment starts with the `#` symbol, for example `# My greeting program`.
  - Put it on its own line above the print line.
solution: |
  # A program that greets the user
  print("Welcome!")
explanation: |
  The comment line is ignored by Python, so the output is unchanged - but anyone reading the code now knows its
  purpose.
check:
  expected: |
    Welcome!
  requires: [comment]
```

```exercise
id: comment-out
title: Switch a line off
difficulty: beginner
instructions: |
  The program prints three lines. **Comment out** the middle line (do not delete it!) so that the output is:

  ```text
  Breakfast
  Dinner
  ```
starter: |
  print("Breakfast")
  print("Lunch")
  print("Dinner")
hints:
  - Put a `#` at the very start of the line you want to switch off.
solution: |
  print("Breakfast")
  # print("Lunch")
  print("Dinner")
explanation: |
  With `#` in front, the whole line becomes a comment, so Python skips it. The code is still there if you want
  to switch it back on later by removing the `#`.
check:
  expected: |
    Breakfast
    Dinner
  require_text: ['Lunch']
```

```exercise
id: hash-in-text
title: A hash that is not a comment
difficulty: intermediate
instructions: |
  Write a program that prints exactly the line below, **and** has an inline comment (a `#` comment after the
  code, on the same line) saying anything you like:

  ```text
  Ticket #42 is ready
  ```
starter: |
  # write your code below

hints:
  - The `#` inside the quote marks is just text, so it will be printed.
  - After the closing bracket, add two spaces and then your comment, e.g. `  # show the ticket`.
solution: |
  print("Ticket #42 is ready")  # message shown on the screen
explanation: |
  The first `#` is inside the string, so it is printed. The second `#` is outside the string, so it starts a
  comment.
check:
  expected: |
    Ticket #42 is ready
  requires: [inline-comment]
```

```exercise
id: explain-why
title: Comments that explain why
difficulty: challenge
instructions: |
  This program works, but the numbers are mysterious. Add a comment **above each print line** explaining what
  the number means (use the hints if you are not sure). The output must stay:

  ```text
  604800
  1440
  ```
starter: |
  print(7 * 24 * 60 * 60)
  print(24 * 60)
hints:
  - "7 days × 24 hours × 60 minutes × 60 seconds is the number of seconds in ... ?"
  - "24 hours × 60 minutes is the number of minutes in ... ?"
solution: |
  # seconds in one week: 7 days x 24 hours x 60 minutes x 60 seconds
  print(7 * 24 * 60 * 60)
  # minutes in one day: 24 hours x 60 minutes
  print(24 * 60)
explanation: |
  These comments explain *why* the calculation looks the way it does. Six months from now, you will thank
  yourself.
check:
  expected: |
    604800
    1440
  min_comments: 2
```

```quiz
- id: q1
  question: What does Python do with a comment?
  options:
    - It ignores it completely
    - It prints it
    - It runs it as code
    - It shows an error
  answer: It ignores it completely
  explanation: Comments are only for humans reading the code.
- id: q2
  question: Which symbol starts a comment in Python?
  type: text
  answer: ["#"]
  explanation: The hash `#` starts a comment that lasts until the end of the line.
- id: q3
  question: What does this print?
  code: |
    print("Hello")  # print("Goodbye")
  options:
    - Hello
    - Goodbye
    - Hello and Goodbye
    - Nothing
  answer: Hello
  explanation: Everything after the `#` (outside quotes) is a comment, including the second print.
- id: q4
  question: What does this print?
  code: |
    print("Use # carefully")
  type: text
  answer: ["Use # carefully"]
  explanation: A `#` inside quote marks is part of the text, not a comment.
- id: q5
  question: Which is the most useful comment?
  options:
    - "total = price * 1.2  # add 20% sales tax"
    - "total = price * 1.2  # multiply price by 1.2"
    - "total = price * 1.2  # total"
    - "total = price * 1.2  # code"
  answer: "total = price * 1.2  # add 20% sales tax"
  explanation: Good comments explain *why* (the business reason), not just repeat the code.
- id: q6
  question: What does "commenting out" a line mean?
  options:
    - Putting # in front of it so it does not run, without deleting it
    - Deleting the line
    - Printing the line
    - Moving the line to the end
  answer: Putting # in front of it so it does not run, without deleting it
  explanation: It is a quick way to switch code off while testing.
```
