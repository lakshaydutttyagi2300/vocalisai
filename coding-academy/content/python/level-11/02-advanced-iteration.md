---
id: py-11-2-advanced-iteration
title: Advanced iteration with itertools and generators
track: python
level: 11
order: 2
minutes: 40
summary: Process data streams efficiently with generator pipelines and the itertools toolbox - chain, islice, groupby, accumulate, product, combinations and more.
objectives:
  - Build generator pipelines that process data one item at a time
  - Use itertools functions instead of writing loops by hand
  - Group sorted data with groupby and compute running totals with accumulate
  - Generate combinations and permutations
prerequisites: [py-8-3-iterators-generators-context]
tags: [itertools, generator, pipeline, chain, islice, groupby, accumulate, product, combinations, permutations, count, cycle, yield from, lazy]
---

## Simple explanation

A **generator pipeline** passes items through a series of steps, one at a time - like an assembly line -
without building big lists in memory:

```python
lines = ["10", "", "x", "25", "7"]

def non_empty(items):
    for item in items:
        if item:
            yield item

def numbers(items):
    for item in items:
        if item.isdigit():
            yield int(item)

print(sum(numbers(non_empty(lines))))      # 42
```

The **`itertools`** module is a toolbox of ready-made, fast iteration helpers:

```python
from itertools import chain, islice, count

print(list(chain([1, 2], [3], [4, 5])))          # [1, 2, 3, 4, 5]
print(list(islice(count(100, 5), 3)))            # [100, 105, 110]
```

## Real-world analogy

A pipeline is a **factory assembly line**: each station does one job and passes the item on. Nothing piles up
between stations, so even a million items need very little floor space (memory).

## Technical definition

- Generators are **lazy**: values are produced only when requested (`next`, `for`, `list`, `sum`...).
  A generator can be consumed **once**.
- `yield from iterable` yields every item of another iterable.
- Key `itertools` functions:
  - `count(start, step)`, `cycle(items)`, `repeat(x, n)` - infinite or repeated streams (combine with `islice`
    or a break!).
  - `chain(a, b, ...)` / `chain.from_iterable(list_of_lists)` - one stream from several.
  - `islice(it, stop)` / `islice(it, start, stop, step)` - slicing for any iterator.
  - `accumulate(it)` - running totals (or another function: `accumulate(it, max)`).
  - `groupby(it, key)` - groups **consecutive** items with the same key: **sort first**.
  - `pairwise(it)` - `(a, b), (b, c), ...` (Python 3.10+).
  - `product(a, b)`, `permutations(it, r)`, `combinations(it, r)` - combinatorics.
  - `takewhile(pred, it)`, `dropwhile(pred, it)`, `zip_longest(a, b, fillvalue=...)`, `batched(it, n)`
    (Python 3.12+).

## Step-by-step examples

**Example 1 - groupby (sort first!)**

```python
from itertools import groupby

sales = [("north", 10), ("south", 5), ("north", 7), ("south", 3)]
sales.sort(key=lambda s: s[0])
for region, rows in groupby(sales, key=lambda s: s[0]):
    print(region, sum(amount for _, amount in rows))
# north 17
# south 8
```

**Example 2 - running balance with accumulate**

```python
from itertools import accumulate

changes = [100, -30, -20, 50]
print(list(accumulate(changes)))    # [100, 70, 50, 100]
```

**Example 3 - combinations**

```python
from itertools import combinations, product

print(list(combinations("ABC", 2)))      # [('A', 'B'), ('A', 'C'), ('B', 'C')]
print(len(list(product(range(6), repeat=2))))   # 36 - all outcomes of two dice
```

## Common mistakes

- **`groupby` on unsorted data** - the same key appears in several separate groups.
- **Using a generator twice** - the second loop gets nothing. Recreate it or store a list.
- **`list(count())` or `list(cycle(...))`** - infinite; the program never finishes. Limit with `islice`.
- **Reading a groupby group after moving on** - each group is valid only until the next group is requested;
  use it (or `list()` it) inside the loop.
- **Writing complicated index loops** when an itertools function already does it.

## Practical application

Pipelines process log files, CSV exports and sensor data that don't fit in memory. `groupby` produces
per-category reports, `accumulate` gives running totals for budgets, `pairwise` compares each day with the
previous one, and `combinations`/`product` generate test cases or possible team line-ups.

