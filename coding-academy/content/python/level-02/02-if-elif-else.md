---
id: py-2-2-if-elif-else
title: Making decisions with if, elif and else
track: python
level: 2
order: 2
minutes: 40
summary: Let your program choose what to do - if statements, indented blocks, else for "otherwise", and elif for several options.
objectives:
  - Write an if statement that runs code only when a condition is True
  - Indent blocks correctly with 4 spaces
  - Add an else branch for the "otherwise" case
  - Chain several options with elif and predict which branch runs
prerequisites: [py-2-1-true-false]
tags: [if, elif, else, condition, block, indentation, branch, decision]
---

## Simple explanation

Until now, programs ran every line from top to bottom. With `if`, a program can **decide** whether to run
some lines:

```python
temperature = 32
if temperature > 30:
    print("It's hot - drink water!")
print("Have a nice day")
```

Read it as: *"If the temperature is greater than 30, then print the warning."* The indented line only runs when
the condition is `True`. The last line is **not** indented, so it always runs.

Add **`else`** for what to do *otherwise*:

```python
if temperature > 30:
    print("Hot")
else:
    print("Not hot")
```

Use **`elif`** ("else if") to check more options in order:

```python
if temperature > 30:
    print("Hot")
elif temperature > 15:
    print("Mild")
else:
    print("Cold")
```

Python checks the conditions **from top to bottom** and runs **only the first branch** whose condition is True.

## Real-world analogy

A road sign at a junction: *"If you are going to the airport, turn left. Otherwise, if you are going to the
city centre, go straight. Otherwise, turn right."* You take **exactly one** route - the first that matches.

## Technical definition

- **`if` statement** syntax:

  ```text
  if condition:
      block
  elif other_condition:
      block
  else:
      block
  ```

- The header line ends with a **colon** `:`.
- A **block** is one or more lines indented by the **same** amount (convention: 4 spaces). The block ends when
  the indentation returns to the previous level.
- `elif` and `else` are optional. There can be many `elif`s but at most one `else`, which must come last.
- Exactly zero or one branch runs: the first whose condition is truthy, or `else` if none is.
- The condition can be any expression; Python uses its truth value (so `if name:` means "if name is not empty").

## Step-by-step examples

**Example 1 - only if** (Input: `5`)

```python
stock = int(input("Items in stock: "))
if stock < 10:
    print("Warning: low stock!")
    print("Please reorder.")
print("Check finished.")
```

Output:

```text
Items in stock: 5
Warning: low stock!
Please reorder.
Check finished.
```

With input `50`, only `Check finished.` is printed after the prompt - both indented lines are skipped.

**Example 2 - if / else** (Input: `7`)

```python
number = int(input("Number: "))
if number % 2 == 0:
    print(number, "is even")
else:
    print(number, "is odd")
```

Output: `Number: 7` then `7 is odd`.

**Example 3 - grades with elif** (Input: `72`)

```python
score = int(input("Score: "))
if score >= 85:
    grade = "A"
elif score >= 70:
    grade = "B"
elif score >= 55:
    grade = "C"
else:
    grade = "F"
print("Grade:", grade)
```

Output: `Score: 72` then `Grade: B`. 72 fails `>= 85`, passes `>= 70` → B. Python stops checking there, even
though 72 is also `>= 55`. **Order matters**: put the strictest test first.

**Example 4 - truthiness** (Input: empty line)

```python
name = input("Your name (optional): ")
if name:
    print("Hello,", name)
else:
    print("Hello, stranger")
```

An empty answer is falsy, so the `else` branch runs.

## Common mistakes

- **Missing colon** at the end of `if`, `elif` or `else` → SyntaxError.
- **Wrong indentation**: forgetting to indent the block (IndentationError) or indenting a line that should
  always run.
- **Using `=` instead of `==`**: `if age = 18:` is a SyntaxError.
- **Wrong order of elif**: checking `score >= 55` before `score >= 85` means nobody ever gets an A.
- **`else` with a condition**: `else age < 18:` is invalid - use `elif` for conditions.
- **Comparing strings to numbers from input**: convert with `int()` first.

