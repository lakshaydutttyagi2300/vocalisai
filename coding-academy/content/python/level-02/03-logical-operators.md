---
id: py-2-3-logical-operators
title: Combining conditions - and, or, not, and nested decisions
track: python
level: 2
order: 3
minutes: 40
summary: Build richer decisions with and, or and not, nest if statements inside each other, and avoid the classic conditional mistakes.
objectives:
  - Combine conditions with and, or and not
  - Predict results using truth tables
  - Write nested if statements and know when to flatten them
  - Avoid common mistakes such as `x == 1 or 2`
prerequisites: [py-2-2-if-elif-else]
tags: [and, or, not, logical operator, nested if, truth table, short-circuit]
---

## Simple explanation

Real decisions often depend on **more than one thing**:

- **`and`** - *both* must be True: "You can rent a car if you are 21+ **and** have a licence."
- **`or`** - *at least one* must be True: "Entry is free for children **or** students."
- **`not`** - flips True ↔ False: "Show the login button if the user is **not** logged in."

```python
age = 25
has_licence = True
if age >= 21 and has_licence:
    print("You can rent a car")
```

You can also put an `if` **inside** another `if` - a **nested** decision:

```python
if has_ticket:
    if age >= 18:
        print("Enjoy the film")
    else:
        print("This film is 18+")
else:
    print("Please buy a ticket first")
```

## Real-world analogy

- `and` is like a **door with two locks**: it opens only when *both* keys are turned.
- `or` is like a **house with two doors**: you get in if *either* is open.
- `not` is like a "**do not**" sign: it reverses the meaning.
- Nested ifs are like a **security check followed by a ticket check** - you only reach the second check if you
  passed the first.

## Technical definition

**Truth tables**

| A | B | `A and B` | `A or B` |
|---|---|---|---|
| True | True | True | True |
| True | False | False | True |
| False | True | False | True |
| False | False | False | False |

`not True` → `False`; `not False` → `True`.

- **Precedence**: `not` binds tightest, then `and`, then `or`. So `a or b and c` means `a or (b and c)`. Use
  brackets to make your meaning obvious.
- **Short-circuit evaluation**: in `A and B`, if `A` is False, Python does not evaluate `B` (the answer is
  already False). In `A or B`, if `A` is True, `B` is skipped. This lets you write safe checks like
  `count != 0 and total / count > 5`.
- **Nesting**: a block can contain any statements, including another `if`. Each level adds 4 spaces of
  indentation.

## Step-by-step examples

**Example 1 - and**

```python
temperature = 24
raining = False
if temperature > 20 and not raining:
    print("Picnic time!")
```

Output: `Picnic time!` - both parts are True (`not False` is True).

**Example 2 - or** (Input: `sat`)

```python
day = input("Day (mon-sun): ")
if day == "sat" or day == "sun":
    print("Weekend!")
else:
    print("Weekday")
```

Output: `Day (mon-sun): sat` then `Weekend!`

**Example 3 - the classic mistake**

```python
day = "mon"
if day == "sat" or "sun":
    print("Weekend!")
```

This prints `Weekend!` even for Monday! Python reads it as `(day == "sat") or ("sun")`, and `"sun"` is a
non-empty string - **truthy**. Each side of `or` must be a full condition: `day == "sat" or day == "sun"`.
(Or use membership: `day in ("sat", "sun")` - you will learn tuples in Level 4.)

**Example 4 - nested vs combined** (age 20, member)

```python
age = 20
member = True
if age >= 18:
    if member:
        print("Member price")
    else:
        print("Adult price")
else:
    print("Child price")
```

Output: `Member price`. The same logic could be flattened with `and`, but nesting is clearer here because each
outer branch has its own inner choices.

**Example 5 - safe division with short-circuit**

```python
count = 0
total = 50
if count > 0 and total / count > 10:
    print("High average")
else:
    print("No data or low average")
```

Output: `No data or low average`. Because `count > 0` is False, Python never evaluates `total / count`, so there
is no ZeroDivisionError.

## Common mistakes

