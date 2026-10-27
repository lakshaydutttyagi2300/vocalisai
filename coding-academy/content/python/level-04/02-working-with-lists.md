---
id: py-4-2-working-with-lists
title: Working with lists - loops, totals, sorting and searching
track: python
level: 4
order: 2
minutes: 40
summary: Loop over lists, calculate totals and averages, sort and search, and avoid the classic traps of changing a list while looping.
objectives:
  - Loop over the items of a list (and over their indexes when needed)
  - Use sum, min, max, len and sorted, and the sort, count and index methods
  - Filter a list into a new list with a loop
  - Explain the difference between sorted(list) and list.sort()
  - Avoid modifying a list while looping over it
prerequisites: [py-4-1-lists, py-3-3-break-continue-nested]
tags: [list, iteration, for loop, sum, sorted, sort, count, index, filter, average]
---

## Simple explanation

Lists and `for` loops are best friends:

```python
prices = [4.5, 12.0, 3.25]
for price in prices:
    print("Price:", price)
```

Python has ready-made helpers for common list jobs:

| Helper | Gives you | Example with `[3, 1, 2]` |
|---|---|---|
| `len(lst)` | number of items | `3` |
| `sum(lst)` | total of numbers | `6` |
| `min(lst)` / `max(lst)` | smallest / largest | `1` / `3` |
| `sorted(lst)` | a **new** sorted list | `[1, 2, 3]` |
| `lst.sort()` | sorts **the list itself** | list becomes `[1, 2, 3]` |
| `lst.count(x)` | how many times x appears | `lst.count(2)` → `1` |
| `lst.index(x)` | position of the first x | `lst.index(2)` → `2` |

To **filter** (keep only some items), loop and append the ones you want to a new list.

## Real-world analogy

A list with a loop is like a **cashier scanning a basket**: pick up each item in turn, do the same thing with it
(add its price to the total), move on. `sorted` is like asking a colleague to make you a *sorted copy* of the
receipt; `.sort()` is rearranging the original receipt itself.

## Technical definition

- `for item in lst:` assigns each element in order. To get positions too, use `range(len(lst))` - or better,
  `enumerate(lst)`, which you will meet in Level 8.
- `sum` works on numbers; `min`/`max` on any comparable items (numbers, strings). On an empty list `min`/`max`
  raise `ValueError` and `sum` returns `0`.
- `sorted(iterable, reverse=False)` returns a new list; `lst.sort(reverse=False)` sorts in place and returns
  `None`.
- `lst.index(x)` raises `ValueError` if x is absent; check with `in` first.
- **Do not add or remove items from a list while looping over that same list** - items get skipped. Loop over
  a copy (`for x in lst[:]`) or build a new list.

## Step-by-step examples

**Example 1 - total and average**

```python
marks = [72, 88, 95, 61]
total = sum(marks)
average = total / len(marks)
print("Total:", total)
print("Average:", average)
```

Output:

```text
Total: 316
Average: 79.0
```

**Example 2 - the accumulator pattern by hand** (what `sum` does for you)

```python
total = 0
for mark in marks:
    total += mark
```

**Example 3 - filtering**

```python
marks = [72, 88, 95, 61, 49]
passed = []
for mark in marks:
    if mark >= 60:
        passed.append(mark)
print(passed)          # [72, 88, 95, 61]
print(len(passed), "passed")
```

**Example 4 - sorted vs sort**

```python
names = ["Zara", "amy", "Ben"]
print(sorted(names))               # ['Ben', 'Zara', 'amy']  (capitals first!)
print(sorted(names, key=str.lower))  # ['amy', 'Ben', 'Zara']
print(names)                       # unchanged: ['Zara', 'amy', 'Ben']
names.sort(reverse=True)
print(names)                       # ['amy', 'Zara', 'Ben']
```

`key=str.lower` tells sorted to compare lower-case versions (more on `key` in Level 8).

**Example 5 - count and index**

```python
votes = ["red", "blue", "red", "green", "red"]
print(votes.count("red"))      # 3
print(votes.index("green"))    # 3
```

**Example 6 - looping with positions**

