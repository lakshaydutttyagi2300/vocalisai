---
id: python-cheat-sheet
title: Python cheat sheet
category: Reference
order: 4
tags: [python, cheat sheet, syntax, reference, summary]
---

A one-page reminder of Python syntax. Each section links to the level where it is taught.

## Output, comments, variables (Level 1)

```python
print("Hello", name, sep=" ", end="\n")   # show values
# a comment
age = 30                                   # assignment
age += 1                                   # update: age = age + 1
```

## Types and conversion (Level 1)

```python
type(x)                   # find a value's type
int("42")  float("2.5")  str(42)  bool(0)
"text"  42  3.14  True  False  None
```

## Input (Level 1)

```python
name = input("Name? ")          # always a str
age = int(input("Age? "))       # convert for maths
```

## Arithmetic (Level 1)

```python
+  -  *  /        # / always gives a float
//  %  **         # floor division, remainder, power
round(3.14159, 2) # 3.14
```

## Comparisons and logic (Levels 1-2)

```python
==  !=  <  >  <=  >=
and  or  not
"cat" in "concatenate"       # True
0 < x < 10                   # chained comparison
```

## Decisions (Level 2)

```python
if score >= 85:
    grade = "A"
elif score >= 70:
    grade = "B"
else:
    grade = "C"
```

## Loops (Level 3)

```python
for i in range(1, 11):       # 1..10
    print(i)

for letter in "hello":
    print(letter)

while balance < target:
    balance *= 1.05

break      # leave the loop
continue   # skip to the next round
```

## Collections (Level 4)

```python
items = ["a", "b", "c"]      # list: items[0], items[-1], items[1:3]
items.append("d"); items.remove("a"); len(items)
point = (3, 4)               # tuple (cannot change)
tags = {"red", "blue"}       # set (no duplicates)
person = {"name": "Asha", "age": 30}   # dict
person["age"]; person.get("email", "none")
for key, value in person.items(): ...
```

## Strings (Level 5)

```python
s.upper()  s.lower()  s.strip()  s.title()
s.replace("a", "b")  s.split(",")  ", ".join(parts)
s.startswith("Py")  s.find("x")  len(s)
f"{name} is {age} years old"   f"{price:.2f}"
```

## Functions (Level 6)

```python
def area(width, height=1):
    """Return the area of a rectangle."""
    return width * height

area(3, 4)            # positional arguments
area(width=3)         # keyword argument, default height
```

## Files and errors (Level 7)

```python
with open("notes.txt", "w", encoding="utf-8") as f:
    f.write("hello\n")

with open("notes.txt", encoding="utf-8") as f:
    for line in f:
        print(line.strip())

try:
    n = int(text)
except ValueError:
    print("Not a number")
finally:
    print("done")
```

## Intermediate tools (Level 8)

```python
import math, random, datetime
squares = [n * n for n in range(5)]
by_price = sorted(products, key=lambda p: p["price"])
for i, item in enumerate(items, start=1): ...
for name, score in zip(names, scores): ...
```

## Classes (Level 9)

```python
class Account:
    def __init__(self, owner, balance=0):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount

acc = Account("Asha")
acc.deposit(100)
```