- **`x == 1 or 2`** - always truthy. Write `x == 1 or x == 2`.
- **Mixing `and`/`or` without brackets**: `a or b and c` may not mean what you think. Add brackets.
- **Too deep nesting** - more than 2-3 levels is hard to read; combine conditions with `and` or use `elif`.
- **Using `&` and `|`** from other languages for logic - in Python use the words `and`, `or`, `not`.
- **Double negatives**: `if not not_ready:` - rename the variable to something positive (`ready`).

## Practical application

Access rules (logged in **and** has permission), discounts (student **or** senior), validation (input is
**not** empty **and** contains "@"), and game logic (lives > 0 **and not** game_over) all use these operators.
The quiz project uses them to accept several spellings of an answer.

## Revision notes

- `and`: both True. `or`: at least one True. `not`: reverses.
- Order: `not` → `and` → `or`. Use brackets for clarity.
- Short-circuit: `and` stops at the first False, `or` at the first True.
- Each side of `or`/`and` must be a complete condition: `x == 1 or x == 2`.
- Nested `if`: indent one more level for each layer; keep it shallow.

```exercise
id: car-rental
title: Car rental rules
difficulty: beginner
instructions: |
  A customer can rent a car if they are **21 or older AND have a licence**. Ask two questions:
  `Age: ` (a number) and `Licence (yes/no): `. Print `Can rent` or `Cannot rent`.

  ```text
  Age: 25
  Licence (yes/no): yes
  Can rent
  ```
starter: |
  age = int(input("Age: "))
  licence = input("Licence (yes/no): ")
hints:
  - "The licence answer is text, so compare it: `licence == \"yes\"`."
  - "`if age >= 21 and licence == \"yes\":`"
solution: |
  age = int(input("Age: "))
  licence = input("Licence (yes/no): ")
  if age >= 21 and licence == "yes":
      print("Can rent")
  else:
      print("Cannot rent")
explanation: |
  `and` requires both conditions. A 25-year-old without a licence, or a 19-year-old with one, cannot rent.
stdin: |
  25
  yes
check:
  cases:
    - {stdin: "25\nyes\n", expected: "Age: 25\nLicence (yes/no): yes\nCan rent\n"}
    - {stdin: "25\nno\n", expected: "Age: 25\nLicence (yes/no): no\nCannot rent\n"}
    - {stdin: "19\nyes\n", expected: "Age: 19\nLicence (yes/no): yes\nCannot rent\n"}
    - {stdin: "21\nyes\n", expected: "Age: 21\nLicence (yes/no): yes\nCan rent\n"}
  require_text: [" and "]
```

```exercise
id: weekend-fix
title: Fix the weekend bug
difficulty: beginner
instructions: |
  This program says "Weekend" for every day - the classic `or` mistake. Fix the condition.

  ```text
  Day: tue
  Weekday
  ```
starter: |
  day = input("Day: ")
  if day == "sat" or "sun":
      print("Weekend")
  else:
      print("Weekday")
hints:
  - '`"sun"` on its own is a non-empty string - always truthy.'
  - 'Both sides of `or` must be complete comparisons: `day == "sat" or day == "sun"`.'
solution: |
  day = input("Day: ")
  if day == "sat" or day == "sun":
      print("Weekend")
  else:
      print("Weekday")
explanation: |
  Python evaluated `(day == "sat") or "sun"`; the string "sun" is truthy, so the condition was always True.
  Writing the full comparison on both sides fixes it.
stdin: "tue"
check:
  cases:
    - {stdin: "tue", expected: "Day: tue\nWeekday\n"}
    - {stdin: "sat", expected: "Day: sat\nWeekend\n"}
    - {stdin: "sun", expected: "Day: sun\nWeekend\n"}
```

```exercise
id: leap-year
title: Leap years
difficulty: intermediate
instructions: |
  A year is a leap year if it is divisible by 4, **except** years divisible by 100 are not - **unless** they are
  also divisible by 400. (So 2024 is, 1900 is not, 2000 is.)

  Ask `Year: ` and print `Leap year` or `Not a leap year`.
