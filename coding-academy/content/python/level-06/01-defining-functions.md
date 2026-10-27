---
id: py-6-1-defining-functions
title: Functions - parameters, arguments and return values
track: python
level: 6
order: 1
minutes: 45
summary: Package code into named, reusable functions - define them with def, pass in information with parameters, and send results back with return.
objectives:
  - Explain what a function is and why functions matter
  - Define and call a function with def
  - Use parameters and arguments to pass information in
  - Return values with return, and explain the difference between printing and returning
  - Write a docstring that describes what a function does
prerequisites: [py-4-2-working-with-lists, py-5-2-fstrings-split-join]
tags: [function, def, parameter, argument, return, None, call, docstring, reuse]
---

## Simple explanation

A **function** is a named block of code that does one job. You have used many already: `print()`, `len()`,
`input()`. Now you will write your own.

```python
def greet(name):
    print(f"Hello, {name}!")

greet("Asha")
greet("Ben")
```

- `def` starts a function **definition**; `greet` is its name; `name` is a **parameter** - a placeholder for
  information the function needs.
- The indented lines are the function's **body**. They do **not** run when the function is defined - only when
  it is **called**.
- `greet("Asha")` **calls** the function, passing the **argument** `"Asha"` into the parameter `name`.

Functions can **give back** a result with `return`:

```python
def add_tax(price, rate):
    return price * (1 + rate)

total = add_tax(100, 0.2)
print(total)        # 120.0
```

Why functions matter: write once, use many times; give a name to an idea; test pieces separately; keep programs
readable.

## Real-world analogy

A function is like a **coffee machine**. You put in ingredients (arguments: coffee type, size), it does its job
(the body), and hands you a result (the return value: a cup of coffee). You don't need to know how it works
inside each time - you just press the button (call it).

## Technical definition

- **Definition**: `def name(param1, param2, ...):` followed by an indented body. Defining creates a function
  object bound to `name`.
- **Call**: `name(arg1, arg2, ...)`. Arguments are matched to parameters by position (more ways in the next
  lesson). Wrong number of arguments → `TypeError`.
- **`return value`** ends the function immediately and sends `value` back to the caller. A function without
  `return` (or with a bare `return`) returns **`None`**.
- **Printing vs returning**: `print` shows text to a human; `return` gives a value to the code that called the
  function, so it can be stored, compared or used in calculations.
- **Docstring**: a string literal as the first statement of the body, describing the function. Shown by
  `help(name)`.
- A function can return several values as a tuple: `return low, high` → `a, b = f(...)`.
- Functions must be defined (the `def` must have run) before they are called.

## Step-by-step examples

**Example 1 - a function with a docstring and a return value**

```python
def area(width, height):
    """Return the area of a rectangle."""
    return width * height

room = area(4, 3.5)
print("Room:", room, "m²")
print("Two rooms:", area(4, 3.5) + area(3, 3))
```

Output:

```text
Room: 14.0 m²
Two rooms: 23.0
```

**Example 2 - print vs return**

```python
def show_double(n):
    print(n * 2)

def double(n):
    return n * 2

a = show_double(5)   # prints 10
b = double(5)        # prints nothing
print(a, b)          # None 10
```

`show_double` printed but returned nothing (`None`). `double` returned 10, which we stored in `b`.

**Example 3 - return stops the function**

```python
def grade(score):
    if score >= 85:
        return "A"
    if score >= 70:
        return "B"
    return "C"

print(grade(90), grade(72), grade(40))   # A B C
```

No `elif` needed: once a `return` runs, the rest of the function is skipped.

**Example 4 - returning two values**

```python
def min_max(numbers):
    return min(numbers), max(numbers)

low, high = min_max([7, 2, 9, 4])
print(low, high)     # 2 9
```

**Example 5 - functions using functions**

```python
def is_even(n):
    return n % 2 == 0

def count_even(numbers):
    count = 0
    for n in numbers:
        if is_even(n):
            count += 1
    return count

print(count_even([1, 2, 3, 4, 6]))   # 3
```

## Common mistakes

- **Forgetting to call**: writing `greet` instead of `greet()` does nothing.
- **Defining after calling**: Python reads top to bottom; call a function only after its `def` has run.
- **Printing when you should return**: a function that prints its answer cannot be used in further
  calculations (it returns `None`).
- **Code after `return`** never runs.
- **Wrong number of arguments**: `area(4)` → `TypeError: area() missing 1 required positional argument`.
- **Forgetting the colon or indentation** after the `def` line.

## Practical application

Every real program is built from functions: `calculate_total(basket)`, `send_email(to, subject)`,
`load_expenses(file)`. In the calculator project, each operation becomes a function; in the expense tracker,
functions load, add, summarise and save data. Functions also make code testable (Level 10).

## Revision notes

- `def name(params):` + indented body; call with `name(args)`.
- Parameters are placeholders; arguments are the actual values passed in.
- `return value` sends a result back and ends the function; no return → `None`.
- Print shows; return gives back. Prefer returning, and print outside the function.
- First line string = docstring. Return several values as a tuple.

```exercise
id: square-function
title: Your first function
difficulty: beginner
instructions: |
  Define a function `square(n)` that **returns** `n` multiplied by itself. Then print `square(7)` and
  `square(12)`.

  ```text
  49
  144
  ```
starter: |
  def square(n):
      pass  # replace this line

hints:
  - "Inside the function: `return n * n`."
  - "Call it outside the function (not indented): `print(square(7))`."
solution: |
  def square(n):
      return n * n

  print(square(7))
  print(square(12))
explanation: |
  `return n * n` sends the result back to the caller; `print(...)` then shows it.
check:
  expected: |
    49
    144
  tests:
    - name: square returns the right values
      code: |
        assert square(3) == 9 and square(-4) == 16 and square(0) == 0
    - name: square returns (does not just print)
      code: |
        value, printed = capture_output(square, 5)
        assert value == 25, "square(5) should return 25"
  requires: [def, return]
```

