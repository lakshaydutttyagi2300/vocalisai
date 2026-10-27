---
id: py-1-5-arithmetic
title: Arithmetic and operators
track: python
level: 1
order: 5
minutes: 35
summary: Python as a calculator - the seven arithmetic operators, the order of operations, brackets, shortcuts like +=, and string operators.
objectives:
  - Use the arithmetic operators + - * / // % **
  - Predict results using the order of operations and brackets
  - Use // and % to split values (e.g. minutes into hours and minutes)
  - Update variables with += -= *= /=
  - Use + and * with strings
prerequisites: [py-1-4-data-types]
tags: [arithmetic, operator, addition, division, floor division, modulo, remainder, power, precedence, augmented assignment]
---

## Simple explanation

Python is an excellent calculator. The **operators** (symbols that do something with values) are:

| Operator | Meaning | Example | Result |
|---|---|---|---|
| `+` | add | `7 + 2` | `9` |
| `-` | subtract | `7 - 2` | `5` |
| `*` | multiply | `7 * 2` | `14` |
| `/` | divide | `7 / 2` | `3.5` |
| `//` | divide and drop the fraction (floor division) | `7 // 2` | `3` |
| `%` | remainder after division (modulo) | `7 % 2` | `1` |
| `**` | power (exponent) | `7 ** 2` | `49` |

Python follows the usual maths **order of operations**: powers first, then multiplication and division, then
addition and subtraction. **Brackets** `( )` change the order - anything in brackets is worked out first.

```python
print(2 + 3 * 4)     # 14, not 20
print((2 + 3) * 4)   # 20
```

## Real-world analogy

`//` and `%` are like **sharing sweets**. 7 sweets shared between 2 children: each child gets `7 // 2 = 3`
sweets, and `7 % 2 = 1` sweet is left over. Converting 135 minutes to hours works the same way:
`135 // 60 = 2` hours and `135 % 60 = 15` minutes left over.

## Technical definition

- **Operator**: a symbol that combines **operands** (values) into a new value, forming an **expression**.
- **Precedence** (highest first): `**` → unary minus `-x` → `* / // %` → `+ -`. Operators with equal precedence
  are evaluated **left to right** (except `**`, which goes right to left).
- `/` (true division) always returns a `float`. `//` (floor division) rounds **down** to the nearest whole
  number (for negative numbers, "down" means further from zero: `-7 // 2` is `-4`).
- `%` (modulo) returns the remainder; `a == (a // b) * b + a % b` always holds.
- **Augmented assignment** shortcuts: `x += 5` means `x = x + 5`; likewise `-=`, `*=`, `/=`, `//=`, `%=`, `**=`.
- **String operators**: `"ab" + "cd"` → `"abcd"` (concatenation); `"ab" * 3` → `"ababab"` (repetition).
- Dividing by zero raises `ZeroDivisionError`.

## Step-by-step examples

**Example 1 - a shopping bill**

```python
apples = 3 * 40
bread = 55
total = apples + bread
print("Total:", total)
print("Split between 2 people:", total / 2)
```

Output:

```text
Total: 175
Split between 2 people: 87.5
```

**Example 2 - order of operations**

```python
print(10 - 4 / 2)       # 8.0   (division first: 4 / 2 = 2.0, then 10 - 2.0)
print((10 - 4) / 2)     # 3.0   (brackets first)
print(2 ** 3 * 2)       # 16    (power first: 8 * 2)
```

When in doubt, **add brackets** - they make your intention clear to Python *and* to people.

**Example 3 - hours and minutes with // and %**

```python
total_minutes = 135
hours = total_minutes // 60
minutes = total_minutes % 60
print(hours, "hours and", minutes, "minutes")
```

Output: `2 hours and 15 minutes`

**Example 4 - is a number even? (a preview)**

```python
print(10 % 2)   # 0  -> even numbers leave no remainder
print(7 % 2)    # 1  -> odd numbers leave remainder 1
```

**Example 5 - shortcuts for updating**

```python
savings = 1000
savings += 250     # same as savings = savings + 250
savings -= 100     # 1150
savings *= 2       # 2300
print(savings)
```

Output: `2300`

**Example 6 - strings**

```python
line = "-" * 20
print(line)
print("Hip " * 2 + "hooray!")
```

Output:

```text
--------------------
Hip Hip hooray!
```

## Common mistakes

- **Forgetting precedence**: `average = 80 + 90 / 2` gives `125.0`, not `85`. Write `(80 + 90) / 2`.
- **Using `x` for multiply** or `^` for power. Python uses `*` and `**` (`^` means something else entirely).
- **Expecting `/` to give a whole number**: `6 / 3` is `2.0`. Use `//` if you need an int.
- **Dividing by zero** → `ZeroDivisionError`.
- **Floating-point surprises**: `0.1 + 0.2` prints `0.30000000000000004`. This is normal for computers; round
  for display (Level 5).

## Practical application

Arithmetic is everywhere: totals and discounts in a shop, splitting bills, converting units (minutes to hours,
Celsius to Fahrenheit), calculating averages and percentages, checking even/odd numbers, and working out
pages (`items // per_page`). The *expense tracker* and *calculator* projects use these operators heavily.

## Revision notes

