---
id: py-8-2-comprehensions-lambda-sorting
title: Comprehensions, lambda functions and sorting
track: python
level: 8
order: 2
minutes: 45
summary: Build lists, dictionaries and sets in one readable line with comprehensions, write tiny functions with lambda, and sort anything with key functions.
objectives:
  - Rewrite simple loops as list comprehensions (with and without a condition)
  - Write dictionary and set comprehensions
  - Use lambda for short, throwaway functions
  - Sort lists of tuples and dictionaries with sorted(..., key=...)
  - Decide when a normal loop is clearer than a comprehension
prerequisites: [py-4-5-nested-and-choosing, py-6-1-defining-functions]
tags: [list comprehension, dict comprehension, set comprehension, lambda, sorted, key, sort, min, max]
---

## Simple explanation

A very common pattern is "make a new list from an old one":

```python
squares = []
for n in range(1, 6):
    squares.append(n * n)
```

A **list comprehension** does the same in one line:

```python
squares = [n * n for n in range(1, 6)]        # [1, 4, 9, 16, 25]
```

Read it as: *"n times n, for each n in range(1, 6)"*. Add `if` to filter:

```python
evens = [n for n in range(10) if n % 2 == 0]  # [0, 2, 4, 6, 8]
```

The same idea builds dictionaries and sets:

```python
lengths = {word: len(word) for word in ["tea", "coffee"]}   # {'tea': 3, 'coffee': 6}
```

A **lambda** is a tiny unnamed function written in one expression: `lambda x: x * 2`. Its most common use is as
a **key** for sorting:

```python
people = [("Asha", 31), ("Ben", 25), ("Chen", 40)]
by_age = sorted(people, key=lambda person: person[1])
```

## Real-world analogy

A comprehension is like an **assembly line instruction**: "for each apple on the belt, if it is ripe, peel it and
put it in the box". One sentence describes the whole process. A sort **key** is like telling someone *how* to
line people up: "by height", "by age" - the key is the measurement you compare.

## Technical definition

- **List comprehension**: `[expression for item in iterable if condition]` → a new list. The `if` part is
  optional. Nested `for`s are allowed: `[(x, y) for x in a for y in b]`.
- **Dict comprehension**: `{key_expr: value_expr for item in iterable if condition}`.
- **Set comprehension**: `{expr for item in iterable}`.
- **Conditional expression** inside: `["even" if n % 2 == 0 else "odd" for n in nums]` (if/else goes *before*
  the `for`; a filter `if` goes *after*).
- **lambda**: `lambda parameters: expression` creates a function object that returns the expression. No
  statements, no assignment - just one expression.
- **Sorting with a key**: `sorted(iterable, key=func, reverse=False)` calls `func` on each item and compares the
  results. `min`/`max` accept `key=` too. Sorting is **stable**: items with equal keys keep their original order -
  so sorting by a second key first and then by the main key gives a multi-level sort. A tuple key
  `key=lambda p: (p["city"], p["name"])` sorts by city, then name.

## Step-by-step examples

**Example 1 - transform and filter**

```python
prices = [12.5, 3.0, 45.0, 8.25]
with_tax = [round(p * 1.2, 2) for p in prices]
expensive = [p for p in prices if p > 10]
print(with_tax)     # [15.0, 3.6, 54.0, 9.9]
print(expensive)    # [12.5, 45.0]
```

**Example 2 - cleaning strings**

```python
raw = ["  Asha ", "BEN", "chen  "]
names = [name.strip().title() for name in raw]
print(names)        # ['Asha', 'Ben', 'Chen']
```

**Example 3 - dictionary comprehension**

```python
prices = {"tea": 2.5, "cake": 4.0, "coffee": 3.0}
discounted = {item: round(price * 0.9, 2) for item, price in prices.items()}
cheap = {item: price for item, price in prices.items() if price < 3.5}
print(discounted)   # {'tea': 2.25, 'cake': 3.6, 'coffee': 2.7}
print(cheap)        # {'tea': 2.5, 'coffee': 3.0}
```

**Example 4 - sorting records**

```python
products = [
    {"name": "Lamp", "price": 35.0},
    {"name": "Desk", "price": 120.0},
    {"name": "Pen", "price": 1.5},
]
cheapest_first = sorted(products, key=lambda p: p["price"])
print([p["name"] for p in cheapest_first])           # ['Pen', 'Lamp', 'Desk']
most_expensive = max(products, key=lambda p: p["price"])
print(most_expensive["name"])                        # Desk
```

