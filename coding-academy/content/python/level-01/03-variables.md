---
id: py-1-3-variables
title: Variables and values
track: python
level: 1
order: 3
minutes: 30
summary: Store values under names so you can use them later - creating variables, naming rules, changing a variable, and why = does not mean "equals".
objectives:
  - Explain what a value and a variable are
  - Create variables with the assignment operator =
  - Use variables in print() and in calculations
  - Change (reassign) a variable and predict the result
  - Choose valid, meaningful variable names
prerequisites: [py-1-1-print]
tags: [variable, value, assignment, name, reassignment, naming rules, snake_case]
---

## Simple explanation

So far every value (like `"Hello"` or `42`) was typed directly where it was used. Real programs need to
**remember** values: a user's name, a running total, today's temperature.

A **variable** is a **name** that refers to a **value**. You create one with `=`:

```python
city = "Mumbai"
age = 30
```

Read `=` as **"is set to"** or **"gets"**: "city *gets* the value Mumbai". From now on you can write `city`
instead of `"Mumbai"`:

```python
print(city)        # Mumbai
print(age + 1)     # 31
```

Variables can **change**. If you write `age = 31` later, `age` now refers to 31 and the old value is forgotten.
That is why they are called *variables* - their values can vary.

## Real-world analogy

A variable is like a **labelled box** (or a sticky label on a box). The label is the **name** (`age`); the
thing inside is the **value** (`30`). You can look in the box whenever you need the value, and you can take the
old value out and put a new one in - the label stays the same.

(A more precise picture, useful later: the name is a **label stuck onto a value**. `age = 31` moves the label to
a new value.)

## Technical definition

- A **value** (or **object**) is a piece of data: `30`, `"Mumbai"`, `3.5`, `True`.
- A **variable** is a name bound to a value. The statement `name = expression` is an **assignment**: Python
  first works out the **expression** on the right, then binds the name on the left to the result.
- **Reassignment** binds an existing name to a new value.
- **Naming rules** (Python will refuse names that break them):
  - letters, digits and underscores only (`_`); no spaces or hyphens;
  - must **not start with a digit** (`2nd_place` is invalid, `place_2` is fine);
  - **case-sensitive**: `Age` and `age` are different variables;
  - cannot be a **keyword** - a word Python reserves, like `if`, `for`, `class`, `True`, `None`.
- **Convention** (style, not a rule): lower-case words separated by underscores - **snake_case** - such as
  `total_price`. Choose names that describe the value.

## Step-by-step examples

**Example 1 - create and use**

```python
name = "Priya"
hobby = "photography"
print(name, "loves", hobby)
```

Output: `Priya loves photography`. Notice: **no quotes** around variable names in `print`. `print(name)` prints
the value; `print("name")` would print the word *name*.

**Example 2 - the right side is calculated first**

```python
price = 250
quantity = 3
total = price * quantity
print("Total:", total)
```

Output: `Total: 750`. Python computes `price * quantity` (250 × 3), then stores 750 under `total`.

**Example 3 - reassigning and updating**

```python
score = 10
print(score)      # 10
score = 15
print(score)      # 15
score = score + 5
print(score)      # 20
```

`score = score + 5` looks impossible in maths, but in Python it means: *take the current value of `score` (15),
add 5, and store the result (20) back into `score`*. That is why `=` is **not** "equals".

**Example 4 - one variable copied into another**

```python
a = 5
b = a
a = 100
print(b)
```

Output: `5`. `b = a` made `b` refer to the value 5. Changing `a` afterwards does not change `b`.

**Good and bad names**

| Name | OK? | Why |
|---|---|---|
| `total_price` | ✅ | descriptive snake_case |
| `x` | ⚠️ | valid, but says nothing |
| `2total` | ❌ | starts with a digit |
| `total-price` | ❌ | hyphen means minus |
| `total price` | ❌ | spaces not allowed |
| `class` | ❌ | a Python keyword |

## Common mistakes

- **Putting quotes around a variable name**: `print("total")` prints the word, not the value.
- **Using a variable before creating it** → `NameError: name 'total' is not defined`. Lines run top to bottom;
  the assignment must come first.
- **Spelling or capitalisation differences**: `Total` vs `total` are different names.
- **Writing the assignment backwards**: `5 = x` is a SyntaxError. The name goes on the **left**.
- **Confusing `=` with `==`**: `=` stores a value; `==` *compares* two values (Level 2).

## Practical application

Every real program stores data in variables: a shopping app keeps `cart_total`, a game keeps `lives` and
`score`, a report keeps `total_sales`. Good names make code read almost like English, which makes bugs easier
to spot.

## Revision notes

- A **variable** is a name for a value. Create it with **assignment**: `name = value`.
- `=` means "gets / is set to" - the right side is calculated first, then stored.
- Use a variable by writing its name **without quotes**.
- **Reassign** to change it: `count = count + 1` adds one to `count`.
- Names: letters, digits, `_`; not starting with a digit; case-sensitive; not a keyword.
- Use descriptive **snake_case** names: `monthly_rent`, not `mr` or `x`.