## Practical application

Decisions are everywhere: free delivery when the basket is over a limit, different messages for logged-in and
guest users, tax brackets, game rules, input validation ("if the email has no @, show an error"). The
calculator, quiz and number-guessing projects all depend on `if`/`elif`/`else`.

## Revision notes

- `if condition:` + indented block → runs only when the condition is True.
- `else:` → runs when no earlier condition was True. `elif condition:` → another option, checked in order.
- Only the **first** True branch runs. Put the most specific/strict condition first.
- Header lines end with `:`; blocks are indented 4 spaces; the block ends when indentation goes back.
- `if text:` is True when the text is not empty.

```exercise
id: positive-check
title: Positive or not?
difficulty: beginner
instructions: |
  Ask `Number: ` (a whole number). If it is greater than 0, print `Positive`; otherwise print `Not positive`.

  ```text
  Number: 5
  Positive
  ```
starter: |
  number = int(input("Number: "))
hints:
  - "`if number > 0:` followed by an indented print."
  - "Then `else:` (with a colon) and another indented print."
solution: |
  number = int(input("Number: "))
  if number > 0:
      print("Positive")
  else:
      print("Not positive")
explanation: |
  Exactly one branch runs: the `if` block when the condition is True, the `else` block otherwise. Zero is not
  greater than 0, so it counts as "Not positive".
stdin: "5"
check:
  cases:
    - stdin: "5"
      expected: |
        Number: 5
        Positive
    - stdin: "0"
      expected: |
        Number: 0
        Not positive
    - stdin: "-3"
      expected: |
        Number: -3
        Not positive
  requires: [if, else]
```

```exercise
id: free-delivery
title: Free delivery
difficulty: beginner
instructions: |
  Delivery costs 5, but it is free when the basket total is **50 or more**. Ask `Basket total: ` (it may have
  decimals) and print the delivery cost:

  ```text
  Basket total: 62.5
  Delivery: free
  ```

  For totals under 50 print `Delivery: 5`.
starter: |
  total = float(input("Basket total: "))
hints:
  - "50 itself should be free, so use `>=`."
  - "`if total >= 50:` → print `Delivery: free`, else print `Delivery: 5`."
solution: |
  total = float(input("Basket total: "))
  if total >= 50:
      print("Delivery: free")
  else:
      print("Delivery: 5")
explanation: |
  `>=` includes exactly 50. Using `float` allows totals such as 49.99.
stdin: "62.5"
check:
  cases:
    - stdin: "62.5"
      expected: |
        Basket total: 62.5
        Delivery: free
    - stdin: "50"
      expected: |
        Basket total: 50
        Delivery: free
    - stdin: "49.99"
      expected: |
        Basket total: 49.99
        Delivery: 5
```

```exercise
id: grade-calculator
title: Grade calculator
difficulty: intermediate
instructions: |
  Ask `Score: ` (0-100) and print the grade:

  | Score | Grade |
  |---|---|
  | 85 or more | A |
  | 70-84 | B |
  | 55-69 | C |
  | 40-54 | D |
  | below 40 | F |

  ```text
  Score: 77
  Grade: B
  ```
starter: |
  score = int(input("Score: "))
hints:
  - Check from the highest grade down - `if score >= 85:` first.
  - "Use `elif` for B, C and D, and `else` for F."
solution: |
  score = int(input("Score: "))
  if score >= 85:
      print("Grade: A")
  elif score >= 70:
      print("Grade: B")
  elif score >= 55:
      print("Grade: C")
  elif score >= 40:
      print("Grade: D")
  else:
      print("Grade: F")
explanation: |
  Because conditions are checked top-down and only the first True branch runs, `score >= 70` only needs to check
  the lower limit - anything 85+ was already caught by the first branch.
stdin: "77"
check:
  cases:
    - {stdin: "77", expected: "Score: 77\nGrade: B\n"}
    - {stdin: "85", expected: "Score: 85\nGrade: A\n"}
    - {stdin: "84", expected: "Score: 84\nGrade: B\n"}
    - {stdin: "55", expected: "Score: 55\nGrade: C\n"}
    - {stdin: "40", expected: "Score: 40\nGrade: D\n"}
    - {stdin: "39", expected: "Score: 39\nGrade: F\n"}
  requires: [elif]
```

