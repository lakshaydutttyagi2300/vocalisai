---
id: py-8-3-iterators-generators-context
title: enumerate, zip, iterators, generators and context managers
track: python
level: 8
order: 3
minutes: 45
summary: Loop like a professional - number items with enumerate, walk several lists together with zip, understand iterators, create lazy sequences with generators, and manage resources with context managers.
objectives:
  - Use enumerate to get positions and items together
  - Use zip to loop over several sequences in parallel
  - Explain what an iterator is and what iter() and next() do
  - Write generator functions with yield and generator expressions
  - Explain what a context manager does and write one with contextlib
prerequisites: [py-8-2-comprehensions-lambda-sorting, py-7-1-reading-writing-files]
tags: [enumerate, zip, iterator, iterable, next, generator, yield, generator expression, context manager, with, contextlib]
---

## Simple explanation

**enumerate** gives you a counter *and* the item:

```python
for number, name in enumerate(["Asha", "Ben", "Chen"], start=1):
    print(number, name)          # 1 Asha / 2 Ben / 3 Chen
```

**zip** walks several lists side by side:

```python
names = ["Asha", "Ben"]
scores = [88, 72]
for name, score in zip(names, scores):
    print(name, score)           # Asha 88 / Ben 72
```

A **generator** produces values **one at a time, only when asked** - instead of building a whole list in memory.
You write one like a function, but with `yield` instead of `return`:

```python
def countdown(n):
    while n > 0:
        yield n
        n -= 1

for x in countdown(3):
    print(x)                     # 3 / 2 / 1
```

A **context manager** is what makes `with` work: it sets something up and *always* cleans up afterwards - like
closing a file even if an error happens.

## Real-world analogy

- `enumerate` is a **numbered ticket dispenser** handing out a number with each customer.
- `zip` is **pairing socks from two piles**: first with first, second with second - and it stops when one pile
  runs out.
- A generator is a **tap**, not a **bucket**: water (values) comes out only when you open it, so you never need
  to store the whole lake.
- A context manager is a **hotel door that locks automatically** behind you when you leave.

## Technical definition

- `enumerate(iterable, start=0)` yields `(index, item)` pairs.
- `zip(*iterables)` yields tuples of corresponding items and stops at the **shortest** input
  (`itertools.zip_longest` pads instead). `dict(zip(keys, values))` builds a dictionary.
- **Iterable**: anything you can loop over (list, str, dict, file, range...). **Iterator**: an object that
  produces the next value with `next(it)` and raises `StopIteration` when exhausted; `iter(iterable)` creates
  one. A `for` loop does this automatically. Iterators are **single-use**.
- **Generator function**: contains `yield`; calling it returns a generator (an iterator). Each `next()` runs the
  function until the next `yield`, pausing there with all local variables kept.
- **Generator expression**: `(x * x for x in data)` - like a list comprehension but lazy; often passed directly:
  `sum(x * x for x in data)`.
- **Context manager**: an object with `__enter__`/`__exit__` methods used by `with`. `__exit__` runs even when the
  block raises. `contextlib.contextmanager` turns a generator with a single `yield` into a context manager:
  code before `yield` = setup, after = teardown (wrap the `yield` in `try/finally` to guarantee teardown).

## Step-by-step examples

**Example 1 - enumerate instead of range(len(...))**

```python
tasks = ["email", "report", "meeting"]
for i, task in enumerate(tasks, start=1):
    print(f"{i}. {task}")
```

**Example 2 - zip into a dictionary**

```python
products = ["tea", "cake", "coffee"]
prices = [2.5, 4.0, 3.0]
menu = dict(zip(products, prices))
print(menu)          # {'tea': 2.5, 'cake': 4.0, 'coffee': 3.0}
```

**Example 3 - iterators by hand**

```python
it = iter([10, 20])
print(next(it))      # 10
print(next(it))      # 20
print(next(it, "done"))   # done  (default instead of StopIteration)
```

**Example 4 - a generator that reads big data lazily**

```python
def even_numbers(limit):
    n = 0
    while n <= limit:
        yield n
        n += 2

print(list(even_numbers(10)))           # [0, 2, 4, 6, 8, 10]
print(sum(x * x for x in range(1_000_000)))   # no million-item list is ever built
```

**Example 5 - a context manager that times a block**

