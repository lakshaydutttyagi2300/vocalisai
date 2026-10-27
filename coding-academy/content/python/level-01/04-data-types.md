---
id: py-1-4-data-types
title: Types of values - strings, integers, floats and booleans
track: python
level: 1
order: 4
minutes: 30
summary: Every value has a type. Meet the four basic ones - str, int, float and bool - and learn to check a value's type with type().
objectives:
  - Name Python's four basic types - str, int, float, bool - and give examples of each
  - Use type() to find out the type of any value or variable
  - Explain why "5" and 5 are different
  - Predict which operations work for which types
prerequisites: [py-1-3-variables]
tags: [data type, string, str, integer, int, float, decimal, boolean, bool, True, False, type]
---

## Simple explanation

Every value in Python has a **type** - what *kind* of value it is. The type decides what you can do with it.
You can multiply numbers; you cannot multiply a name by a city.

The four basic types:

| Type | Name in Python | Examples | Used for |
|---|---|---|---|
| **String** | `str` | `"hello"`, `'Mumbai'`, `"42"`, `""` | Text |
| **Integer** | `int` | `0`, `7`, `-15`, `2026` | Whole numbers |
| **Floating-point number** | `float` | `3.14`, `-0.5`, `2.0` | Numbers with a decimal point |
| **Boolean** | `bool` | `True`, `False` | Yes/no answers |

Watch out: `"42"` (with quotes) is a **string** - text that happens to contain digits. `42` (no quotes) is an
**integer** you can do maths with.

To find out a value's type, use `type()`:

```python
print(type(42))       # <class 'int'>
print(type("42"))     # <class 'str'>
```

## Real-world analogy

Think of a kitchen: **liquids** go in jugs, **eggs** go in egg boxes, **flour** goes in bags. The *container
type* tells you what you can do: you can pour a liquid but not an egg. In Python, the *type* tells you which
operations make sense. Mixing types without converting them is like trying to pour eggs - Python stops with a
`TypeError`.

## Technical definition

- **`str` (string)**: an immutable sequence of Unicode characters, written in single or double quotes. `""` is
  the **empty string**.
- **`int` (integer)**: a whole number of any size (Python integers have no fixed maximum). Write them without
  commas: `1000000` (or `1_000_000` - underscores are allowed for readability).
- **`float`**: a number with a fractional part, stored in binary "floating-point" format. Because of how
  computers store fractions, some decimals are approximate: `0.1 + 0.2` gives `0.30000000000000004`.
- **`bool` (Boolean)**: exactly two values, `True` and `False` (capital T and F, no quotes). Named after the
  mathematician George Boole.
- **`type(value)`** returns the type of a value.
- **Dynamic typing**: a variable has no fixed type; it takes the type of whatever value it currently refers to.

## Step-by-step examples

**Example 1 - checking types**

```python
print(type("Mumbai"))
print(type(30))
print(type(36.6))
print(type(True))
```

Output:

```text
<class 'str'>
<class 'int'>
<class 'float'>
<class 'bool'>
```

"class" is Python's word for a type. You will learn about classes in Level 9.

**Example 2 - the same digits, different types**

```python
print(5 + 5)
print("5" + "5")
```

Output:

```text
10
55
```

For integers, `+` **adds**. For strings, `+` **joins** them together (this is called *concatenation*).

**Example 3 - mixing types causes an error**

```python
print("Age: " + 30)
```

Output:

```text
TypeError: can only concatenate str (not "int") to str
```

Python will not guess whether you want to join text or add numbers. Two fixes:
`print("Age:", 30)` (let print handle it) or `print("Age: " + str(30))` (convert the number to text - more in
the *Input and type conversion* lesson).

**Example 4 - ints and floats work together**

```python
print(7 + 2.5)
print(type(7 + 2.5))
print(10 / 2)
```

Output:

```text
9.5
<class 'float'>
5.0
```

Mixing an int and a float gives a float. Ordinary division `/` **always** gives a float, even when the answer is
whole.

**Example 5 - a variable can change type**

```python
item = "pen"
print(type(item))   # <class 'str'>
item = 3
print(type(item))   # <class 'int'>
```

## Common mistakes

- **Quoting numbers by accident**: `price = "250"` is text; `price * 2` gives `"250250"`!
- **Writing `true` or `false` in lower case** → NameError. Booleans are `True` and `False`.
- **Putting quotes around booleans**: `"True"` is a string, not a boolean.
- **Using commas in numbers**: `1,000` is not one thousand - it creates two values, 1 and 0. Write `1000`.
- **Expecting exact decimals**: floats are approximate; round them for display (Level 5 shows how).

## Practical application

Types matter whenever data comes from outside your program. Text typed by a user, read from a file, or
received from a website always arrives as **strings** - you must convert it to numbers before calculating. A
huge number of beginner bugs are type mix-ups, and `type()` is your detective tool for finding them.

## Revision notes

- Four basic types: **str** (text, in quotes), **int** (whole numbers), **float** (decimals), **bool**
  (`True`/`False`).
- `type(x)` tells you the type of `x`.
- `"5"` is a string; `5` is an int. `"5" + "5"` → `"55"`; `5 + 5` → `10`.
- `str + int` → **TypeError**. Use commas in print, or convert with `str()`.
- int + float → float. `/` always returns a float.
- `True`/`False` need capitals and no quotes.