## Revision notes

- Generator pipeline: small functions with `yield`, chained together; lazy and memory-friendly.
- `chain`, `islice`, `accumulate`, `groupby` (sort first), `pairwise`, `product`, `combinations`, `permutations`.
- Infinite iterators (`count`, `cycle`) need `islice` or `break`.
- Generators are single-use.

```exercise
id: generator-pipeline
title: Build a generator pipeline
difficulty: beginner
instructions: |
  Write two generator functions:

  - `clean(lines)` - yields each line stripped of spaces, skipping empty lines and lines starting with `#`
  - `to_numbers(lines)` - yields each line converted to a float

  Chain them to compute the total of the readings.

  ```text
  total: 61.5
  ```
starter: |
  readings = ["  12.5", "", "# sensor restarted", "20", "  ", "29.0  "]

  # write clean() and to_numbers() here

  print("total:", sum(to_numbers(clean(readings))))
hints:
  - "`def clean(lines):` with a for loop, `line = line.strip()`, `if not line or line.startswith(\"#\"): continue`, then `yield line`."
  - "`def to_numbers(lines): for line in lines: yield float(line)`"
solution: |
  readings = ["  12.5", "", "# sensor restarted", "20", "  ", "29.0  "]

  def clean(lines):
      for line in lines:
          line = line.strip()
          if not line or line.startswith("#"):
              continue
          yield line

  def to_numbers(lines):
      for line in lines:
          yield float(line)

  print("total:", sum(to_numbers(clean(readings))))
explanation: |
  Each stage handles one job and passes items along one at a time. With a million-line file, memory use would stay
  tiny because no stage builds a list.
check:
  expected: |
    total: 61.5
  requires: [yield]
```

```exercise
id: running-balance
title: Running balance and chained statements
difficulty: beginner
instructions: |
  Two monthly statements must be processed as one stream. Use `itertools.chain` to join them and
  `itertools.accumulate` to compute the balance after each transaction, starting from 0. Print the balances and
  the lowest balance reached.

  ```text
  [200, 150, 30, 130, 90, -10, 40]
  lowest: -10
  ```
starter: |
  from itertools import accumulate, chain

  january = [200, -50, -120]
  february = [100, -40, -100, 50]

  # your code here
hints:
  - "`balances = list(accumulate(chain(january, february)))`"
  - "`min(balances)` gives the lowest."
solution: |
  from itertools import accumulate, chain

  january = [200, -50, -120]
  february = [100, -40, -100, 50]

  balances = list(accumulate(chain(january, february)))
  print(balances)
  print("lowest:", min(balances))
explanation: |
  `chain` joins the statements without copying them into one big list, and `accumulate` adds each transaction to
  the running total - replacing a manual loop with a total variable.
check:
  expected: |
    [200, 150, 30, 130, 90, -10, 40]
    lowest: -10
  requires: [call:accumulate, call:chain]
```

```exercise
id: groupby-report
title: A report with groupby
difficulty: intermediate
instructions: |
  Using `itertools.groupby`, print each category with its number of products and total stock, in alphabetical
  order of category. Remember: sort first.

  ```text
  bakery: 2 products, 45 in stock
  dairy: 3 products, 31 in stock
  fruit: 1 products, 120 in stock
  ```
starter: |
  from itertools import groupby

  products = [
      ("milk", "dairy", 12), ("apples", "fruit", 120), ("bread", "bakery", 30),
      ("cheese", "dairy", 4), ("rolls", "bakery", 15), ("yoghurt", "dairy", 15),
  ]

  # your code here
hints:
  - "`products.sort(key=lambda p: p[1])` - sort by category."
  - "`for category, group in groupby(products, key=lambda p: p[1]):` then `rows = list(group)`."
  - "Count with `len(rows)`; total with `sum(p[2] for p in rows)`."
solution: |
  from itertools import groupby

  products = [
      ("milk", "dairy", 12), ("apples", "fruit", 120), ("bread", "bakery", 30),
      ("cheese", "dairy", 4), ("rolls", "bakery", 15), ("yoghurt", "dairy", 15),
  ]

  products.sort(key=lambda p: p[1])
  for category, group in groupby(products, key=lambda p: p[1]):
      rows = list(group)
      print(f"{category}: {len(rows)} products, {sum(p[2] for p in rows)} in stock")
