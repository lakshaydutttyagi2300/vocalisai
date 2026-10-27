---
id: py-4-4-dictionaries
title: Dictionaries - looking things up by name
track: python
level: 4
order: 4
minutes: 40
summary: Store values under meaningful keys - create, read, update and delete entries, loop over keys and values, and count things with a dictionary.
objectives:
  - Create dictionaries of key-value pairs
  - Read values with [] and get(), and avoid KeyError
  - Add, change and delete entries
  - Loop over keys, values and items
  - Use a dictionary to count occurrences
prerequisites: [py-4-3-tuples-sets]
tags: [dictionary, dict, key, value, get, items, keys, values, counting, KeyError]
---

## Simple explanation

A list finds things by **position** (0, 1, 2...). A **dictionary** finds things by **name** - a **key**:

```python
person = {"name": "Asha", "age": 30, "city": "Pune"}
print(person["name"])     # Asha
```

Each entry is a **key: value** pair. Keys are usually strings (they can also be numbers or tuples); values can be
anything - even lists or other dictionaries.

```python
person["age"] = 31            # change a value
person["email"] = "a@x.com"   # add a new key
del person["city"]            # remove a key
```

To read a key that might not exist, use `get` - it returns `None` (or a default you choose) instead of crashing:

```python
print(person.get("phone", "no phone"))   # no phone
```

## Real-world analogy

A dictionary is like a **real dictionary** or a **phone's contacts app**: you look up a word (the key) to find its
definition (the value). You never ask for "contact number 17" - you ask for "Mum".

## Technical definition

- A **dict** is a mutable mapping from **unique, hashable keys** to values. Since Python 3.7 dictionaries keep
  **insertion order**.
- Create: `{"a": 1, "b": 2}`, `dict(a=1, b=2)`, or empty `{}`.
- Read: `d[key]` (raises `KeyError` if missing) or `d.get(key, default=None)`.
- Write: `d[key] = value` adds or replaces. `del d[key]` removes; `d.pop(key, default)` removes and returns.
- `key in d` checks **keys** (not values).
- Views: `d.keys()`, `d.values()`, `d.items()` (pairs as tuples). `for key in d:` loops over keys.
- `len(d)` = number of pairs. Assigning to an existing key **overwrites** - keys are unique.
- **Counting pattern**: `counts[x] = counts.get(x, 0) + 1`.

## Step-by-step examples

**Example 1 - a product record**

```python
product = {"name": "Kettle", "price": 29.99, "stock": 12}
print(product["name"], "costs", product["price"])
product["stock"] -= 1
print("Stock left:", product["stock"])
```

Output:

```text
Kettle costs 29.99
Stock left: 11
```

**Example 2 - KeyError and get()**

```python
capitals = {"France": "Paris", "Japan": "Tokyo"}
print(capitals.get("Italy"))              # None
print(capitals.get("Italy", "unknown"))   # unknown
print(capitals["Italy"])                  # KeyError: 'Italy'
```

**Example 3 - looping**

```python
stock = {"apples": 12, "pears": 0, "plums": 7}
for fruit, amount in stock.items():
    print(fruit, "->", amount)
print("Total items:", sum(stock.values()))
```

Output:

```text
apples -> 12
pears -> 0
plums -> 7
Total items: 19
```

`items()` gives (key, value) tuples, which we unpack into `fruit, amount`.

**Example 4 - counting words**

```python
words = ["red", "blue", "red", "green", "red", "blue"]
counts = {}
for w in words:
    counts[w] = counts.get(w, 0) + 1
print(counts)
```

Output: `{'red': 3, 'blue': 2, 'green': 1}`. The first time a word appears, `get` returns 0.

**Example 5 - a lookup table instead of many ifs** (Input: `fr`)

```python
greetings = {"en": "Hello", "fr": "Bonjour", "es": "Hola", "hi": "Namaste"}
lang = input("Language code: ")
print(greetings.get(lang, "Hello"))
```

Output: `Language code: fr` then `Bonjour`.

## Common mistakes

