---
id: py-4-1-lists
title: Lists - storing many values in order
track: python
level: 4
order: 1
minutes: 40
summary: Create lists, read items by position (indexing), take parts of a list (slicing), and add, change and remove items.
objectives:
  - Create lists and find their length with len()
  - Read items with positive and negative indexes
  - Take sub-lists with slicing
  - Change, add and remove items (append, insert, remove, pop, del)
  - Check membership with in
prerequisites: [py-3-1-for-loops]
tags: [list, index, slicing, append, insert, remove, pop, len, mutable]
---

## Simple explanation

So far each variable held **one** value. A **list** holds **many values in order**:

```python
fruits = ["apple", "banana", "cherry"]
```

Square brackets `[ ]`, items separated by commas. Each item has a **position** called an **index**, and
**counting starts at 0**:

| Index | 0 | 1 | 2 |
|---|---|---|---|
| Item | "apple" | "banana" | "cherry" |
| Negative index | -3 | -2 | -1 |

```python
print(fruits[0])    # apple  (the first item)
print(fruits[-1])   # cherry (the last item)
print(len(fruits))  # 3      (how many items)
```

Lists can **change**: you can replace items, add new ones and remove old ones.

## Real-world analogy

A list is like a **numbered shopping list** or a **row of lockers**. Each locker has a number on the door
(the index) - but in Python the first locker is number 0. You can open a locker by its number, put something
new in it, add a locker at the end, or take one away.

## Technical definition

- A **list** is an ordered, **mutable** (changeable) sequence. It can hold any types, even mixed:
  `[1, "two", 3.0, True]`.
- **Indexing**: `lst[i]` - from 0 to `len(lst) - 1`; negative indexes count from the end (`-1` is last).
  An index outside the range raises `IndexError`.
- **Slicing**: `lst[start:stop]` returns a **new list** from `start` up to but not including `stop`.
  Omit `start` for "from the beginning", omit `stop` for "to the end". `lst[start:stop:step]` adds a step;
  `lst[::-1]` is a reversed copy.
- **Changing**: `lst[i] = value` replaces an item.
- **Methods** (functions belonging to the list, called with a dot):
  - `append(x)` add to the end; `insert(i, x)` add at position i;
  - `remove(x)` delete the first item equal to x (ValueError if absent);
  - `pop()` remove and return the last item; `pop(i)` remove and return item i;
  - `del lst[i]` statement deletes by index.
- `x in lst` → `True` if any item equals x.
- `[]` is an empty list. Lists are **truthy** when not empty.

## Step-by-step examples

**Example 1 - indexing**

```python
scores = [72, 85, 90, 64]
print(scores[1])        # 85
print(scores[-1])       # 64
print(len(scores))      # 4
```

**Example 2 - slicing**

```python
letters = ["a", "b", "c", "d", "e"]
print(letters[1:3])     # ['b', 'c']
print(letters[:2])      # ['a', 'b']
print(letters[2:])      # ['c', 'd', 'e']
print(letters[::-1])    # ['e', 'd', 'c', 'b', 'a']
```

**Example 3 - changing, adding and removing**

```python
tasks = ["wash car", "buy milk"]
tasks.append("call mum")          # ['wash car', 'buy milk', 'call mum']
tasks.insert(0, "breakfast")      # ['breakfast', 'wash car', 'buy milk', 'call mum']
tasks[1] = "wash bike"            # ['breakfast', 'wash bike', 'buy milk', 'call mum']
tasks.remove("buy milk")          # ['breakfast', 'wash bike', 'call mum']
done = tasks.pop()                # done = 'call mum'; tasks = ['breakfast', 'wash bike']
print(tasks, done)
```

Output: `['breakfast', 'wash bike'] call mum`

**Example 4 - membership**

```python
guests = ["Asha", "Ben", "Chen"]
if "Ben" in guests:
    print("Ben is invited")
```

**Example 5 - building a list from input** (Input: `3`, `7`, `5`)

```python
numbers = []
for i in range(3):
    numbers.append(int(input("Number: ")))
print(numbers)
```