```python
podium = ["Asha", "Ben", "Chen"]
for i in range(len(podium)):
    print(i + 1, podium[i])
```

Output: `1 Asha`, `2 Ben`, `3 Chen`.

## Common mistakes

- **`lst = lst.sort()`** → `lst` becomes `None`. Either `lst.sort()` alone or `lst = sorted(lst)`.
- **Removing while looping**:

  ```python
  nums = [1, 2, 2, 3]
  for n in nums:
      if n == 2:
          nums.remove(n)   # skips the second 2!
  ```

  Build a new list instead.
- **Average of an empty list** → ZeroDivisionError. Check `if lst:` first.
- **Mixed types**: `sorted([3, "2"])` → TypeError (cannot compare int and str).
- **Capital letters sort before lower-case** - use `key=str.lower` for human ordering.

## Practical application

Totals of expenses, average scores, the top 3 products, filtering out cancelled orders, counting votes - this is
everyday data processing. The CSV analyser and expense tracker projects are built from exactly these patterns.

## Revision notes

- `for item in lst:` visits each item; `range(len(lst))` gives indexes.
- `sum`, `min`, `max`, `len` - totals and extremes; average = `sum(lst) / len(lst)`.
- `sorted(lst)` new list; `lst.sort()` in place (returns None); `reverse=True`; `key=str.lower`.
- `lst.count(x)`, `lst.index(x)`.
- Filter = loop + if + append to a **new** list. Never remove from the list you are looping over.

```exercise
id: average-temp
title: Average temperature
difficulty: beginner
instructions: |
  Calculate and print the total and the average of the temperatures in the list, using `sum()` and `len()`.

  ```text
  Total: 140
  Average: 20.0
  ```
starter: |
  temps = [18, 21, 24, 19, 17, 22, 19]
hints:
  - "`total = sum(temps)`"
  - "`average = total / len(temps)`"
solution: |
  temps = [18, 21, 24, 19, 17, 22, 19]
  total = sum(temps)
  average = total / len(temps)
  print("Total:", total)
  print("Average:", average)
explanation: |
  `sum` adds every item; dividing by `len` (the number of items) gives the average. `/` returns a float.
check:
  expected: |
    Total: 140
    Average: 20.0
  requires: ["call:sum", "call:len"]
  variants:
    - replace: ["temps = [18, 21, 24, 19, 17, 22, 19]", "temps = [10, 20]"]
      expected: |
        Total: 30
        Average: 15.0
```

```exercise
id: long-words
title: Keep the long words
difficulty: beginner
instructions: |
  Build a new list `long_words` containing only the words with **more than 5 letters**, then print it.

  ```text
  ['banana', 'cherries', 'elderberry']
  ```
starter: |
  words = ["apple", "banana", "fig", "cherries", "kiwi", "elderberry"]
  long_words = []
hints:
  - "Loop with `for word in words:`"
  - "`if len(word) > 5:` then `long_words.append(word)`"
solution: |
  words = ["apple", "banana", "fig", "cherries", "kiwi", "elderberry"]
  long_words = []
  for word in words:
      if len(word) > 5:
          long_words.append(word)
  print(long_words)
explanation: |
  This is the filter pattern: loop, test each item, append the ones you keep to a new list. "apple" has exactly 5
  letters, so it is not "more than 5".
check:
  expected: |
    ['banana', 'cherries', 'elderberry']
  requires: [for, "method:append"]
```

```exercise
id: top-three
title: Top three scores
difficulty: intermediate
instructions: |
  Print the three highest scores from highest to lowest, then print the original list to show it was **not**
  changed. Use `sorted(...)` with `reverse=True` and slicing.

  ```text
  [99, 87, 85]
  [72, 99, 85, 61, 87, 70]
  ```
starter: |
  scores = [72, 99, 85, 61, 87, 70]
hints:
  - "`sorted(scores, reverse=True)` makes a new list from highest to lowest."
  - "Take the first three with `[:3]`."
solution: |
  scores = [72, 99, 85, 61, 87, 70]
  top = sorted(scores, reverse=True)[:3]
  print(top)
  print(scores)
explanation: |
  `sorted` returns a *new* list, so the original `scores` keeps its order. Slicing `[:3]` keeps the first three of
  the sorted copy.
check:
  expected: |
    [99, 87, 85]
    [72, 99, 85, 61, 87, 70]
  requires: ["call:sorted", slice]
```