- **`KeyError`** when reading a missing key with `[]` - use `in` or `get`.
- **Thinking `in` checks values**: `"Paris" in capitals` is `False` - it checks keys. Use
  `"Paris" in capitals.values()`.
- **Duplicate keys**: `{"a": 1, "a": 2}` keeps only the last value.
- **Using a list as a key** → TypeError (unhashable). Use a tuple.
- **Changing a dict's size while looping over it** → RuntimeError. Loop over `list(d)` if you need to delete.
- **Key spelling/case**: `"Name"` and `"name"` are different keys.

## Practical application

JSON data from web APIs becomes dictionaries in Python. Configuration settings, a product catalogue (code →
details), word counts, grouping expenses by category, caching results - dictionaries are one of the most used
tools in all of Python.

## Revision notes

- `d = {"key": value}`; read `d["key"]` or safely `d.get("key", default)`.
- Add/change `d["key"] = value`; delete `del d["key"]` or `d.pop("key")`.
- `key in d` checks keys. Loop: `for k in d`, `for v in d.values()`, `for k, v in d.items()`.
- Count: `counts[x] = counts.get(x, 0) + 1`.
- Keys are unique and must be hashable (str, int, tuple); values can be anything.

```exercise
id: contact-card
title: A contact card
difficulty: beginner
instructions: |
  Starting with the `contact` dictionary:

  1. change the phone number to `"555-0199"`,
  2. add a key `"email"` with the value `"maya@example.com"`,
  3. print the name, phone and email on separate lines.

  ```text
  Maya
  555-0199
  maya@example.com
  ```
starter: |
  contact = {"name": "Maya", "phone": "555-0100"}
hints:
  - "`contact[\"phone\"] = \"555-0199\"` replaces the value."
  - "Adding a new key uses the same syntax: `contact[\"email\"] = ...`"
solution: |
  contact = {"name": "Maya", "phone": "555-0100"}
  contact["phone"] = "555-0199"
  contact["email"] = "maya@example.com"
  print(contact["name"])
  print(contact["phone"])
  print(contact["email"])
explanation: |
  Assigning to a key replaces its value if the key exists, or adds the pair if it does not.
check:
  expected: |
    Maya
    555-0199
    maya@example.com
  tests:
    - name: the dictionary was updated
      code: |
        assert contact == {"name": "Maya", "phone": "555-0199", "email": "maya@example.com"}, contact
```

```exercise
id: price-lookup
title: Price lookup
difficulty: beginner
instructions: |
  Ask `Item: ` and print its price from the `prices` dictionary. If the item is not in the dictionary, print
  `Sorry, we don't sell that` (no crash!).

  ```text
  Item: tea
  tea costs 2.5
  ```
starter: |
  prices = {"tea": 2.5, "coffee": 3.0, "cake": 4.25}
  item = input("Item: ")
hints:
  - "Check first: `if item in prices:`"
  - "Otherwise (`else:`) print the sorry message."
solution: |
  prices = {"tea": 2.5, "coffee": 3.0, "cake": 4.25}
  item = input("Item: ")
  if item in prices:
      print(item, "costs", prices[item])
  else:
      print("Sorry, we don't sell that")
explanation: |
  `in` checks whether the key exists, so `prices[item]` is only read when it is safe. `prices.get(item)` with a
  check for `None` would also work.
stdin: "tea"
check:
  cases:
    - {stdin: "tea", expected: "Item: tea\ntea costs 2.5\n"}
    - {stdin: "cake", expected: "Item: cake\ncake costs 4.25\n"}
    - {stdin: "pizza", expected: "Item: pizza\nSorry, we don't sell that\n"}
```

```exercise
id: letter-count
title: Count the letters
difficulty: intermediate
instructions: |
  Ask `Word: ` and count how many times each letter appears, using a dictionary. Then print each letter and its
  count in the order the letters first appear:

  ```text
  Word: banana
  b 1
  a 3
  n 2
  ```
starter: |
  word = input("Word: ")
  counts = {}
hints:
  - "Loop over the letters: `for letter in word:`"
  - "Counting pattern: `counts[letter] = counts.get(letter, 0) + 1`"
  - "Then `for letter, n in counts.items(): print(letter, n)`"
solution: |
  word = input("Word: ")
  counts = {}
  for letter in word:
      counts[letter] = counts.get(letter, 0) + 1
  for letter, n in counts.items():
      print(letter, n)
explanation: |
  `get(letter, 0)` returns 0 the first time a letter is seen. Dictionaries remember insertion order, so the
  letters print in order of first appearance.
stdin: "banana"
check:
  cases:
    - {stdin: "banana", expected: "Word: banana\nb 1\na 3\nn 2\n"}
    - {stdin: "level", expected: "Word: level\nl 2\ne 2\nv 1\n"}
  requires: [dict]
```

```exercise
id: expenses-by-category
title: Expenses by category
difficulty: challenge
instructions: |
  `expenses` is a list of `(category, amount)` tuples. Build a dictionary `totals` with the total amount per
  category, then print each category and total, and finally the category where the most was spent.

  ```text
  food 47.5
  transport 21.0
  fun 30.0
  Biggest: food
  ```
starter: |
  expenses = [("food", 12.5), ("transport", 6.0), ("fun", 30.0), ("food", 35.0), ("transport", 15.0)]
  totals = {}
hints:
  - "Loop with unpacking: `for category, amount in expenses:`"
  - "Add up: `totals[category] = totals.get(category, 0) + amount`"
  - "Biggest: `max(totals, key=totals.get)` returns the key with the largest value - or track the best so far in a loop."
solution: |
  expenses = [("food", 12.5), ("transport", 6.0), ("fun", 30.0), ("food", 35.0), ("transport", 15.0)]
  totals = {}
  for category, amount in expenses:
      totals[category] = totals.get(category, 0) + amount
  for category, total in totals.items():
      print(category, total)
  print("Biggest:", max(totals, key=totals.get))
explanation: |
  This "group and sum" pattern is the Python version of SQL's `GROUP BY ... SUM(...)`. `max(totals, key=totals.get)`
  compares the keys by their values.
check:
  expected: |
    food 47.5
    transport 21.0
    fun 30.0
    Biggest: food
  tests:
    - name: totals holds the right sums
      code: |
        assert totals == {"food": 47.5, "transport": 21.0, "fun": 30.0}, totals
```

```quiz
- id: q1
  question: 'What does `{"a": 1, "b": 2}["b"]` give?'
  type: text
  answer: ["2"]
  explanation: Square brackets with a key return its value.
- id: q2
  question: What does `d.get("missing")` return when the key does not exist?
  options:
    - None
    - KeyError
    - 0
    - An empty string
  answer: None
  explanation: get returns None (or the default you pass) instead of raising KeyError.
- id: q3
  question: 'With `capitals = {"France": "Paris"}`, what is `"Paris" in capitals`?'
  type: text
  answer: ["False"]
  explanation: in checks keys, not values. Use "Paris" in capitals.values().
- id: q4
  question: 'What does `d = {"x": 1}` followed by `d["x"] = 5` do?'
  options:
    - Replaces the value of x with 5
    - Adds a second x key
    - Raises an error
    - Deletes x
  answer: Replaces the value of x with 5
  explanation: Keys are unique; assigning to an existing key overwrites its value.
- id: q5
  question: Which loop gives you both keys and values?
  options:
    - "for k, v in d.items():"
    - "for k, v in d:"
    - "for k in d.values():"
    - "for v in d.keys():"
  answer: "for k, v in d.items():"
  explanation: items() yields (key, value) pairs, which can be unpacked.
- id: q6
  question: What is the classic one-line counting pattern?
  options:
    - "counts[x] = counts.get(x, 0) + 1"
    - "counts[x] += 1 (always works)"
    - "counts.append(x)"
    - "counts = counts + x"
  answer: "counts[x] = counts.get(x, 0) + 1"
  explanation: counts[x] += 1 fails with KeyError the first time x is seen; get(x, 0) handles that.
```
