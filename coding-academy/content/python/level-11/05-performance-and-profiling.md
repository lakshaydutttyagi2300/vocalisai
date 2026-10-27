---
id: py-11-5-performance-and-profiling
title: Performance, profiling and memory
track: python
level: 11
order: 5
minutes: 45
summary: Measure before optimising, understand Big-O in plain words, choose the right data structure, cache repeated work and keep memory use low.
objectives:
  - Measure code with time.perf_counter, timeit and cProfile
  - Describe O(1), O(n) and O(n²) in plain language
  - Speed up lookups with sets and dictionaries
  - Avoid repeated work with caching and by moving work out of loops
  - Reduce memory use with generators
prerequisites: [py-11-2-advanced-iteration]
tags: [performance, speed, profiling, cprofile, timeit, perf_counter, big o, complexity, set, dict, lookup, cache, lru_cache, memory, sys.getsizeof, optimisation]
---

## Simple explanation

Most code is fast enough. When something **is** slow, follow three rules:

1. **Measure first** - find the slow part; don't guess.
2. **Fix the algorithm or data structure** - this gives the biggest wins.
3. **Re-measure** - make sure it actually got faster and still gives the right answer.

The most common win: checking `if x in big_list` inside a loop. A list is searched item by item; a **set**
finds items almost instantly:

```python
import time

names_list = [f"user{i}" for i in range(20_000)]
names_set = set(names_list)
queries = [f"user{i}" for i in range(0, 40_000, 20)]

start = time.perf_counter()
found = sum(1 for q in queries if q in names_list)
print("list:", round(time.perf_counter() - start, 3), "s")

start = time.perf_counter()
found = sum(1 for q in queries if q in names_set)
print("set: ", round(time.perf_counter() - start, 5), "s")
```

The set version is typically hundreds of times faster (exact numbers depend on your computer).

## Real-world analogy

Finding a word by reading a book from page 1 is **O(n)**: twice the pages, twice the time. Using the **index at
the back** is like a set or dict lookup - **O(1)**: about the same time however big the book is. Comparing every
guest with every other guest at a party is **O(n²)**: double the guests, four times the handshakes.

## Technical definition

- **Big-O** describes how running time grows with input size *n*:
  - O(1) constant - dict/set lookup, list index `a[i]`, `append`.
  - O(log n) - binary search (`bisect`).
  - O(n) linear - one loop over the data, `x in list`, `sum`, `max`.
  - O(n log n) - sorting.
  - O(n²) quadratic - a loop inside a loop over the same data; `x in list` inside a loop.
- **Measuring**: `time.perf_counter()` around a block; `timeit.timeit(stmt, number=...)` for small snippets;
  `python -m cProfile -s cumtime script.py` (or `cProfile.run("main()")`) shows which functions take the time.
- **Common speed-ups**: sets/dicts for lookups; build a lookup dict once instead of searching repeatedly;
  move unchanging work out of loops; `"".join(parts)` instead of `+=` on strings in a loop; built-ins (`sum`,
  `max`, `sorted`) and comprehensions are faster than manual loops; caching (`functools.lru_cache`).
- **Memory**: `sys.getsizeof(obj)` (shallow size); generators avoid holding everything in memory;
  `tracemalloc` tracks allocations; `__slots__` reduces per-object memory for millions of objects.
- **Beyond pure Python**: libraries such as NumPy/pandas do heavy number work in fast compiled code.

## Step-by-step examples

**Example 1 - turning O(n²) into O(n) with a dict**

```python
orders = [("o1", "c2"), ("o2", "c1"), ("o3", "c2")]
customers = [("c1", "Asha"), ("c2", "Ben")]

# Slow: search the customer list for every order (O(orders × customers))
for order_id, cust_id in orders:
    name = next(n for c, n in customers if c == cust_id)

# Fast: build a lookup once (O(customers)), then each lookup is O(1)
names = dict(customers)
for order_id, cust_id in orders:
    print(order_id, names[cust_id])
```

**Example 2 - timeit**

```python
import timeit
print(timeit.timeit("sum(range(1000))", number=1000))
```

**Example 3 - profiling (on your own computer)**

```text
python -m cProfile -s cumtime my_script.py
```

The report lists each function with how many times it was called and the total time - the slow function is
usually obvious at the top.

## Common mistakes

- **Optimising without measuring** - you often speed up the part that wasn't slow.
- **Micro-optimisations that hurt readability** for a few microseconds.
- **Breaking correctness** while optimising - keep tests and compare results.
- **`x in list` in a loop over big data** - convert the list to a set once.
- **Building strings with `+=` in a big loop** - collect parts in a list and `"".join` them.
- **Loading a whole huge file into memory** when you only need one pass - iterate line by line.

## Practical application