Output after the prompts: `[3, 7, 5]`

## Common mistakes

- **Off-by-one**: the last item is `lst[len(lst) - 1]`, not `lst[len(lst)]` (IndexError). Use `lst[-1]`.
- **Thinking slices include the stop index**: `lst[1:3]` gives items 1 and 2 only.
- **`remove` vs `pop`**: `remove` takes a *value*, `pop` takes an *index*.
- **Using the result of `append`**: `lst = lst.append(4)` sets `lst` to `None`! `append` changes the list in
  place and returns nothing.
- **Removing an item that is not there** → `ValueError`. Check with `in` first.

## Practical application

Lists are everywhere: lines of a file, rows from a database, items in a shopping basket, scores in a game,
results from a web API. Almost every project from here on stores data in lists.

## Revision notes

- `items = ["a", "b"]`; `len(items)`; `items[0]` first; `items[-1]` last.
- Slicing `items[start:stop]` - stop excluded; `items[::-1]` reversed copy.
- Change `items[i] = x`; add `append(x)`, `insert(i, x)`; remove `remove(x)`, `pop()`, `pop(i)`, `del items[i]`.
- `x in items` checks membership.
- `append` returns `None` - never write `lst = lst.append(x)`.

```exercise
id: first-last
title: First, last and how many
difficulty: beginner
instructions: |
  Using the list `planets`, print the **first** planet, the **last** planet, and the **number** of planets,
  each on its own line. Use indexing and `len()` - do not type the names.

  ```text
  Mercury
  Neptune
  8
  ```
starter: |
  planets = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]
hints:
  - "The first item is at index 0."
  - "The last item is at index -1, and `len(planets)` counts the items."
solution: |
  planets = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]
  print(planets[0])
  print(planets[-1])
  print(len(planets))
explanation: |
  Index 0 is the first item; index -1 counts from the end. `len` returns how many items the list contains.
check:
  expected: |
    Mercury
    Neptune
    8
  requires: ["call:len"]
  variants:
    - replace: ['planets = ["Mercury", "Venus", "Earth", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune"]', 'planets = ["Pluto", "Eris"]']
      expected: |
        Pluto
        Eris
        2
```