starter: |
  year = int(input("Year: "))
hints:
  - "\"Divisible by 4\" means `year % 4 == 0`."
  - "One way: `(year % 4 == 0 and year % 100 != 0) or year % 400 == 0`"
solution: |
  year = int(input("Year: "))
  if (year % 4 == 0 and year % 100 != 0) or year % 400 == 0:
      print("Leap year")
  else:
      print("Not a leap year")
explanation: |
  The brackets group the "divisible by 4 but not by 100" rule; `or year % 400 == 0` adds the exception to the
  exception. Testing 2024, 1900, 2000 and 2023 covers every case.
stdin: "2024"
check:
  cases:
    - {stdin: "2024", expected: "Year: 2024\nLeap year\n"}
    - {stdin: "1900", expected: "Year: 1900\nNot a leap year\n"}
    - {stdin: "2000", expected: "Year: 2000\nLeap year\n"}
    - {stdin: "2023", expected: "Year: 2023\nNot a leap year\n"}
```

```exercise
id: login-nested
title: A login with nested checks
difficulty: challenge
instructions: |
  The correct username is `admin` and the password is `pa55word`. Ask `Username: ` and then `Password: `.

  - If the username is wrong, print `Unknown user`.
  - If the username is right but the password is wrong, print `Wrong password`.
  - If both are right, print `Welcome, admin!`

  Use a **nested** `if` (an if inside another if).

  ```text
  Username: admin
  Password: pa55word
  Welcome, admin!
  ```
starter: |
  username = input("Username: ")
  password = input("Password: ")
hints:
  - "Outer check: `if username == \"admin\":` ... `else: print(\"Unknown user\")`"
  - "Inside the outer if (indented one more level), check the password with its own if/else."
solution: |
  username = input("Username: ")
  password = input("Password: ")
  if username == "admin":
      if password == "pa55word":
          print("Welcome, admin!")
      else:
          print("Wrong password")
  else:
      print("Unknown user")
explanation: |
  The inner if is only reached when the username is correct, which lets us give a specific message for each
  situation. (Real systems usually show one vague message for both cases, to avoid helping attackers guess
  usernames.)
stdin: |
  admin
  pa55word
check:
  cases:
    - {stdin: "admin\npa55word\n", expected: "Username: admin\nPassword: pa55word\nWelcome, admin!\n"}
    - {stdin: "admin\nguess\n", expected: "Username: admin\nPassword: guess\nWrong password\n"}
    - {stdin: "bob\npa55word\n", expected: "Username: bob\nPassword: pa55word\nUnknown user\n"}
  requires: [nested-if]
```

```quiz
- id: q1
  question: What is `True and False`?
  type: text
  answer: ["False"]
  explanation: and needs both sides to be True.
- id: q2
  question: What is `True or False`?
  type: text
  answer: ["True"]
  explanation: or needs at least one side to be True.
- id: q3
  question: What is `not (5 > 3)`?
  type: text
  answer: ["False"]
  explanation: 5 > 3 is True, and not flips it to False.
- id: q4
  question: Why does `if colour == "red" or "blue":` always run its block?
  options:
    - Because "blue" on its own is a non-empty string, which is truthy
    - Because colour is always red
    - Because or always returns True
    - It does not - it is an error
  answer: Because "blue" on its own is a non-empty string, which is truthy
  explanation: Each side must be a full comparison - `colour == "red" or colour == "blue"`.
- id: q5
  question: In `count > 0 and total / count > 5`, what happens when count is 0?
  options:
    - Python stops after count > 0 is False, so no division by zero happens
    - ZeroDivisionError
    - It prints 5
    - SyntaxError
  answer: Python stops after count > 0 is False, so no division by zero happens
  explanation: Short-circuit evaluation - and stops at the first False.
- id: q6
  question: Which is evaluated first in `a or b and c`?
  options:
    - "b and c"
    - "a or b"
    - It is an error
    - Left to right, a or b first
  answer: "b and c"
  explanation: and has higher precedence than or, so it means a or (b and c). Use brackets to be clear.
```