```exercise
id: vote-count
title: Count the votes
difficulty: challenge
instructions: |
  `votes` holds the votes for a school election. Print each candidate **once**, in the order they first appear,
  with their number of votes. Then print the winner.

  ```text
  Asha: 4
  Ben: 2
  Chen: 3
  Winner: Asha
  ```

  Use a list called `candidates` to remember who you have already printed, and `votes.count(...)`.
starter: |
  votes = ["Asha", "Ben", "Asha", "Chen", "Chen", "Asha", "Ben", "Chen", "Asha"]
  candidates = []
hints:
  - "Loop over `votes`; if a name is not yet `in candidates`, append it."
  - "Then loop over `candidates` and print `name + \": \"` and `votes.count(name)`."
  - "For the winner, keep track of the best count so far while looping (or use `max(candidates, key=votes.count)`)."
solution: |
  votes = ["Asha", "Ben", "Asha", "Chen", "Chen", "Asha", "Ben", "Chen", "Asha"]
  candidates = []
  for name in votes:
      if name not in candidates:
          candidates.append(name)
  winner = ""
  best = 0
  for name in candidates:
      count = votes.count(name)
      print(name + ":", count)
      if count > best:
          best = count
          winner = name
  print("Winner:", winner)
explanation: |
  The first loop builds a list of unique names in order of appearance. The second prints each count and keeps the
  "best so far" - the maximum-finding pattern. (In Level 4's dictionaries lesson you will see a neater way.)
check:
  expected: |
    Asha: 4
    Ben: 2
    Chen: 3
    Winner: Asha
  requires: ["method:count"]
  variants:
    - replace: ['votes = ["Asha", "Ben", "Asha", "Chen", "Chen", "Asha", "Ben", "Chen", "Asha"]', 'votes = ["Zed", "Yan", "Yan"]']
      expected: |
        Zed: 1
        Yan: 2
        Winner: Yan
```

```quiz
- id: q1
  question: What does `sum([2, 4, 6]) / len([2, 4, 6])` give?
  type: text
  answer: ["4.0", "4"]
  explanation: 12 / 3 = 4.0 - the average.
- id: q2
  question: What is the difference between `sorted(lst)` and `lst.sort()`?
  options:
    - sorted returns a new sorted list; sort changes lst itself and returns None
    - They are identical
    - sort returns a new list; sorted changes the original
    - sorted only works on numbers
  answer: sorted returns a new sorted list; sort changes lst itself and returns None
  explanation: Use sorted when you want to keep the original order too.
- id: q3
  question: What does `["a", "b", "a"].count("a")` give?
  type: text
  answer: ["2"]
  explanation: count returns how many items equal the value.
- id: q4
  question: Why is removing items from a list while looping over it a bad idea?
  options:
    - Items can be skipped because positions shift during the loop
    - Python forbids it with a SyntaxError
    - It deletes the whole list
    - It makes the loop run forever every time
  answer: Items can be skipped because positions shift during the loop
  explanation: Build a new list (filter pattern) or loop over a copy instead.
- id: q5
  question: What does `sorted(["banana", "Apple", "cherry"])` return?
  options:
    - "['Apple', 'banana', 'cherry']"
    - "['banana', 'Apple', 'cherry']"
    - "['cherry', 'banana', 'Apple']"
    - "['apple', 'banana', 'cherry']"
  answer: "['Apple', 'banana', 'cherry']"
  explanation: Capital A comes before lower-case letters; here it happens to look alphabetical too.
- id: q6
  question: What happens with `max([])`?
  options:
    - ValueError - an empty list has no maximum
    - It returns 0
    - It returns None
    - It returns an empty list
  answer: ValueError - an empty list has no maximum
  explanation: Check that a list is not empty before using min or max.
```
