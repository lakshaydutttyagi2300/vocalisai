---
id: py-4-5-nested-and-choosing
title: Nested data and choosing the right collection
track: python
level: 4
order: 5
minutes: 40
summary: Combine collections - lists of dictionaries, dictionaries of lists - loop through them, and choose between list, tuple, set and dict.
objectives:
  - Read values from nested lists and dictionaries with chained indexing
  - Loop over a list of dictionaries (records)
  - Group items into a dictionary of lists
  - Choose the most suitable collection for a task
  - Understand that two names can refer to the same list (and how to copy)
prerequisites: [py-4-4-dictionaries]
tags: [nested, list of dicts, dict of lists, records, json, choosing collections, copy, references]
---

## Simple explanation

Real data is rarely a flat list. Collections can contain other collections:

```python
students = [
    {"name": "Asha", "scores": [82, 90, 77]},
    {"name": "Ben",  "scores": [65, 70, 88]},
]
print(students[0]["name"])        # Asha
print(students[1]["scores"][2])   # 88
```

Read chained indexing **from left to right**: `students[1]` is Ben's dictionary, `["scores"]` is his list,
`[2]` is the third score.

**A list of dictionaries** is how most data looks - like rows of a table, each row with named fields. It is also
exactly how JSON data from websites arrives in Python.

**Which collection when?**

| Need | Use |
|---|---|
| An ordered sequence you will change | **list** `[]` |
| A small fixed group (coordinates, a date) | **tuple** `()` |
| Unique values, membership checks, comparing groups | **set** `{}` |
| Look up values by a name/key | **dict** `{key: value}` |

## Real-world analogy

A **filing cabinet** (list) of **folders** (dictionaries), each folder containing **labelled sheets** - one sheet
holding a **list of marks**. To find Ben's third mark: open drawer 1 (Ben's folder), find the sheet labelled
"scores", read the third line.

## Technical definition

- Collections can be nested arbitrarily: `list[dict]`, `dict[str, list]`, `dict[str, dict]`, `list[tuple]`...
- Access is evaluated left to right; each step must exist (else IndexError/KeyError/TypeError).
- **References**: assignment does not copy. After `b = a` (a list), `a` and `b` are **the same list** -
  changing one changes "both". Copy a list with `a.copy()` or `a[:]`; for nested data use
  `copy.deepcopy(a)`.
- **Grouping pattern**: `groups.setdefault(key, []).append(item)` or
  `if key not in groups: groups[key] = []` then append.

## Step-by-step examples

**Example 1 - records: a list of dictionaries**

```python
orders = [
    {"id": 1, "customer": "Asha", "total": 40.0, "status": "paid"},
    {"id": 2, "customer": "Ben", "total": 15.5, "status": "pending"},
    {"id": 3, "customer": "Asha", "total": 22.0, "status": "paid"},
]
paid_total = 0
for order in orders:
    if order["status"] == "paid":
        paid_total += order["total"]
print("Paid:", paid_total)
```

Output: `Paid: 62.0`. This is the Python equivalent of
`SELECT SUM(total) FROM orders WHERE status = 'paid'`.

**Example 2 - a dictionary of lists (grouping)**

```python
by_customer = {}
for order in orders:
    name = order["customer"]
    if name not in by_customer:
        by_customer[name] = []
    by_customer[name].append(order["id"])
print(by_customer)
```

Output: `{'Asha': [1, 3], 'Ben': [2]}`

**Example 3 - nested loops over nested data**

```python
students = {"Asha": [82, 90, 77], "Ben": [65, 70, 88]}
for name, scores in students.items():
    average = sum(scores) / len(scores)
    print(name, round(average, 1))
```

Output: `Asha 83.0` and `Ben 74.3`.

**Example 4 - the reference trap**

```python
original = [1, 2, 3]
alias = original
copy = original.copy()
original.append(4)
print(alias)   # [1, 2, 3, 4]  - same list!
print(copy)    # [1, 2, 3]     - independent copy
```

## Common mistakes

- **Reading the chain in the wrong order**: `students["scores"][0]` fails - `students` is a list, so its first
  step must be a number.
- **`KeyError` in the middle of a chain** - check with `in` or use `get` at each level.
- **Accidentally sharing lists**: `row = [0] * 3; grid = [row] * 3` creates three references to the *same* row.
  Use `grid = [[0] * 3 for _ in range(3)]` (a list comprehension, Level 8).