```python
import time
from contextlib import contextmanager

@contextmanager
def timer(label):
    start = time.perf_counter()
    try:
        yield
    finally:
        print(f"{label} took {time.perf_counter() - start:.2f} s")

with timer("Summing"):
    total = sum(range(5_000_000))
```

(`@contextmanager` is a *decorator* - Level 11 explains decorators. Here, just read it as "turn this generator
into something `with` can use".)

## Common mistakes

- **Reusing an exhausted iterator/generator**: the second loop over the same generator produces nothing. Create
  a new one (call the function again).
- **zip silently dropping items** when lists have different lengths. Check lengths, or use
  `zip(a, b, strict=True)` (Python 3.10+) to get an error instead.
- **Using `return` in a generator to give values** - use `yield`; `return` ends the generator.
- **Forgetting `start=1`** in enumerate when numbering for people.
- **Converting a huge generator to a list** - you lose the memory benefit.

## Practical application

`enumerate` for numbered output and line numbers in error messages; `zip` to combine columns (names + scores,
dates + amounts); generators to process files with millions of lines one at a time; context managers for files,
database connections and timers - this app itself uses a context manager to open and safely close its database.

## Revision notes

- `enumerate(items, start=1)` → (number, item). `zip(a, b)` → pairs; stops at the shortest.
- Iterable = can loop over; iterator = gives `next()` values once; `iter()`, `next()`.
- Generator: function with `yield` - lazy, one value at a time; generator expression `(expr for x in data)`.
- Context manager = setup + guaranteed cleanup for `with`; write one with `@contextmanager` and `try/finally`.

```exercise
id: numbered-list
title: Number a list with enumerate
difficulty: beginner
instructions: |
  Print the steps, numbered from 1, using `enumerate` (no `range(len(...))`):

  ```text
  Step 1: Boil water
  Step 2: Add tea
  Step 3: Wait 3 minutes
  ```
starter: |
  steps = ["Boil water", "Add tea", "Wait 3 minutes"]
hints:
  - "`for number, step in enumerate(steps, start=1):`"
solution: |
  steps = ["Boil water", "Add tea", "Wait 3 minutes"]
  for number, step in enumerate(steps, start=1):
      print(f"Step {number}: {step}")
explanation: |
  enumerate hands you the counter and the item together; `start=1` makes it count like people do.
check:
  expected: |
    Step 1: Boil water
    Step 2: Add tea
    Step 3: Wait 3 minutes
  requires: ["call:enumerate"]
  forbid: ["call:range"]
```

```exercise
id: zip-report
title: Combine lists with zip
difficulty: beginner
instructions: |
  Use `zip` to print each student's name with their score and whether they passed (score ≥ 50), then build a
  dictionary `results` with `dict(zip(...))` and print it:

  ```text
  Asha 82 pass
  Ben 47 fail
  Chen 66 pass
  {'Asha': 82, 'Ben': 47, 'Chen': 66}
  ```
starter: |
  names = ["Asha", "Ben", "Chen"]
  scores = [82, 47, 66]
hints:
  - "`for name, score in zip(names, scores):`"
  - "`results = dict(zip(names, scores))`"
solution: |
  names = ["Asha", "Ben", "Chen"]
  scores = [82, 47, 66]
  for name, score in zip(names, scores):
      print(name, score, "pass" if score >= 50 else "fail")
  results = dict(zip(names, scores))
  print(results)
explanation: |
  zip pairs the first name with the first score, and so on. Passing those pairs to dict() makes a dictionary.
check:
  expected: |
    Asha 82 pass
    Ben 47 fail
    Chen 66 pass
    {'Asha': 82, 'Ben': 47, 'Chen': 66}
  requires: ["call:zip"]
```

```exercise
id: fibonacci-generator
title: A Fibonacci generator
difficulty: intermediate
instructions: |
  Write a generator function `fibonacci(limit)` that **yields** Fibonacci numbers (0, 1, 1, 2, 3, 5, 8, ... - each
  number is the sum of the two before) **while they are not greater than** `limit`. Print `list(fibonacci(50))`
  and the sum of `fibonacci(1000)`:

  ```text
  [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
  2583
  ```
starter: |
  def fibonacci(limit):
      a, b = 0, 1
hints:
  - "`while a <= limit:` then `yield a` then `a, b = b, a + b`."
  - "`sum(fibonacci(1000))` works because sum accepts any iterable."
solution: |
  def fibonacci(limit):
      a, b = 0, 1
      while a <= limit:
          yield a
          a, b = b, a + b

  print(list(fibonacci(50)))
  print(sum(fibonacci(1000)))
explanation: |
  Each `yield` hands out one number and pauses. `a, b = b, a + b` moves the pair one step along the sequence
  using tuple unpacking.
check:
  expected: |
    [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
    2583
  requires: [yield]
```

```exercise
id: lazy-file-reader
title: Read a big file lazily
difficulty: challenge
instructions: |
  The starter writes a log file with 10,000 lines. Write a generator `error_lines(filename)` that opens the file
  with `with` and **yields** only the lines containing `ERROR` (stripped of the line ending), one at a time.
  Then print how many error lines there are and the first two:

  ```text
  Errors: 500
  line 19 ERROR disk full
  line 39 ERROR disk full
  ```
starter: |
  with open("app.log", "w", encoding="utf-8") as f:
      for i in range(10_000):
          status = "ERROR disk full" if i % 20 == 19 else "INFO ok"
          f.write(f"line {i} {status}\n")

  def error_lines(filename):
      pass
hints:
  - "`with open(filename, encoding=\"utf-8\") as f:` then `for line in f:` and `if \"ERROR\" in line: yield line.rstrip(\"\\n\")`."
  - "Count with `sum(1 for _ in error_lines(\"app.log\"))`."
  - "For the first two: create a new generator and call `next()` twice (or use `itertools.islice`)."
solution: |
  with open("app.log", "w", encoding="utf-8") as f:
      for i in range(10_000):
          status = "ERROR disk full" if i % 20 == 19 else "INFO ok"
          f.write(f"line {i} {status}\n")

  def error_lines(filename):
      with open(filename, encoding="utf-8") as f:
          for line in f:
              if "ERROR" in line:
                  yield line.rstrip("\n")

  print("Errors:", sum(1 for _ in error_lines("app.log")))
  errors = error_lines("app.log")
  print(next(errors))
  print(next(errors))
explanation: |
  The generator reads one line at a time, so even a huge file uses very little memory. The file stays open only
  while the generator runs and is closed by `with` when it finishes. A new generator is created for the second
  pass because generators are single-use.
check:
  expected: |
    Errors: 500
    line 19 ERROR disk full
    line 39 ERROR disk full
  requires: [yield, with]
```

```quiz
- id: q1
  question: 'What does `list(enumerate(["a", "b"], start=1))` give?'
  type: text
  answer: ["[(1, 'a'), (2, 'b')]"]
  explanation: enumerate yields (number, item) tuples.
- id: q2
  question: 'What does `list(zip([1, 2, 3], ["x", "y"]))` give?'
  options:
    - "[(1, 'x'), (2, 'y')]"
    - "[(1, 'x'), (2, 'y'), (3, None)]"
    - An error
    - "[1, 'x', 2, 'y', 3]"
  answer: "[(1, 'x'), (2, 'y')]"
  explanation: zip stops at the shortest input.
- id: q3
  question: What is special about a function containing `yield`?
  options:
    - Calling it returns a generator that produces values one at a time
    - It runs twice
    - It cannot have parameters
    - It returns a list
  answer: Calling it returns a generator that produces values one at a time
  explanation: The body runs lazily, pausing at each yield.
- id: q4
  question: What happens if you loop over the same generator object a second time?
  options:
    - Nothing is produced - it is already exhausted
    - It starts again from the beginning
    - An error always occurs
    - It produces the values in reverse
  answer: Nothing is produced - it is already exhausted
  explanation: Generators and iterators are single-use. Create a new one.
- id: q5
  question: Why is `sum(x * x for x in range(10_000_000))` memory-friendly?
  options:
    - The generator expression produces values one at a time instead of building a list
    - sum is magic
    - range is a list
    - Python compresses numbers
  answer: The generator expression produces values one at a time instead of building a list
  explanation: Round brackets make a lazy generator; square brackets would build a 10-million item list.
- id: q6
  question: What does a context manager used with `with` guarantee?
  options:
    - Its clean-up code runs when the block ends, even if an error happens
    - The code runs faster
    - Errors are ignored
    - The file is read twice
  answer: Its clean-up code runs when the block ends, even if an error happens
  explanation: That is why with open(...) always closes the file.
```