```exercise
id: create-variables
title: Create and print variables
difficulty: beginner
instructions: |
  Create a variable `language` with the value `"Python"` and a variable `year` with the value `2026`.
  Then print them with one print call so the output is:

  ```text
  I am learning Python in 2026
  ```
starter: |
  language = "Python"
  # create the year variable here

  # print here using the variables
hints:
  - "Create year like this: `year = 2026` (no quotes - it is a number)."
  - "Use commas in print: `print(\"I am learning\", language, \"in\", year)`."
solution: |
  language = "Python"
  year = 2026
  print("I am learning", language, "in", year)
explanation: |
  The variable names are written without quotes, so print shows their values. The fixed words are strings in
  quotes. Print puts one space between each value.
check:
  expected: |
    I am learning Python in 2026
  tests:
    - name: the variable language holds "Python"
      code: |
        assert language == "Python", f"language is {language!r}"
    - name: the variable year holds 2026
      code: |
        assert year == 2026, f"year is {year!r}"
  forbid_text: ["learning Python", "in 2026"]
```

```exercise
id: total-cost
title: Calculate with variables
difficulty: beginner
instructions: |
  A cinema ticket costs 12 and you buy 4 tickets. Using the variables already created, store the total cost in a
  new variable called `total`, then print:

  ```text
  Total cost: 48
  ```

  Do not type 48 yourself - calculate it from the variables.
starter: |
  ticket_price = 12
  tickets = 4
hints:
  - "Multiply the two variables: `total = ticket_price * tickets`."
  - "Then `print(\"Total cost:\", total)`."
solution: |
  ticket_price = 12
  tickets = 4
  total = ticket_price * tickets
  print("Total cost:", total)
explanation: |
  The right-hand side `ticket_price * tickets` is calculated first (12 × 4 = 48) and the result is stored in
  `total`. If the price changes, only one line needs editing.
check:
  expected: |
    Total cost: 48
  forbid_text: ["48"]
  tests:
    - name: a variable called total holds the result
      code: |
        assert total == 48, f"total is {total!r}"
```

```exercise
id: update-score
title: Updating a variable
difficulty: intermediate
instructions: |
  A game starts with `score = 0`. The player then earns 10 points, then 25 points, then loses 5 points.
  Update the **same** variable `score` three times using `score = score + ...` (or `- ...`), printing the score
  after each change. The output must be:

  ```text
  10
  35
  30
  ```
starter: |
  score = 0
hints:
  - "After earning 10 points: `score = score + 10`, then `print(score)`."
  - "Losing points uses minus: `score = score - 5`."
solution: |
  score = 0
  score = score + 10
  print(score)
  score = score + 25
  print(score)
  score = score - 5
  print(score)
explanation: |
  Each update reads the current value, changes it, and stores it back in `score`. Printing after each step shows
  the value at that moment.
check:
  expected: |
    10
    35
    30
  forbid_text: ["35", "30"]
```

```exercise
id: swap-values
title: Swap two variables
difficulty: challenge
instructions: |
  `left` holds `"tea"` and `right` holds `"coffee"`. Swap them so that `left` holds `"coffee"` and `right` holds
  `"tea"`, **without typing the words "tea" or "coffee" again** after the first two lines. Then print:

  ```text
  coffee tea
  ```

  Tip: you may need a third, temporary variable.
starter: |
  left = "tea"
  right = "coffee"
  # swap them here

  print(left, right)
hints:
  - If you write `left = right` first, the value "tea" is lost. Save it somewhere first.
  - "Use a temporary variable: `temp = left`, then `left = right`, then `right = temp`."
solution: |
  left = "tea"
  right = "coffee"
  temp = left
  left = right
  right = temp
  print(left, right)
explanation: |
  `temp` keeps a copy of the original `left` value before it is overwritten. (Python also has a shortcut you
  will see later: `left, right = right, left`.)
check:
  expected: |
    coffee tea
  tests:
    - name: left now holds "coffee" and right holds "tea"
      code: |
        assert left == "coffee" and right == "tea", f"left={left!r}, right={right!r}"
```

```quiz
- id: q1
  question: What does this print?
  code: |
    animal = "cat"
    print(animal)
  type: text
  answer: ["cat"]
  explanation: Without quotes, `animal` is a variable name, so its value is printed.
- id: q2
  question: What does this print?
  code: |
    animal = "cat"
    print("animal")
  type: text
  answer: ["animal"]
  explanation: With quotes it is just text - the word animal - not the variable.
- id: q3
  question: What is the value of `x` at the end?
  code: |
    x = 4
    x = x * 3
    x = x - 2
  type: text
  answer: ["10"]
  explanation: 4 × 3 = 12, then 12 − 2 = 10. Each line uses the current value of x.
- id: q4
  question: Which is a valid Python variable name?
  options:
    - monthly_total
    - 2nd_total
    - monthly-total
    - monthly total
  answer: monthly_total
  explanation: Names may contain letters, digits and underscores, and may not start with a digit. Hyphens and spaces are not allowed.
- id: q5
  question: How should you read `count = count + 1`?
  options:
    - Take the current value of count, add 1, and store the result in count
    - count is equal to count plus one (which is impossible)
    - Compare count with count + 1
    - Create a second variable called count
  answer: Take the current value of count, add 1, and store the result in count
  explanation: "`=` is assignment: the right side is calculated first, then stored."
- id: q6
  question: What does this print?
  code: |
    a = 1
    b = a
    a = 2
    print(b)
  type: text
  answer: ["1"]
  explanation: b got the value 1. Reassigning a afterwards does not change b.
```