- **Choosing a list when you need lookups by name** - searching a list each time is slow and awkward; use a dict.

## Practical application

API responses, configuration files, spreadsheet rows read from CSV, query results - all are nested collections.
Being able to walk through them is the core skill of data processing in Python. The CSV analyser, expense tracker
and API projects all rely on lists of dictionaries.

## Revision notes

- Chain indexing left to right: `data[0]["scores"][2]`.
- **List of dicts** = records/rows (like JSON). **Dict of lists** = groups.
- Group: `groups.setdefault(key, []).append(item)`.
- list = ordered & changeable; tuple = fixed; set = unique; dict = lookup by key.
- `b = a` shares the same list; copy with `a.copy()` (or `copy.deepcopy` for nested).

```exercise
id: read-nested
title: Read nested data
difficulty: beginner
instructions: |
  Using chained indexing on `library`, print:

  1. the title of the **second** book
  2. the **first** author of the **first** book
  3. the year of the **last** book

  ```text
  Clean Code
  Brian Kernighan
  2019
  ```
starter: |
  library = [
      {"title": "The C Programming Language", "authors": ["Brian Kernighan", "Dennis Ritchie"], "year": 1978},
      {"title": "Clean Code", "authors": ["Robert Martin"], "year": 2008},
      {"title": "Python Crash Course", "authors": ["Eric Matthes"], "year": 2019},
  ]
hints:
  - "The second book is `library[1]`; its title is `library[1][\"title\"]`."
  - "Authors are a list inside the dictionary: `library[0][\"authors\"][0]`."
  - "The last book: `library[-1]`."
solution: |
  library = [
      {"title": "The C Programming Language", "authors": ["Brian Kernighan", "Dennis Ritchie"], "year": 1978},
      {"title": "Clean Code", "authors": ["Robert Martin"], "year": 2008},
      {"title": "Python Crash Course", "authors": ["Eric Matthes"], "year": 2019},
  ]
  print(library[1]["title"])
  print(library[0]["authors"][0])
  print(library[-1]["year"])
explanation: |
  Each step of the chain moves one level deeper: list position → dictionary key → list position.
check:
  expected: |
    Clean Code
    Brian Kernighan
    2019
  forbid_text: ['print("Clean', 'print("Brian', "print(2019"]
```

```exercise
id: in-stock-names
title: Products that need reordering
difficulty: beginner
instructions: |
  Print the names of the products whose `stock` is **below** their `reorder_at` level, one per line, in the
  order they appear.

  ```text
  Pens
  Stapler
  ```
starter: |
  products = [
      {"name": "Notebook", "stock": 40, "reorder_at": 20},
      {"name": "Pens", "stock": 5, "reorder_at": 25},
      {"name": "Stapler", "stock": 1, "reorder_at": 3},
      {"name": "Folder", "stock": 12, "reorder_at": 10},
  ]
hints:
  - "`for product in products:`"
  - "`if product[\"stock\"] < product[\"reorder_at\"]:` then print the name."
solution: |
  products = [
      {"name": "Notebook", "stock": 40, "reorder_at": 20},
      {"name": "Pens", "stock": 5, "reorder_at": 25},
      {"name": "Stapler", "stock": 1, "reorder_at": 3},
      {"name": "Folder", "stock": 12, "reorder_at": 10},
  ]
  for product in products:
      if product["stock"] < product["reorder_at"]:
          print(product["name"])
explanation: |
  Looping over a list of dictionaries is like looping over table rows; each dictionary's keys are the columns.
check:
  expected: |
    Pens
    Stapler
  requires: [for, if]
```

```exercise
id: group-by-city
title: Group people by city
difficulty: intermediate
instructions: |
  Build a dictionary `by_city` mapping each city to the **list of names** living there (in the original order),
  then print each city and its names:

  ```text
  Mumbai ['Asha', 'Rahul']
  London ['Ben', 'Grace', 'Omar']
  Toronto ['Chen']
  ```
starter: |
  people = [("Asha", "Mumbai"), ("Ben", "London"), ("Chen", "Toronto"), ("Grace", "London"),
            ("Rahul", "Mumbai"), ("Omar", "London")]
  by_city = {}
hints:
  - "Loop with unpacking: `for name, city in people:`"
  - "Create an empty list the first time a city appears, then append the name."
  - "`by_city.setdefault(city, []).append(name)` does both in one line."
solution: |
  people = [("Asha", "Mumbai"), ("Ben", "London"), ("Chen", "Toronto"), ("Grace", "London"),
            ("Rahul", "Mumbai"), ("Omar", "London")]
  by_city = {}
  for name, city in people:
      if city not in by_city:
          by_city[city] = []
      by_city[city].append(name)
  for city, names in by_city.items():
      print(city, names)
explanation: |
  The dictionary of lists groups names under their city. This is the "group by" pattern you will also meet in
  SQL.
check:
  expected: |
    Mumbai ['Asha', 'Rahul']
    London ['Ben', 'Grace', 'Omar']
    Toronto ['Chen']
  tests:
    - name: by_city has the right groups
      code: |
        assert by_city == {"Mumbai": ["Asha", "Rahul"], "London": ["Ben", "Grace", "Omar"], "Toronto": ["Chen"]}
```

```exercise
id: class-report
title: A class report
difficulty: challenge
instructions: |
  For each student print their name, their average score rounded to 1 decimal place, and `PASS` if the average
  is at least 60 or `FAIL` otherwise. Finally print the name of the student with the highest average.

  ```text
  Asha 83.0 PASS
  Ben 57.7 FAIL
  Chen 91.3 PASS
  Top: Chen
  ```

  Use `round(value, 1)` for rounding.
starter: |
  scores = {
      "Asha": [82, 90, 77],
      "Ben": [45, 60, 68],
      "Chen": [88, 95, 91],
  }
hints:
  - "`for name, marks in scores.items():` then `avg = sum(marks) / len(marks)`."
  - "Decide PASS/FAIL with an if/else, using the unrounded average."
  - "Keep track of the best average and its name while looping."
solution: |
  scores = {
      "Asha": [82, 90, 77],
      "Ben": [45, 60, 68],
      "Chen": [88, 95, 91],
  }
  best_name = ""
  best_avg = -1
  for name, marks in scores.items():
      avg = sum(marks) / len(marks)
      result = "PASS" if avg >= 60 else "FAIL"
      print(name, round(avg, 1), result)
      if avg > best_avg:
          best_avg = avg
          best_name = name
  print("Top:", best_name)
explanation: |
  The loop processes one student (one dictionary entry) at a time. `"PASS" if avg >= 60 else "FAIL"` is a
  one-line if/else called a *conditional expression*; a normal if/else works just as well.
check:
  expected: |
    Asha 83.0 PASS
    Ben 57.7 FAIL
    Chen 91.3 PASS
    Top: Chen
  requires: [for]
```

```quiz
- id: q1
  question: 'With `data = {"user": {"name": "Asha", "tags": ["admin", "dev"]}}`, what is `data["user"]["tags"][1]`?'
  type: text
  answer: ["dev", "'dev'", '"dev"']
  explanation: user → the inner dict, tags → the list, [1] → the second tag.
- id: q2
  question: Which collection is best for looking up a product's price by its code?
  options:
    - dict
    - list
    - tuple
    - set
  answer: dict
  explanation: Dictionaries look values up by key.
- id: q3
  question: Which collection is best for quickly checking whether a username is already taken?
  options:
    - set
    - list
    - tuple
    - a string
  answer: set
  explanation: Sets are made for fast membership tests of unique values.
- id: q4
  question: What does this print?
  code: |
    a = [1, 2]
    b = a
    b.append(3)
    print(a)
  type: text
  answer: ["[1, 2, 3]"]
  explanation: b = a does not copy; both names refer to the same list.
- id: q5
  question: How do you make an independent copy of a simple list `a`?
  options:
    - a.copy()
    - b = a
    - a.append()
    - list = a
  answer: a.copy()
  explanation: copy() (or a[:]) creates a new list with the same items.
- id: q6
  question: What shape does JSON data from a web API usually have in Python?
  options:
    - Lists and dictionaries nested inside each other
    - Only tuples
    - Only sets
    - Only strings
  answer: Lists and dictionaries nested inside each other
  explanation: JSON objects become dicts and JSON arrays become lists.
```