explanation: |
  `groupby` only joins neighbouring items, so sorting by the same key first is essential. Turning each group into
  a list lets you use it twice (for the count and the sum).
check:
  expected: |
    bakery: 2 products, 45 in stock
    dairy: 3 products, 31 in stock
    fruit: 1 products, 120 in stock
  requires: [call:groupby]
```

```exercise
id: team-combinations
title: Choose teams with combinations
difficulty: challenge
instructions: |
  Each player has a skill score. Using `itertools.combinations`, find every team of 3 whose total skill is
  **exactly 20**, and print each as a sorted list of names, then the number of such teams. Process the teams in
  the order `combinations` produces them.

  ```text
  ['Ann', 'Bo', 'Eve']
  ['Ann', 'Cy', 'Eve']
  ['Bo', 'Cy', 'Dee']
  ['Dee', 'Eve', 'Fay']
  4 teams
  ```
starter: |
  from itertools import combinations

  skills = {"Ann": 9, "Bo": 4, "Cy": 4, "Dee": 12, "Eve": 7, "Fay": 1}

  # your code here
hints:
  - "`for team in combinations(skills, 3):` - iterating a dict gives its keys (names)."
  - "`if sum(skills[name] for name in team) == 20:`"
  - "Print `sorted(team)` and count the matches."
solution: |
  from itertools import combinations

  skills = {"Ann": 9, "Bo": 4, "Cy": 4, "Dee": 12, "Eve": 7, "Fay": 1}

  count = 0
  for team in combinations(skills, 3):
      if sum(skills[name] for name in team) == 20:
          print(sorted(team))
          count += 1
  print(count, "teams")
explanation: |
  `combinations(skills, 3)` produces every group of 3 different players exactly once (order doesn't matter, so
  Ann-Bo-Eve and Eve-Bo-Ann are the same team). With 6 players there are 20 possible teams - writing three
  nested loops by hand would be longer and easier to get wrong.
check:
  expected: |
    ['Ann', 'Bo', 'Eve']
    ['Ann', 'Cy', 'Eve']
    ['Bo', 'Cy', 'Dee']
    ['Dee', 'Eve', 'Fay']
    4 teams
  requires: [call:combinations]
  forbid: [nested-loop]
```

```quiz
- id: q1
  question: Why must data be sorted before using itertools.groupby?
  options:
    - groupby only groups neighbouring items with the same key
    - groupby sorts in reverse otherwise
    - groupby raises an error on unsorted data
    - It doesn't need to be sorted
  answer: groupby only groups neighbouring items with the same key
  explanation: Unsorted data gives the same key in several separate groups.
- id: q2
  question: What does `list(accumulate([5, 3, 2]))` return?
  options:
    - '[5, 8, 10]'
    - '[10]'
    - '[5, 3, 2]'
    - '[2, 3, 5]'
  answer: '[5, 8, 10]'
  explanation: accumulate gives running totals.
- id: q3
  question: What happens with `list(itertools.count())`?
  options:
    - It never finishes, because count() is infinite
    - It returns an empty list
    - It returns [0]
    - It raises a TypeError immediately
  answer: It never finishes, because count() is infinite
  explanation: Limit infinite iterators with islice or a break.
- id: q4
  question: What does `itertools.chain([1, 2], [3])` produce?
  options:
    - 1, 2, 3 as one stream
    - '[[1, 2], [3]]'
    - '(1, 2, 3) as a tuple of lists'
    - Only [3]
  answer: 1, 2, 3 as one stream
  explanation: chain joins iterables end to end without building a new list.
- id: q5
  question: How many results does `combinations("ABCD", 2)` give?
  options:
    - '6'
    - '12'
    - '4'
    - '16'
  answer: '6'
  explanation: AB, AC, AD, BC, BD, CD. permutations would give 12 because order matters there.
- id: q6
  question: Why are generator pipelines memory-friendly?
  options:
    - Items pass through one at a time instead of being stored in big lists
    - Generators compress data
    - They delete the input file
    - They run on the graphics card
  answer: Items pass through one at a time instead of being stored in big lists
  explanation: Laziness means only the current item needs to be in memory.
```