```exercise
id: one-of-each
title: One of each type
difficulty: beginner
instructions: |
  Create four variables:

  - `name` - a **string**
  - `age` - an **integer**
  - `height` - a **float** (e.g. 1.75)
  - `is_student` - a **boolean**

  Use any values you like of the right types. Then print the type of each, one per line, in that order.
  The output must be:

  ```text
  <class 'str'>
  <class 'int'>
  <class 'float'>
  <class 'bool'>
  ```
starter: |
  name = "Sam"
  # create age, height and is_student here

  print(type(name))
hints:
  - "A float needs a decimal point, e.g. `height = 1.75`."
  - "A boolean is `True` or `False` - capital first letter, no quotes."
  - "Add `print(type(age))` and the others after the first print."
solution: |
  name = "Sam"
  age = 30
  height = 1.75
  is_student = True
  print(type(name))
  print(type(age))
  print(type(height))
  print(type(is_student))
explanation: |
  The type comes from how you write the value: quotes → str, whole number → int, decimal point → float,
  True/False → bool.
check:
  expected: |
    <class 'str'>
    <class 'int'>
    <class 'float'>
    <class 'bool'>
  tests:
    - name: the four variables have the right types
      code: |
        assert type(name) is str, "name should be a string"
        assert type(age) is int, "age should be an integer"
        assert type(height) is float, "height should be a float"
        assert type(is_student) is bool, "is_student should be a boolean"
```

```exercise
id: join-or-add
title: Join or add?
difficulty: beginner
instructions: |
  Predict, then check! Write a program with two print lines:

  1. one that **adds** the numbers 3 and 4 (output `7`)
  2. one that **joins** the strings "3" and "4" (output `34`)

  ```text
  7
  34
  ```
starter: |
  # line 1: add two integers

  # line 2: join two strings
hints:
  - Numbers without quotes are added by `+`.
  - Strings in quotes are joined by `+`.
solution: |
  print(3 + 4)
  print("3" + "4")
explanation: |
  The same `+` symbol does different jobs depending on the types: addition for numbers, joining
  (concatenation) for strings.
check:
  expected: |
    7
    34
  forbid_text: ['"34"', '"7"']
  require_text: ['"3"', '"4"']
```

```exercise
id: fix-type-error
title: Fix the TypeError
difficulty: intermediate
instructions: |
  This program crashes with a **TypeError**. Fix it **without changing the variables**, so it prints:

  ```text
  You have 3 new messages
  ```
starter: |
  count = 3
  print("You have " + count + " new messages")
hints:
  - Read the error message - you cannot join a string and an int with `+`.
  - "Either use commas in print: `print(\"You have\", count, \"new messages\")`, or convert: `str(count)`."
solution: |
  count = 3
  print("You have", count, "new messages")
explanation: |
  Commas let print handle different types and add spaces for you. Another correct fix is
  `print("You have " + str(count) + " new messages")`, which converts the number to text first.
check:
  expected: |
    You have 3 new messages
  tests:
    - name: count is still the integer 3
      code: |
        assert count == 3 and type(count) is int
```

```exercise
id: price-bug
title: The doubled price bug
difficulty: challenge
instructions: |
  A shop program should print the price of two items (2 × 250 = 500), but it prints `250250`!
  Find the cause and fix the **first line only**, so the program prints:

  ```text
  500
  <class 'int'>
  ```
starter: |
  price = "250"
  print(price * 2)
  print(type(price))
hints:
  - Print the type of `price` - what kind of value is it?
  - Remove the quote marks so that price is a number.
solution: |
  price = 250
  print(price * 2)
  print(type(price))
explanation: |
  `"250"` is a string, and multiplying a string by 2 repeats it: `"250250"`. Without quotes, `250` is an integer
  and `* 2` multiplies it.
check:
  expected: |
    500
    <class 'int'>
```

```quiz
- id: q1
  question: What is the type of `"2026"`?
  options:
    - str
    - int
    - float
    - bool
  answer: str
  explanation: It is in quote marks, so it is a string, even though it contains digits.
- id: q2
  question: What does `print(type(9.0))` print?
  type: text
  answer: ["<class 'float'>"]
  explanation: A decimal point makes it a float, even when the fractional part is zero.
- id: q3
  question: What does this print?
  code: |
    print("Hi" + "5")
  type: text
  answer: ["Hi5"]
  explanation: Both are strings, so `+` joins them.
- id: q4
  question: Which line causes a TypeError?
  options:
    - "print(\"Total: \" + 10)"
    - "print(\"Total:\", 10)"
    - "print(10 + 2.5)"
    - "print(\"10\" + \"2\")"
  answer: "print(\"Total: \" + 10)"
  explanation: You cannot join a string and an integer with `+`. Commas in print are fine.
- id: q5
  question: Which of these is a boolean value?
  options:
    - "True"
    - "\"True\""
    - "true"
    - "1.0"
  answer: "True"
  explanation: Booleans are `True` and `False`, with a capital letter and no quotes.
- id: q6
  question: What does `print(10 / 5)` show?
  type: text
  answer: ["2.0"]
  explanation: Ordinary division always produces a float.
```