When a script that processed 100 rows takes minutes on 100,000 rows, look for nested loops and list searches
first: replacing them with a dictionary lookup often turns minutes into a second. Profiling tells you whether
time goes into your code, a slow disk, or a network request - each needs a different fix.

## Revision notes

- Measure (perf_counter, timeit, cProfile) → fix the algorithm → re-measure → keep tests green.
- O(1) dict/set lookup; O(n) one pass; O(n²) nested loops - avoid on large data.
- Build lookup dicts/sets once; move constant work out of loops; join strings.
- Cache pure functions with `lru_cache`; use generators for big data.

```exercise
id: set-lookup
title: Speed up a lookup with a set
difficulty: beginner
instructions: |
  `find_banned` checks every username against a **list** of banned names. Change the code so that the banned
  names are turned into a **set once**, before the loop, and lookups use the set. The output must not change.

  ```text
  banned users found: 3
  ['spam1', 'spam400', 'spam1999']
  ```
starter: |
  banned = [f"spam{i}" for i in range(2000)]
  users = ["asha", "spam1", "ben", "spam400", "cy", "spam1999", "spam2000"]

  def find_banned(users, banned):
      found = []
      for user in users:
          if user in banned:
              found.append(user)
      return found

  result = find_banned(users, banned)
  print("banned users found:", len(result))
  print(result)
hints:
  - "At the start of the function: `banned_set = set(banned)`."
  - "Then check `if user in banned_set:`."
solution: |
  banned = [f"spam{i}" for i in range(2000)]
  users = ["asha", "spam1", "ben", "spam400", "cy", "spam1999", "spam2000"]

  def find_banned(users, banned):
      banned_set = set(banned)
      found = []
      for user in users:
          if user in banned_set:
              found.append(user)
      return found

  result = find_banned(users, banned)
  print("banned users found:", len(result))
  print(result)
explanation: |
  Building the set costs one pass over the banned list; after that each check is instant instead of scanning up
  to 2,000 names. With thousands of users this is the difference between seconds and milliseconds.
check:
  expected: |
    banned users found: 3
    ['spam1', 'spam400', 'spam1999']
  requires: [call:set]
  tests:
    - name: the set is built once, not inside the loop
      code: |
        import ast
        func = next(n for n in ast.walk(ast.parse(SOURCE)) if isinstance(n, ast.FunctionDef) and n.name == "find_banned")
        for loop in [n for n in ast.walk(func) if isinstance(n, (ast.For, ast.While))]:
            for node in ast.walk(loop):
                if isinstance(node, ast.Call) and getattr(node.func, "id", "") == "set":
                    raise AssertionError("set(...) is called inside the loop - build it once before the loop")
```

```exercise
id: dict-index
title: Replace a nested loop with a dictionary
difficulty: intermediate
instructions: |
  `order_report` finds each order's product price with a nested loop (O(orders × products)). Rewrite it to build
  a `price_of` dictionary **once** and look prices up from it. Same output, no nested loop.

  ```text
  o1: 2 x kettle = 50.0
  o2: 1 x toaster = 30.0
  o3: 3 x mug = 13.5
  total: 93.5
  ```
starter: |
  products = [("kettle", 25.0), ("toaster", 30.0), ("mug", 4.5)]
  orders = [("o1", "kettle", 2), ("o2", "toaster", 1), ("o3", "mug", 3)]

  def order_report(orders, products):
      total = 0
      for order_id, product, qty in orders:
          for name, price in products:
              if name == product:
                  line = price * qty
                  print(f"{order_id}: {qty} x {product} = {line}")
                  total += line
      print("total:", total)

  order_report(orders, products)
hints:
  - "`price_of = dict(products)` turns the list of pairs into {name: price}."
  - "Then one loop over orders: `line = price_of[product] * qty`."
solution: |
  products = [("kettle", 25.0), ("toaster", 30.0), ("mug", 4.5)]
  orders = [("o1", "kettle", 2), ("o2", "toaster", 1), ("o3", "mug", 3)]

  def order_report(orders, products):
      price_of = dict(products)
      total = 0
      for order_id, product, qty in orders:
          line = price_of[product] * qty
          print(f"{order_id}: {qty} x {product} = {line}")
          total += line
      print("total:", total)

  order_report(orders, products)
explanation: |
  This is the same idea as a database index or a JOIN: build a lookup once, then each order costs one O(1)
  lookup instead of a scan of every product.
check:
  expected: |
    o1: 2 x kettle = 50.0
    o2: 1 x toaster = 30.0
    o3: 3 x mug = 13.5
    total: 93.5
  forbid: [nested-loop]
```