**Example 5 - two-level sort with a tuple key**

```python
people = [("Ben", "London"), ("Asha", "Mumbai"), ("Chen", "London")]
print(sorted(people, key=lambda p: (p[1], p[0])))
# [('Ben', 'London'), ('Chen', 'London'), ('Asha', 'Mumbai')]
```

## Common mistakes

- **Cramming too much into one comprehension** - if it needs nested loops *and* several conditions, a normal loop
  is clearer.
- **Putting `if/else` in the wrong place**: `[x if x > 0 for x in nums]` is invalid; it is
  `[x if x > 0 else 0 for x in nums]` (transform), or `[x for x in nums if x > 0]` (filter).
- **Using a comprehension just for side effects** (`[print(x) for x in items]`) - use a for loop.
- **Calling the key function yourself**: `key=len()` is wrong; pass the function itself: `key=len`.
- **Overusing lambda** - give longer logic a proper `def` with a name.

## Practical application

Data cleaning (`[row.strip() for row in lines if row]`), extracting a column (`[r["price"] for r in rows]`),
building lookup tables (`{p["code"]: p for p in products}`), and "top N by something" reports
(`sorted(rows, key=..., reverse=True)[:5]`) - you will use these daily in the CSV analyser and API projects.

## Revision notes

- `[expr for x in items if cond]` - list; `{k: v for ...}` - dict; `{expr for ...}` - set.
- Filter `if` goes at the end; `a if cond else b` goes at the front.
- `lambda x: expression` - a tiny function, mostly for `key=`.
- `sorted(items, key=..., reverse=True)`; `min`/`max(items, key=...)`; tuple keys for multi-level sorting.
- Readability first: switch to a loop when a comprehension gets complicated.

```exercise
id: squares-comprehension
title: Your first comprehension
difficulty: beginner
instructions: |
  Using **list comprehensions only** (no `for` loop statements), print:

  1. the squares of 1 to 10
  2. only the **even** squares

  ```text
  [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]
  [4, 16, 36, 64, 100]
  ```
starter: |
  squares = []
  for n in range(1, 11):
      squares.append(n * n)
  print(squares)
hints:
  - "`squares = [n * n for n in range(1, 11)]`"
  - "`evens = [s for s in squares if s % 2 == 0]`"
solution: |
  squares = [n * n for n in range(1, 11)]
  evens = [s for s in squares if s % 2 == 0]
  print(squares)
  print(evens)
explanation: |
  The expression before `for` says what goes into the new list; an `if` at the end keeps only some items.
check:
  expected: |
    [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]
    [4, 16, 36, 64, 100]
  requires: [list-comprehension]
  forbid: [for]
```

```exercise
id: clean-names
title: Clean a list of names
difficulty: beginner
instructions: |
  With **one list comprehension**, build `clean` from `raw`: strip spaces, capitalise each name with `.title()`,
  and **skip empty entries**. Print it.

  ```text
  ['Asha', 'Ben Smith', 'Chen']
  ```
starter: |
  raw = ["  asha", "BEN SMITH ", "   ", "chen", ""]
hints:
  - "The transformation: `name.strip().title()`."
  - "The filter: `if name.strip()` - an empty string is falsy."
solution: |
  raw = ["  asha", "BEN SMITH ", "   ", "chen", ""]
  clean = [name.strip().title() for name in raw if name.strip()]
  print(clean)
explanation: |
  `if name.strip()` keeps only entries that are not empty after removing spaces; the expression at the front
  cleans each kept entry.
check:
  expected: |
    ['Asha', 'Ben Smith', 'Chen']
  requires: [list-comprehension]
```