```exercise
id: full-name-function
title: A function with two parameters
difficulty: beginner
instructions: |
  Define `full_name(first, last)` that returns the two names joined with a space, with each name capitalised
  (use `.title()`). Then print `full_name("ada", "LOVELACE")`.

  ```text
  Ada Lovelace
  ```
starter: |
  def full_name(first, last):
      pass

hints:
  - "`return first.title() + \" \" + last.title()` - or an f-string."
solution: |
  def full_name(first, last):
      return f"{first.title()} {last.title()}"

  print(full_name("ada", "LOVELACE"))
explanation: |
  Two parameters receive the two arguments in order. The function returns the formatted name rather than
  printing it, so it could also be used in other code.
check:
  expected: |
    Ada Lovelace
  tests:
    - name: works for other names
      code: |
        assert full_name("grace", "hopper") == "Grace Hopper"
        assert full_name("ALAN", "turing") == "Alan Turing"
```

```exercise
id: discount-function
title: Return early
difficulty: intermediate
instructions: |
  Write `delivery_cost(total, is_member)`:

  - members always get free delivery (return `0`)
  - otherwise orders of 50 or more get free delivery (return `0`)
  - otherwise delivery costs `4.99`

  Print the delivery cost for: a member with 10, a non-member with 60, a non-member with 20.

  ```text
  0
  0
  4.99
  ```
starter: |
  def delivery_cost(total, is_member):
      pass

hints:
  - "First `if is_member: return 0`."
  - "Then `if total >= 50: return 0`, and finally `return 4.99`."
solution: |
  def delivery_cost(total, is_member):
      if is_member:
          return 0
      if total >= 50:
          return 0
      return 4.99

  print(delivery_cost(10, True))
  print(delivery_cost(60, False))
  print(delivery_cost(20, False))
explanation: |
  Each `return` ends the function, so later checks only run when earlier ones did not match - no `else` or `elif`
  needed.
check:
  expected: |
    0
    0
    4.99
  tests:
    - name: rules are correct at the boundary
      code: |
        assert delivery_cost(50, False) == 0
        assert delivery_cost(49.99, False) == 4.99
        assert delivery_cost(0, True) == 0
```

```exercise
id: stats-function
title: A statistics function
difficulty: challenge
instructions: |
  Write `stats(numbers)` that returns **three** values: the smallest number, the largest number and the
  average rounded to 1 decimal place. If the list is empty, return `None, None, None`.

  Then unpack the result for the `marks` list and print it:

  ```text
  Lowest: 48 Highest: 97 Average: 74.6
  ```
starter: |
  def stats(numbers):
      pass

  marks = [72, 48, 97, 85, 71]
hints:
  - "`if not numbers: return None, None, None` handles the empty list."
  - "`return min(numbers), max(numbers), round(sum(numbers) / len(numbers), 1)`"
  - "`low, high, avg = stats(marks)`"
solution: |
  def stats(numbers):
      """Return (smallest, largest, average rounded to 1 decimal)."""
      if not numbers:
          return None, None, None
      return min(numbers), max(numbers), round(sum(numbers) / len(numbers), 1)

  marks = [72, 48, 97, 85, 71]
  low, high, avg = stats(marks)
  print("Lowest:", low, "Highest:", high, "Average:", avg)
explanation: |
  Returning a tuple lets one function give back several results, which the caller unpacks. Handling the empty
  list first avoids a ZeroDivisionError and a ValueError from min/max.
check:
  expected: |
    Lowest: 48 Highest: 97 Average: 74.6
  tests:
    - name: stats returns three values
      code: |
        assert stats([1, 2, 3, 4]) == (1, 4, 2.5)
    - name: empty list returns three Nones
      code: |
        assert stats([]) == (None, None, None)
```

```quiz
- id: q1
  question: When does the code inside a function's body run?
  options:
    - Each time the function is called
    - When Python reads the def line
    - Only once, when the program starts
    - Never
  answer: Each time the function is called
  explanation: Defining a function stores it; calling it runs the body.
- id: q2
  question: What does this print?
  code: |
    def f(x):
        x * 2
    print(f(4))
  type: text
  answer: ["None"]
  explanation: The function calculates x * 2 but does not return it, so it returns None.
- id: q3
  question: In `def area(w, h):` and the call `area(3, 5)`, what are w and h called?
  options:
    - Parameters
    - Arguments
    - Return values
    - Methods
  answer: Parameters
  explanation: Parameters are the names in the definition; 3 and 5 are the arguments.
- id: q4
  question: What does this print?
  code: |
    def check(n):
        if n > 0:
            return "positive"
        return "not positive"
    print(check(5), check(0))
  type: text
  answer: ["positive not positive"]
  explanation: return ends the function, so the second return only runs when the first if is False.
- id: q5
  question: Why is returning a value usually better than printing it inside the function?
  options:
    - The caller can store, compare or reuse a returned value
    - return is faster to type
    - print does not work inside functions
    - Returned values are always strings
  answer: The caller can store, compare or reuse a returned value
  explanation: Printing only shows text to a person; returning hands the value to the rest of the program.
- id: q6
  question: What error do you get when calling `area(4)` for `def area(width, height):`?
  type: text
  answer: ["TypeError"]
  explanation: A required argument is missing - TypeError.
```
