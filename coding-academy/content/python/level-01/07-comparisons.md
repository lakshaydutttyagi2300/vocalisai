---
id: py-1-7-comparisons
title: Basic comparisons - asking True/False questions
track: python
level: 1
order: 7
minutes: 25
summary: Compare values with ==, !=, <, >, <= and >=, and understand that every comparison produces True or False.
objectives:
  - Use the six comparison operators
  - Predict whether a comparison is True or False
  - Explain the difference between = (assign) and == (compare)
  - Store the result of a comparison in a variable
prerequisites: [py-1-4-data-types, py-1-6-input-and-conversion]
tags: [comparison, equal, not equal, greater than, less than, boolean, True, False]
---

## Simple explanation

Programs constantly ask **yes/no questions**: *Is the password correct? Is the basket empty? Is the user over 18?*
In Python you ask these questions with **comparison operators**. The answer is always a **boolean**: `True` or
`False`.

| Operator | Question | Example | Result |
|---|---|---|---|
| `==` | equal to? | `5 == 5` | `True` |
| `!=` | not equal to? | `5 != 3` | `True` |
| `<` | less than? | `3 < 5` | `True` |
| `>` | greater than? | `3 > 5` | `False` |
| `<=` | less than or equal to? | `5 <= 5` | `True` |
| `>=` | greater than or equal to? | `4 >= 5` | `False` |

The most important thing to remember: **one `=` stores a value; two `==` compares two values.**

In the next level (*Making decisions*) you will use these answers to let your program choose what to do.

## Real-world analogy

A comparison is like a **yes/no question on a form**: "Are you 18 or older?" The answer is only ever *yes* or
*no*. Python's version of yes and no is `True` and `False`.

## Technical definition

- **Comparison operators** take two operands and return a `bool`.
- `==` tests **equality of value**: `5 == 5.0` is `True` (same number, different types). `"5" == 5` is `False`
  (text is never equal to a number).
- Strings are compared **character by character** using their Unicode code points ("dictionary order", but all
  capital letters come before all lower-case letters): `"apple" < "banana"` is `True`, `"Zebra" < "apple"` is
  also `True`.
- Comparisons are case-sensitive: `"Yes" == "yes"` is `False`.
- Comparing incompatible types with `<` or `>` (e.g. `"5" < 7`) raises `TypeError`. `==` and `!=` never raise -
  they just return `False`/`True`.
- Comparisons can be **chained**: `0 < x < 10` means `0 < x and x < 10`.

## Step-by-step examples

**Example 1 - numbers**

```python
print(10 > 3)
print(10 == 3)
print(10 != 3)
print(7 <= 7)
```

Output:

```text
True
False
True
True
```

**Example 2 - storing the answer**

```python
age = 20
is_adult = age >= 18
print("Adult?", is_adult)
print(type(is_adult))
```

Output:

```text
Adult? True
<class 'bool'>
```

**Example 3 - text comparisons**

```python
password = "Secret123"
print(password == "secret123")
print("cat" < "dog")
```

Output:

```text
False
True
```

The first is `False` because capital `S` and lower-case `s` are different characters.

**Example 4 - the input trap** (Input box: `18`)

```python
age = input("Age: ")
print(age == 18)
```

Output: `Age: 18` then `False`! The input is the *string* `"18"`, and text never equals a number. Convert first:
`age = int(input("Age: "))` - then `age == 18` is `True`.

**Example 5 - chained comparison**

```python
temperature = 22
print(18 <= temperature <= 25)   # is it comfortable?
```

Output: `True`

## Common mistakes

- **Using `=` instead of `==`** inside a question: `print(x = 5)` is an error; you meant `print(x == 5)`.
- **Comparing a string with a number**: `"18" == 18` is `False`. Convert input with `int()`.
- **Case differences**: `"London" == "london"` is `False`. (Level 5 shows `.lower()` to fix this.)
- **Writing `=>` or `=<`**: the correct operators are `>=` and `<=`.
- **Writing `true`/`false`** in lower case - booleans are `True`/`False`.

## Practical application

Comparisons are the questions behind every decision: checking a password, giving a discount when the total is
over 100, warning when stock is below a reorder level, ending a game when lives reach 0. You will use them in
every level from now on.

## Revision notes

- `==` equal, `!=` not equal, `<` `>` `<=` `>=` - each gives `True` or `False`.
- `=` assigns; `==` compares.
- Text vs number: `"18" == 18` is `False` - convert input first.
- String comparisons are case-sensitive and follow character order.
- Store results: `is_adult = age >= 18`.
- Chain: `0 < x < 10`.