```exercise
id: sort-products
title: Sort products with key functions
difficulty: intermediate
instructions: |
  Print the product **names**:

  1. sorted by price, cheapest first
  2. sorted by stock, highest first
  3. the name of the product with the highest **stock value** (price × stock), using `max(..., key=...)`

  ```text
  ['Pen', 'Mug', 'Lamp', 'Desk']
  ['Pen', 'Mug', 'Lamp', 'Desk']
  Lamp
  ```
starter: |
  products = [
      {"name": "Desk", "price": 120.0, "stock": 2},
      {"name": "Pen", "price": 1.5, "stock": 300},
      {"name": "Lamp", "price": 35.0, "stock": 20},
      {"name": "Mug", "price": 8.0, "stock": 45},
  ]
hints:
  - "`sorted(products, key=lambda p: p[\"price\"])` sorts the dictionaries; use a comprehension to keep only the names."
  - "`reverse=True` for highest first."
  - "`max(products, key=lambda p: p[\"price\"] * p[\"stock\"])[\"name\"]`"
solution: |
  products = [
      {"name": "Desk", "price": 120.0, "stock": 2},
      {"name": "Pen", "price": 1.5, "stock": 300},
      {"name": "Lamp", "price": 35.0, "stock": 20},
      {"name": "Mug", "price": 8.0, "stock": 45},
  ]
  by_price = sorted(products, key=lambda p: p["price"])
  print([p["name"] for p in by_price])
  by_stock = sorted(products, key=lambda p: p["stock"], reverse=True)
  print([p["name"] for p in by_stock])
  best = max(products, key=lambda p: p["price"] * p["stock"])
  print(best["name"])
explanation: |
  `key` tells sorted/max what to compare. The lambda receives one dictionary and returns the value to compare.
  Lamp's stock value is 700 - more than Pen (450), Mug (360) and Desk (240).
check:
  expected: |
    ['Pen', 'Mug', 'Lamp', 'Desk']
    ['Pen', 'Mug', 'Lamp', 'Desk']
    Lamp
  requires: [lambda]
```

```exercise
id: word-index
title: Build an index with a dict comprehension
difficulty: challenge
instructions: |
  From `text`, build a dictionary that maps each **different word** (lower case, punctuation `.,` removed) to its
  **length**, using a **dict comprehension**. Then print the words sorted by length (longest first; equal lengths
  alphabetically), as `word:length` pairs on one line separated by spaces:

  ```text
  comprehensions:14 readable:8 python:6 short:5 code:4 make:4 and:3
  ```
starter: |
  text = "Comprehensions make Python code short. Short and readable code."
hints:
  - "Words: `[w.strip('.,').lower() for w in text.split()]`."
  - "Dict comprehension: `{w: len(w) for w in words}` - duplicates simply overwrite themselves."
  - "Sort with a tuple key: `key=lambda item: (-item[1], item[0])` on `index.items()`, then `\" \".join(...)`."
solution: |
  text = "Comprehensions make Python code short. Short and readable code."
  words = [w.strip(".,").lower() for w in text.split()]
  index = {w: len(w) for w in words}
  ordered = sorted(index.items(), key=lambda item: (-item[1], item[0]))
  print(" ".join(f"{word}:{length}" for word, length in ordered))
explanation: |
  The negative length sorts longest first while the word sorts alphabetically for ties - one tuple key, one sort.
  A dict comprehension automatically keeps one entry per different word.
check:
  expected: |
    comprehensions:14 readable:8 python:6 short:5 code:4 make:4 and:3
  requires: [dict-comprehension]
```

```quiz
- id: q1
  question: What does `[x * 2 for x in [1, 2, 3]]` produce?
  type: text
  answer: ["[2, 4, 6]"]
  explanation: Each item is doubled into a new list.
- id: q2
  question: What does `[x for x in range(6) if x % 3 == 0]` produce?
  type: text
  answer: ["[0, 3]"]
  explanation: Only the numbers divisible by 3 are kept.
- id: q3
  question: Which is a valid way to sort `people` (a list of (name, age) tuples) by age?
  options:
    - "sorted(people, key=lambda p: p[1])"
    - "sorted(people, key=p[1])"
    - "sorted(people, lambda p: p[1])"
    - "people.sorted(age)"
  answer: "sorted(people, key=lambda p: p[1])"
  explanation: key must be a function; the lambda returns the age of each tuple.
- id: q4
  question: 'What does `{w: len(w) for w in ["a", "bb"]}` produce?'
  type: text
  answer: ["{'a': 1, 'bb': 2}"]
  explanation: A dict comprehension builds key-value pairs.
- id: q5
  question: Where does the if/else go when you want to transform every item (not filter)?
  options:
    - "Before the for: [a if cond else b for x in items]"
    - "After the for: [x for x in items if cond else b]"
    - It is not possible
    - "In a lambda only"
  answer: "Before the for: [a if cond else b for x in items]"
  explanation: A filter if goes at the end; a conditional expression goes at the front.
- id: q6
  question: When should you prefer a normal for loop to a comprehension?
  options:
    - When the logic is complicated or you only need side effects like printing
    - Never
    - Always
    - Only for dictionaries
  answer: When the logic is complicated or you only need side effects like printing
  explanation: Comprehensions are for building collections in a clear, simple way.
```
