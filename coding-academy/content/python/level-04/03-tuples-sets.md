---
id: py-4-3-tuples-sets
title: Tuples and sets
track: python
level: 4
order: 3
minutes: 35
summary: Tuples are fixed, ordered groups of values; sets are unordered collections with no duplicates - perfect for membership tests and comparing groups.
objectives:
  - Create tuples, unpack them into variables, and explain why they cannot change
  - Create sets and use them to remove duplicates
  - Use set operations - union, intersection, difference
  - Choose between a list, a tuple and a set for a simple task
prerequisites: [py-4-2-working-with-lists]
tags: [tuple, set, unpacking, immutable, union, intersection, difference, duplicates]
---

## Simple explanation

**Tuples** look like lists but use round brackets and **cannot be changed** after creation:

```python
point = (3, 4)
birthday = (1995, 7, 21)
print(point[0])       # 3
```

Use a tuple for a small group of values that belong together and should not change - coordinates, a date, an RGB
colour. You can **unpack** a tuple into separate variables:

```python
x, y = point          # x = 3, y = 4
```

**Sets** use curly brackets, have **no order** and **no duplicates**:

```python
colours = {"red", "blue", "red", "green"}
print(colours)        # {'red', 'blue', 'green'}  (order may vary)
```

Sets are great for: removing duplicates, fast "is this in the group?" checks, and comparing groups
("which customers bought both products?").

## Real-world analogy

- A **tuple** is like a **printed date on a ticket** - a fixed group (day, month, year) that you read but do not
  edit.
- A **set** is like a **bag of unique stickers**: there is no first or last sticker, and a duplicate sticker is
  simply not added. Comparing two people's bags tells you which stickers they share.

## Technical definition

- **Tuple**: an ordered, **immutable** sequence. Indexing and slicing work; item assignment raises
  `TypeError`. A one-item tuple needs a trailing comma: `(5,)`. Tuples can be used as dictionary keys.
- **Unpacking**: `a, b, c = some_tuple` - the number of names must equal the number of items (else
  `ValueError`). Swapping uses it: `a, b = b, a`.
- **Set**: an unordered collection of **unique, hashable** items (numbers, strings, tuples - not lists).
  `set()` creates an empty set (`{}` is an empty *dictionary*!).
  - `s.add(x)`, `s.remove(x)` (KeyError if missing), `s.discard(x)` (no error).
  - Operations: `a | b` union (in either), `a & b` intersection (in both), `a - b` difference (in a, not b),
    `a ^ b` symmetric difference (in exactly one).
  - Membership `x in s` is very fast, even for huge sets.
- `set(some_list)` removes duplicates (order is lost); `sorted(set(lst))` gives a sorted list of unique values.

## Step-by-step examples

**Example 1 - tuples and unpacking**

```python
location = ("Mumbai", 19.07, 72.88)
city, lat, lon = location
print(city, "is at", lat, lon)
```

Output: `Mumbai is at 19.07 72.88`

**Example 2 - tuples cannot change**

```python
point = (3, 4)
point[0] = 10
```

```text
TypeError: 'tuple' object does not support item assignment
```

**Example 3 - removing duplicates**

```python
visits = ["home", "about", "home", "contact", "about", "home"]
unique_pages = set(visits)
print(len(unique_pages), "different pages")
print(sorted(unique_pages))
```

Output:

```text
3 different pages
['about', 'contact', 'home']
```

**Example 4 - comparing groups**

```python
python_class = {"Asha", "Ben", "Chen", "Diya"}
sql_class = {"Ben", "Diya", "Elena"}
print(python_class & sql_class)   # both:            {'Ben', 'Diya'}
print(python_class | sql_class)   # either:          all five names
print(python_class - sql_class)   # Python only:     {'Asha', 'Chen'}
```

(Sets print in an unpredictable order; wrap them in `sorted(...)` when you need a fixed order.)

**Example 5 - swapping with tuple unpacking**

```python
a, b = 1, 2
a, b = b, a
print(a, b)     # 2 1
```

## Common mistakes

- **`{}` is not an empty set** - it is an empty dictionary. Use `set()`.
- **Expecting set order**: sets have no positions - `my_set[0]` is a TypeError.
- **Putting lists in a set**: `{[1, 2]}` → TypeError (lists are unhashable). Use tuples.
- **Forgetting the comma in a one-item tuple**: `(5)` is just the number 5; `(5,)` is a tuple.
- **Unpacking the wrong number of values**: `x, y = (1, 2, 3)` → ValueError.

## Practical application

Tuples: returning several values from a function (Level 6), coordinates, database rows (each row from Python's
`sqlite3` is a tuple!). Sets: unique visitors, tags, "customers who bought A but not B", detecting duplicates in
data-quality checks.

## Revision notes

- Tuple `(a, b)`: ordered, cannot change, can be unpacked `x, y = t`. One item: `(5,)`.
- Set `{a, b}`: unordered, unique items. Empty set: `set()`.
- `set(lst)` removes duplicates; `sorted(set(lst))` → sorted unique list.
- `|` union, `&` intersection, `-` difference, `^` in exactly one.
- `add`, `remove`, `discard`; `x in s` is fast.