```exercise
id: cache-calls
title: Cache repeated work
difficulty: intermediate
instructions: |
  `count_paths(rows, cols)` counts routes through a grid moving only right or down. It is correct but
  recomputes the same sub-grids again and again. Add `@lru_cache(maxsize=None)` and print how many times the
  function body actually ran for `count_paths(10, 10)` (the starter counts calls).

  ```text
  48620
  body ran 99 times
  ```
starter: |
  from functools import lru_cache

  calls = 0

  def count_paths(rows, cols):
      global calls
      calls += 1
      if rows == 1 or cols == 1:
          return 1
      return count_paths(rows - 1, cols) + count_paths(rows, cols - 1)

  print(count_paths(10, 10))
  print("body ran", calls, "times")
hints:
  - "Put `@lru_cache(maxsize=None)` on the line directly above `def count_paths`."
  - "Without the cache the body runs 97,239 times; with it, each (rows, cols) pair is computed only once."
solution: |
  from functools import lru_cache

  calls = 0

  @lru_cache(maxsize=None)
  def count_paths(rows, cols):
      global calls
      calls += 1
      if rows == 1 or cols == 1:
          return 1
      return count_paths(rows - 1, cols) + count_paths(rows, cols - 1)

  print(count_paths(10, 10))
  print("body ran", calls, "times")
explanation: |
  There are only 10 × 10 = 100 different (rows, cols) pairs (and (1, 1) is never needed), so with caching the body
  runs 99 times instead of 97,239. Caching works here because the result depends only on the arguments.
check:
  expected: |
    48620
    body ran 99 times
  requires: [decorator]
```

```exercise
id: memory-generator
title: Save memory with a generator
difficulty: challenge
instructions: |
  `squares_list(n)` builds a full list just to add the numbers up. Write `squares_gen(n)` - a **generator
  function** (using `yield`) producing the same values - and compare memory with `sys.getsizeof`. Print the two
  totals and whether the generator object is smaller than the list.

  ```text
  333332833333500000 333332833333500000
  generator is smaller: True
  ```
starter: |
  import sys

  def squares_list(n):
      return [i * i for i in range(n)]

  # write squares_gen(n) here

  big_list = squares_list(1_000_000)
  gen = squares_gen(1_000_000)
  print(sum(squares_list(1_000_000)), sum(squares_gen(1_000_000)))
  print("generator is smaller:", sys.getsizeof(gen) < sys.getsizeof(big_list))
hints:
  - "`def squares_gen(n):` with `for i in range(n): yield i * i`."
  - "A generator object stays the same small size however many values it will produce."
solution: |
  import sys

  def squares_list(n):
      return [i * i for i in range(n)]

  def squares_gen(n):
      for i in range(n):
          yield i * i

  big_list = squares_list(1_000_000)
  gen = squares_gen(1_000_000)
  print(sum(squares_list(1_000_000)), sum(squares_gen(1_000_000)))
  print("generator is smaller:", sys.getsizeof(gen) < sys.getsizeof(big_list))
explanation: |
  The list holds a million numbers at once (about 8 MB just for the list's slots); the generator object is a
  couple of hundred bytes because it produces one value at a time. The totals are identical.
check:
  expected: |
    333332833333500000 333332833333500000
    generator is smaller: True
  requires: [yield]
```

```quiz
- id: q1
  question: What is the first step when a program is too slow?
  options:
    - Measure to find which part is actually slow
    - Rewrite everything in another language
    - Add more comments
    - Remove the tests
  answer: Measure to find which part is actually slow
  explanation: Profile with perf_counter, timeit or cProfile before changing anything.
- id: q2
  question: Why is `x in my_set` usually much faster than `x in my_list` for large collections?
  options:
    - Sets use hashing to jump straight to the item (O(1)), lists check item by item (O(n))
    - Sets are always sorted
    - Lists can't contain strings
    - Sets are stored on the graphics card
  answer: Sets use hashing to jump straight to the item (O(1)), lists check item by item (O(n))
  explanation: Dictionaries use the same idea for keys.
- id: q3
  question: A loop over n items contains another loop over the same n items. How does time grow?
  options:
    - O(n²) - doubling n makes it about four times slower
    - O(1) - always the same
    - O(n) - doubling n doubles the time
    - O(log n)
  answer: O(n²) - doubling n makes it about four times slower
  explanation: That's why nested loops over big data are a common bottleneck.
- id: q4
  question: Which tool lists the functions where a script spends its time?
  options:
    - cProfile
    - print
    - pip
    - venv
  answer: cProfile
  explanation: python -m cProfile -s cumtime script.py
- id: q5
  question: When does @lru_cache give correct results?
  options:
    - When the function's result depends only on its (hashable) arguments
    - For any function, always
    - Only for functions that print
    - Only for functions without arguments
  answer: When the function's result depends only on its (hashable) arguments
  explanation: Functions reading the clock, files or random numbers should not be cached blindly.
- id: q6
  question: How do generators reduce memory use?
  options:
    - They produce one value at a time instead of storing all values
    - They compress numbers
    - They store values on disk
    - They delete variables automatically
  answer: They produce one value at a time instead of storing all values
  explanation: Ideal for one pass over large data.
```