```exercise
id: ticket-price
title: Cinema ticket prices
difficulty: challenge
instructions: |
  Ticket prices depend on age: under 3 → `0`, 3-15 → `7`, 16-64 → `12`, 65 and over → `8`.
  Ask `Age: ` and print the price. Then, as a separate decision, if the age is exactly 18 also print
  `Happy 18th - enjoy your first adult ticket!`

  ```text
  Age: 18
  Price: 12
  Happy 18th - enjoy your first adult ticket!
  ```
starter: |
  age = int(input("Age: "))
hints:
  - "Use one if/elif/else chain for the price: `if age < 3:` ... `elif age < 16:` ... `elif age < 65:` ... `else:`"
  - "The birthday message is a separate `if age == 18:` after the chain (not part of it)."
solution: |
  age = int(input("Age: "))
  if age < 3:
      print("Price: 0")
  elif age < 16:
      print("Price: 7")
  elif age < 65:
      print("Price: 12")
  else:
      print("Price: 8")
  if age == 18:
      print("Happy 18th - enjoy your first adult ticket!")
explanation: |
  The chain picks exactly one price. The birthday check is a *separate* `if`, so it is evaluated independently -
  if it were an `elif` in the chain it would never run for 18 (the price branch already matched).
stdin: "18"
check:
  cases:
    - {stdin: "18", expected: "Age: 18\nPrice: 12\nHappy 18th - enjoy your first adult ticket!\n"}
    - {stdin: "2", expected: "Age: 2\nPrice: 0\n"}
    - {stdin: "3", expected: "Age: 3\nPrice: 7\n"}
    - {stdin: "15", expected: "Age: 15\nPrice: 7\n"}
    - {stdin: "16", expected: "Age: 16\nPrice: 12\n"}
    - {stdin: "64", expected: "Age: 64\nPrice: 12\n"}
    - {stdin: "65", expected: "Age: 65\nPrice: 8\n"}
```

```quiz
- id: q1
  question: What does this print when x is 10?
  code: |
    if x > 5:
        print("big")
    print("done")
  options:
    - "big, then done on the next line"
    - Only done
    - Only big
    - Nothing
  answer: "big, then done on the next line"
  explanation: The condition is True, so the indented print runs. The last line is not indented, so it always runs.
- id: q2
  question: What does this print when score is 90?
  code: |
    if score >= 50:
        print("pass")
    elif score >= 85:
        print("excellent")
  type: text
  answer: ["pass"]
  explanation: The first True condition wins (90 >= 50). The elif is never checked - order matters!
- id: q3
  question: Which line is correct Python?
  options:
    - "if age >= 18:"
    - "if age >= 18"
    - "if (age >= 18) then:"
    - "if age => 18:"
  answer: "if age >= 18:"
  explanation: An if line needs a condition followed by a colon. `=>` is not a Python operator.
- id: q4
  question: How many branches of an if / elif / else chain can run at most?
  type: text
  answer: ["1", "one"]
  explanation: Exactly one branch runs - the first whose condition is True, or else.
- id: q5
  question: When does the else block run?
  options:
    - When none of the if/elif conditions above it were True
    - Always
    - When the if condition was True
    - Never
  answer: When none of the if/elif conditions above it were True
  explanation: else is the "otherwise" case.
- id: q6
  question: What does `if name:` check when name is a string?
  options:
    - Whether the string is not empty
    - Whether the string equals "name"
    - Whether the variable exists
    - Nothing - it is an error
  answer: Whether the string is not empty
  explanation: Non-empty strings are truthy; the empty string "" is falsy.
```