```exercise
id: compare-print
title: True or False?
difficulty: beginner
instructions: |
  Write a program with three print lines that print the results of these comparisons, in this order:

  1. is 15 greater than 9?
  2. is 4 equal to 4.0?
  3. is "cat" not equal to "Cat"?

  The output must be:

  ```text
  True
  True
  True
  ```
starter: |
  print(15 > 9)
hints:
  - "Equality uses two equals signs: `4 == 4.0`."
  - "Not equal is `!=`."
solution: |
  print(15 > 9)
  print(4 == 4.0)
  print("cat" != "Cat")
explanation: |
  4 and 4.0 are equal in value. "cat" and "Cat" differ in their first character, so they are not equal - the
  `!=` comparison is True.
check:
  expected: |
    True
    True
    True
  require_text: ["==", "!="]
```

```exercise
id: can-vote
title: Can they vote?
difficulty: beginner
instructions: |
  Ask for an age with the prompt `Age: `, convert it to an integer, and print whether the person can vote
  (18 or older) like this - for input `20`:

  ```text
  Age: 20
  Can vote: True
  ```
starter: |
  age = input("Age: ")
  print("Can vote:", age >= 18)
hints:
  - The starter crashes with a TypeError - input gives a string. Convert it with `int(...)`.
  - "18 should count as old enough, so use `>=` not `>`."
solution: |
  age = int(input("Age: "))
  print("Can vote:", age >= 18)
explanation: |
  After `int()`, `age` is a number and can be compared with 18. `>=` makes exactly 18 count as True.
stdin: "20"
check:
  cases:
    - stdin: "20"
      expected: |
        Age: 20
        Can vote: True
    - stdin: "18"
      expected: |
        Age: 18
        Can vote: True
    - stdin: "17"
      expected: |
        Age: 17
        Can vote: False
```

```exercise
id: password-check
title: Password check
difficulty: intermediate
instructions: |
  The correct password is stored in `secret`. Ask the user `Password: ` and store whether their answer matches
  in a variable called `correct`, then print it. For the input `open sesame`:

  ```text
  Password: open sesame
  Access granted: True
  ```
starter: |
  secret = "open sesame"
hints:
  - "`guess = input(\"Password: \")`"
  - "`correct = guess == secret` stores True or False."
solution: |
  secret = "open sesame"
  guess = input("Password: ")
  correct = guess == secret
  print("Access granted:", correct)
explanation: |
  `guess == secret` produces a boolean, which is stored in `correct`. No conversion is needed: both are strings.
stdin: "open sesame"
check:
  cases:
    - stdin: "open sesame"
      expected: |
        Password: open sesame
        Access granted: True
    - stdin: "Open Sesame"
      expected: |
        Password: Open Sesame
        Access granted: False
  tests:
    - name: a boolean variable called correct exists
      code: |
        assert isinstance(correct, bool), "correct should be True or False"
```

```exercise
id: comfortable
title: Comfortable temperature (chained comparison)
difficulty: challenge
instructions: |
  A room is comfortable when the temperature is from 18 up to and including 24. Ask `Temperature: ` (a whole
  number) and print `Comfortable: True` or `Comfortable: False` using **one chained comparison**.

  For input `21`:

  ```text
  Temperature: 21
  Comfortable: True
  ```
starter: |
  temperature = int(input("Temperature: "))
hints:
  - "A chained comparison looks like `low <= value <= high`."
  - Both ends are included, so use `<=` twice.
solution: |
  temperature = int(input("Temperature: "))
  print("Comfortable:", 18 <= temperature <= 24)
explanation: |
  `18 <= temperature <= 24` is True only when both parts are True. Including both ends needs `<=` on each side.
stdin: "21"
check:
  cases:
    - stdin: "21"
      expected: |
        Temperature: 21
        Comfortable: True
    - stdin: "18"
      expected: |
        Temperature: 18
        Comfortable: True
    - stdin: "24"
      expected: |
        Temperature: 24
        Comfortable: True
    - stdin: "25"
      expected: |
        Temperature: 25
        Comfortable: False
    - stdin: "10"
      expected: |
        Temperature: 10
        Comfortable: False
```

```quiz
- id: q1
  question: What does `print(7 != 7)` show?
  type: text
  answer: ["False"]
  explanation: 7 is equal to 7, so "not equal" is False.
- id: q2
  question: Which operator checks whether two values are equal?
  options:
    - "=="
    - "="
    - "==="
    - "=>"
  answer: "=="
  explanation: One `=` assigns a value; two `==` compare.
- id: q3
  question: The user types 5. What does this print?
  code: |
    n = input()
    print(n == 5)
  type: text
  answer: ["False"]
  explanation: n is the string "5", and a string is never equal to the number 5.
- id: q4
  question: What does `print("Apple" == "apple")` show?
  type: text
  answer: ["False"]
  explanation: Comparisons are case-sensitive; "A" and "a" are different characters.
- id: q5
  question: What does `print(3 <= 3)` show?
  type: text
  answer: ["True"]
  explanation: "`<=` means less than OR equal to - 3 is equal to 3."
- id: q6
  question: What is the type of the value produced by `10 > 2`?
  options:
    - bool
    - int
    - str
    - float
  answer: bool
  explanation: Every comparison produces a boolean - True or False.
```