```exercise
id: unpack-tuple
title: Unpack a tuple
difficulty: beginner
instructions: |
  The tuple `product` holds a name, a price and a quantity. **Unpack** it into three variables `name`, `price`
  and `qty` in one line, then print the line below using those variables.

  ```text
  3 x Notebook = 7.5
  ```
starter: |
  product = ("Notebook", 2.5, 3)
hints:
  - "`name, price, qty = product`"
  - "`print(qty, \"x\", name, \"=\", price * qty)`"
solution: |
  product = ("Notebook", 2.5, 3)
  name, price, qty = product
  print(qty, "x", name, "=", price * qty)
explanation: |
  Unpacking assigns the tuple's items, in order, to the variables on the left.
check:
  expected: |
    3 x Notebook = 7.5
  tests:
    - name: the three variables were unpacked from the tuple
      code: |
        assert (name, price, qty) == product
  forbid_text: ["7.5"]
```

```exercise
id: unique-tags
title: Unique tags
difficulty: beginner
instructions: |
  Print how many **different** tags are in the list, then the different tags in alphabetical order.

  ```text
  4
  ['python', 'sql', 'tips', 'web']
  ```
starter: |
  tags = ["python", "sql", "python", "web", "tips", "sql", "python"]
hints:
  - "`set(tags)` removes duplicates."
  - "`sorted(...)` turns the set into an alphabetical list."
solution: |
  tags = ["python", "sql", "python", "web", "tips", "sql", "python"]
  unique = set(tags)
  print(len(unique))
  print(sorted(unique))
explanation: |
  Converting to a set keeps one copy of each value. Sets have no order, so `sorted` produces a predictable list.
check:
  expected: |
    4
    ['python', 'sql', 'tips', 'web']
  requires: ["call:set"]
```

```exercise
id: compare-groups
title: Which friends like both?
difficulty: intermediate
instructions: |
  Using set operations, print (each as a sorted list):

  1. friends who like **both** tea and coffee
  2. friends who like tea but **not** coffee
  3. **everyone** who likes at least one of them

  ```text
  ['Ben', 'Diya']
  ['Asha']
  ['Asha', 'Ben', 'Chen', 'Diya', 'Emil']
  ```
starter: |
  tea = {"Asha", "Ben", "Diya"}
  coffee = {"Ben", "Chen", "Diya", "Emil"}
hints:
  - "Both: `tea & coffee`. Tea only: `tea - coffee`. Either: `tea | coffee`."
  - "Wrap each in `sorted(...)` so the order is predictable."
solution: |
  tea = {"Asha", "Ben", "Diya"}
  coffee = {"Ben", "Chen", "Diya", "Emil"}
  print(sorted(tea & coffee))
  print(sorted(tea - coffee))
  print(sorted(tea | coffee))
explanation: |
  `&` keeps names in both sets, `-` keeps names in the first but not the second, `|` keeps names in either.
check:
  expected: |
    ['Ben', 'Diya']
    ['Asha']
    ['Asha', 'Ben', 'Chen', 'Diya', 'Emil']
  require_text: ["&", "-", "|"]
```

```exercise
id: first-duplicate
title: Find the first repeated word
difficulty: challenge
instructions: |
  Ask `Sentence: ` and print the first word that appears **for the second time** (compare in lower case), or
  `No repeats` if every word is different. Use a set to remember the words you have already seen.

  ```text
  Sentence: the cat saw the dog
  First repeat: the
  ```

  Tip: `sentence.lower().split()` gives a list of lower-case words (more on `split` in Level 5).
starter: |
  sentence = input("Sentence: ")
  seen = set()
hints:
  - "Loop over `sentence.lower().split()`."
  - "If the word is already `in seen`, print it and `break`; otherwise `seen.add(word)`."
  - "To print `No repeats` only when the loop finishes without a break, use a flag variable."
solution: |
  sentence = input("Sentence: ")
  seen = set()
  repeat = None
  for word in sentence.lower().split():
      if word in seen:
          repeat = word
          break
      seen.add(word)
  if repeat:
      print("First repeat:", repeat)
  else:
      print("No repeats")
explanation: |
  Checking `word in seen` is fast for sets, even with thousands of words. The flag `repeat` remembers whether a
  repeat was found.
stdin: "the cat saw the dog"
check:
  cases:
    - {stdin: "the cat saw the dog", expected: "Sentence: the cat saw the dog\nFirst repeat: the\n"}
    - {stdin: "One two ONE two", expected: "Sentence: One two ONE two\nFirst repeat: one\n"}
    - {stdin: "all words differ", expected: "Sentence: all words differ\nNo repeats\n"}
  requires: ["method:add"]
```

```quiz
- id: q1
  question: What happens when you run `t = (1, 2, 3)` then `t[0] = 9`?
  options:
    - TypeError - tuples cannot be changed
    - t becomes (9, 2, 3)
    - t becomes (1, 2, 3, 9)
    - Nothing
  answer: TypeError - tuples cannot be changed
  explanation: Tuples are immutable.
- id: q2
  question: What does `len({1, 2, 2, 3, 3, 3})` give?
  type: text
  answer: ["3"]
  explanation: A set keeps only unique values - {1, 2, 3}.
- id: q3
  question: Which creates an **empty set**?
  options:
    - set()
    - "{}"
    - "[]"
    - "()"
  answer: set()
  explanation: "`{}` creates an empty dictionary, not a set."
- id: q4
  question: For sets a = {1, 2, 3} and b = {2, 3, 4}, what is `a & b`?
  options:
    - "{2, 3}"
    - "{1, 2, 3, 4}"
    - "{1}"
    - "{1, 4}"
  answer: "{2, 3}"
  explanation: "& is intersection - the items in both sets."
- id: q5
  question: After `x, y = (10, 20)`, what is y?
  type: text
  answer: ["20"]
  explanation: Unpacking assigns items in order.
- id: q6
  question: Which is the best choice to store a fixed (latitude, longitude) pair?
  options:
    - A tuple
    - A set
    - A list that you keep changing
    - Two separate files
  answer: A tuple
  explanation: A small, fixed, ordered group of values is exactly what tuples are for. A set would lose the order.
```