- `+ - * /` as in maths; `/` always gives a float.
- `//` floor division (whole part), `%` remainder, `**` power.
- Order: `**`, then `* / // %`, then `+ -`; left to right. **Brackets first** - use them for clarity.
- `x += 1` is short for `x = x + 1` (also `-= *= /=`).
- Strings: `+` joins, `* n` repeats.
- Division by zero → `ZeroDivisionError`.

```exercise
id: bill-split
title: Split the bill
difficulty: beginner
instructions: |
  A restaurant bill is 1200 and 4 friends share it equally. Using the variables provided, calculate each
  person's share with `/`, store it in `share`, and print:

  ```text
  Each person pays: 300.0
  ```
starter: |
  bill = 1200
  people = 4
hints:
  - "`share = bill / people`"
  - "Ordinary division `/` always gives a float, so the answer has `.0`."
solution: |
  bill = 1200
  people = 4
  share = bill / people
  print("Each person pays:", share)
explanation: |
  `/` divides and always produces a float - that is why it prints `300.0` rather than `300`.
check:
  expected: |
    Each person pays: 300.0
  forbid_text: ["300"]
```

```exercise
id: brackets-average
title: The average of two marks
difficulty: beginner
instructions: |
  This program should print the average of 80 and 90, which is `85.0` - but it prints `125.0`.
  Fix the calculation using brackets.
starter: |
  average = 80 + 90 / 2
  print(average)
hints:
  - Division happens before addition. Which part should happen first?
  - Put brackets around the addition.
solution: |
  average = (80 + 90) / 2
  print(average)
explanation: |
  Without brackets Python computes `90 / 2` first and adds 80. Brackets force the addition to happen first:
  `170 / 2 = 85.0`.
check:
  expected: |
    85.0
  require_text: ["("]
```

```exercise
id: hours-minutes
title: Minutes to hours and minutes
difficulty: intermediate
instructions: |
  A film lasts `minutes = 157`. Use `//` and `%` to calculate the hours and remaining minutes, and print:

  ```text
  2 hours 37 minutes
  ```

  Your code must still work if `minutes` is changed - so calculate, don't type 2 or 37.
starter: |
  minutes = 157
hints:
  - "`hours = minutes // 60` gives the whole hours."
  - "`left = minutes % 60` gives the minutes left over."
  - "`print(hours, \"hours\", left, \"minutes\")`"
solution: |
  minutes = 157
  hours = minutes // 60
  left = minutes % 60
  print(hours, "hours", left, "minutes")
explanation: |
  157 // 60 = 2 (whole hours) and 157 % 60 = 37 (the remainder). The same code works for any number of minutes.
check:
  expected: |
    2 hours 37 minutes
  forbid_text: ["37"]
  variants:
    - replace: ["minutes = 157", "minutes = 61"]
      expected: |
        1 hours 1 minutes
    - replace: ["minutes = 157", "minutes = 45"]
      expected: |
        0 hours 45 minutes
```

```exercise
id: compound-savings
title: Savings with shortcuts
difficulty: challenge
instructions: |
  Start with `savings = 500`. Then, **using only augmented assignment operators** (`+=`, `-=`, `*=`):

  1. add 300 (birthday money)
  2. take away 150 (new shoes)
  3. double everything (a lucky bonus)

  Print `savings` at the end. Output:

  ```text
  1300
  ```
starter: |
  savings = 500
hints:
  - "`savings += 300` adds 300."
  - "Doubling is `savings *= 2`."
solution: |
  savings = 500
  savings += 300
  savings -= 150
  savings *= 2
  print(savings)
explanation: |
  500 + 300 = 800, 800 − 150 = 650, 650 × 2 = 1300. Each shortcut reads the current value, changes it and stores
  it back.
check:
  expected: |
    1300
  require_text: ["+=", "-=", "*="]
  forbid_text: ["1300"]
```

```quiz
- id: q1
  question: What is the result of `2 + 3 * 4`?
  type: text
  answer: ["14"]
  explanation: Multiplication happens before addition - 3 × 4 = 12, then 2 + 12 = 14.
- id: q2
  question: What is `17 // 5`?
  type: text
  answer: ["3"]
  explanation: Floor division gives the whole part of 17 ÷ 5 = 3.4, which is 3.
- id: q3
  question: What is `17 % 5`?
  type: text
  answer: ["2"]
  explanation: 5 goes into 17 three times (15), leaving a remainder of 2.
- id: q4
  question: Which operator raises a number to a power (e.g. 2 to the power 3)?
  options:
    - "**"
    - "^"
    - "*"
    - "//"
  answer: "**"
  explanation: "`2 ** 3` is 8. The `^` symbol does something different in Python."
- id: q5
  question: After `x = 10` and `x -= 3`, what is x?
  type: text
  answer: ["7"]
  explanation: "`x -= 3` is short for `x = x - 3`."
- id: q6
  question: What does `print("ab" * 3)` show?
  type: text
  answer: ["ababab"]
  explanation: Multiplying a string by a whole number repeats it.
- id: q7
  question: A number `n` is even when ...
  options:
    - n % 2 is 0
    - n / 2 is 0
    - n // 2 is 1
    - n ** 2 is even
  answer: n % 2 is 0
  explanation: Even numbers leave no remainder when divided by 2.
```