```exercise
id: todo-list
title: Edit a to-do list
difficulty: beginner
instructions: |
  Starting from the list in the starter code, use list methods to:

  1. add `"pay bills"` to the end,
  2. insert `"make coffee"` at the beginning,
  3. remove `"watch TV"`,

  then print the list. Output:

  ```text
  ['make coffee', 'tidy desk', 'read book', 'pay bills']
  ```
starter: |
  todo = ["tidy desk", "watch TV", "read book"]
hints:
  - "`todo.append(\"pay bills\")` adds at the end."
  - "`todo.insert(0, \"make coffee\")` adds at position 0."
  - "`todo.remove(\"watch TV\")` removes by value."
solution: |
  todo = ["tidy desk", "watch TV", "read book"]
  todo.append("pay bills")
  todo.insert(0, "make coffee")
  todo.remove("watch TV")
  print(todo)
explanation: |
  These methods change the list *in place*. Printing a list shows it with brackets and quotes.
check:
  expected: |
    ['make coffee', 'tidy desk', 'read book', 'pay bills']
  requires: ["method:append", "method:insert", "method:remove"]
```

```exercise
id: slices
title: Slicing practice
difficulty: intermediate
instructions: |
  `months` holds the 12 months. Using **slicing only** (no loops), print:

  1. the first three months
  2. the last three months
  3. every second month starting with January
  4. the months in reverse order

  ```text
  ['Jan', 'Feb', 'Mar']
  ['Oct', 'Nov', 'Dec']
  ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov']
  ['Dec', 'Nov', 'Oct', 'Sep', 'Aug', 'Jul', 'Jun', 'May', 'Apr', 'Mar', 'Feb', 'Jan']
  ```
starter: |
  months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
hints:
  - "`months[:3]` - from the start up to (not including) index 3."
  - "`months[-3:]` - the last three. `months[::2]` - every second item."
  - "`months[::-1]` - reversed."
solution: |
  months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
  print(months[:3])
  print(months[-3:])
  print(months[::2])
  print(months[::-1])
explanation: |
  Slices are `[start:stop:step]`. Missing values mean "from the beginning", "to the end" and "step 1". A negative
  step walks backwards.
check:
  expected: |
    ['Jan', 'Feb', 'Mar']
    ['Oct', 'Nov', 'Dec']
    ['Jan', 'Mar', 'May', 'Jul', 'Sep', 'Nov']
    ['Dec', 'Nov', 'Oct', 'Sep', 'Aug', 'Jul', 'Jun', 'May', 'Apr', 'Mar', 'Feb', 'Jan']
  requires: [slice]
  forbid: [for, while]
```

```exercise
id: collect-numbers
title: Collect numbers until 0
difficulty: challenge
instructions: |
  Keep asking `Number (0 to stop): ` and append each number to a list. When the user types 0, stop (do not add
  the 0) and print the list, the largest number and the smallest number.

  ```text
  Number (0 to stop): 5
  Number (0 to stop): 12
  Number (0 to stop): 3
  Number (0 to stop): 0
  [5, 12, 3]
  Largest: 12
  Smallest: 3
  ```

  You may use Python's built-in `max()` and `min()` functions. You can assume at least one number is entered.
starter: |
  numbers = []
hints:
  - "A `while True:` loop with `break` when the number is 0 works well."
  - "`numbers.append(n)` inside the loop."
  - "`max(numbers)` and `min(numbers)` after the loop."
solution: |
  numbers = []
  while True:
      n = int(input("Number (0 to stop): "))
      if n == 0:
          break
      numbers.append(n)
  print(numbers)
  print("Largest:", max(numbers))
  print("Smallest:", min(numbers))
explanation: |
  Starting with an empty list and appending inside a loop is the standard way to collect values. `max` and `min`
  work on any list of comparable values.
stdin: |
  5
  12
  3
  0
check:
  cases:
    - stdin: "5\n12\n3\n0\n"
      expected: |
        Number (0 to stop): 5
        Number (0 to stop): 12
        Number (0 to stop): 3
        Number (0 to stop): 0
        [5, 12, 3]
        Largest: 12
        Smallest: 3
    - stdin: "-4\n9\n0\n"
      expected: |
        Number (0 to stop): -4
        Number (0 to stop): 9
        Number (0 to stop): 0
        [-4, 9]
        Largest: 9
        Smallest: -4
  requires: ["method:append"]
```

```quiz
- id: q1
  question: What does `["a", "b", "c"][1]` give?
  type: text
  answer: ["b", "'b'", '"b"']
  explanation: Indexes start at 0, so index 1 is the second item.
- id: q2
  question: How do you get the last item of a list called `items`, whatever its length?
  options:
    - items[-1]
    - items[len(items)]
    - items[last]
    - items[0]
  answer: items[-1]
  explanation: Negative indexes count from the end. items[len(items)] is one past the end - an IndexError.
- id: q3
  question: What does `[10, 20, 30, 40][1:3]` give?
  options:
    - "[20, 30]"
    - "[20, 30, 40]"
    - "[10, 20, 30]"
    - "[30, 40]"
  answer: "[20, 30]"
  explanation: The slice starts at index 1 and stops before index 3.
- id: q4
  question: After `nums = [1, 2]` and `nums = nums.append(3)`, what is `nums`?
  options:
    - None
    - "[1, 2, 3]"
    - "[1, 2]"
    - An error
  answer: None
  explanation: append changes the list in place and returns None - assigning that result replaces the list with None.
- id: q5
  question: Which method removes an item **by its position** and gives it back?
  options:
    - pop
    - remove
    - append
    - insert
  answer: pop
  explanation: pop(i) removes and returns the item at index i (the last item if no index is given). remove deletes by value.
- id: q6
  question: What does `print(len([]))` show?
  type: text
  answer: ["0"]
  explanation: An empty list has no items.
```
