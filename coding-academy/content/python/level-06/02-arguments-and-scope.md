---
id: py-6-2-arguments-and-scope
title: Default and keyword arguments, and scope
track: python
level: 6
order: 2
minutes: 40
summary: Make functions flexible with default values and keyword arguments, and understand where variables "live" - local and global scope.
objectives:
  - Give parameters default values
  - Call functions with keyword arguments in any order
  - Explain local and global scope and why functions should not rely on outside variables
  - Avoid the mutable default argument trap
  - Read and use *args at a basic level
prerequisites: [py-6-1-defining-functions]
tags: [default argument, keyword argument, scope, local, global, args, mutable default]
---

## Simple explanation

**Default values** make parameters optional:

```python
def greet(name, greeting="Hello"):
    return f"{greeting}, {name}!"

print(greet("Asha"))                 # Hello, Asha!
print(greet("Ben", "Good morning"))  # Good morning, Ben!
```

**Keyword arguments** name the parameter in the call, so order does not matter and the call is clearer:

```python
print(greet(greeting="Hi", name="Chen"))   # Hi, Chen!
```

You already used keyword arguments: `print(..., sep="-")`, `sorted(..., reverse=True)`.

**Scope** means *where a variable can be seen*. Variables created inside a function are **local**: they exist
only while the function runs and are invisible outside. Variables created at the top level of the program are
**global**: functions can read them, but should get what they need through parameters instead.

## Real-world analogy

- **Default values** are like a **coffee order with standard settings**: "a coffee" means medium, with milk -
  unless you say otherwise.
- **Keyword arguments** are like **filling in a labelled form**: it does not matter which box you fill first,
  because each box has a label.
- **Scope** is like **notes you write on a whiteboard in a meeting room** (the function). When the meeting ends,
  the board is wiped; people outside never saw it.

## Technical definition

- Parameters with defaults must come **after** parameters without: `def f(a, b=2)` is valid, `def f(a=1, b)`
  is a SyntaxError.
- Call styles: positional `f(1, 2)`, keyword `f(a=1, b=2)`, mixed `f(1, b=2)` (positional first).
- Default values are evaluated **once**, when the `def` runs. A mutable default (`def f(items=[])`) is shared
  between calls - use `None` and create the list inside.
- **LEGB scope rule**: a name is looked up in **L**ocal, **E**nclosing function, **G**lobal, then **B**uilt-in
  scope.
- Assigning to a name inside a function makes it local to that function (unless declared `global`, which is
  best avoided). Reading a global and then assigning to the same name in the function raises
  `UnboundLocalError`.
- `*args` collects any number of extra positional arguments into a tuple; `**kwargs` collects extra keyword
  arguments into a dict.

## Step-by-step examples

**Example 1 - defaults and keywords**

```python
def price_with_tax(amount, rate=0.2, round_to=2):
    return round(amount * (1 + rate), round_to)

print(price_with_tax(100))                 # 120.0
print(price_with_tax(100, 0.05))           # 105.0
print(price_with_tax(99.99, round_to=0))   # 120.0
```

**Example 2 - local variables stay inside**

```python
def calculate():
    result = 42
    return result

calculate()
print(result)
```

```text
NameError: name 'result' is not defined
```

`result` only existed inside the function. Use the return value instead: `answer = calculate()`.

**Example 3 - the UnboundLocalError trap**

```python
count = 0
def increase():
    count += 1      # UnboundLocalError
```

Because `count` is assigned inside the function, Python treats it as local - and it has no value yet. The clean
fix is to pass the value in and return the new one:

```python
def increase(count):
    return count + 1

count = increase(count)
```

**Example 4 - the mutable default trap**

```python
def add_item(item, basket=[]):      # bad
    basket.append(item)
    return basket

print(add_item("apple"))   # ['apple']
print(add_item("pear"))    # ['apple', 'pear']  - surprise!
```

Fix:

```python
def add_item(item, basket=None):
    if basket is None:
        basket = []
    basket.append(item)
    return basket
```

**Example 5 - any number of arguments with *args**

```python
def total(*amounts):
    return sum(amounts)

print(total(5, 10, 2.5))   # 17.5
```

## Common mistakes

- **Default before non-default parameter** → SyntaxError.
- **Positional argument after a keyword argument**: `f(a=1, 2)` → SyntaxError.
- **Relying on global variables** inside functions - hard to test and understand. Pass values in, return results
  out.
- **Mutable defaults** (`[]`, `{}`) - use `None`.
- **Misspelled keyword**: `greet(nmae="Asha")` → TypeError: unexpected keyword argument.

## Practical application

Defaults keep simple calls simple while allowing options: `export_report(data)` vs
`export_report(data, format="csv", include_totals=False)`. Clean scope - inputs as parameters, outputs as return
values - makes functions predictable, reusable and testable, which matters more and more as programs grow.

## Revision notes

- `def f(a, b=10):` - defaults after required parameters.
- Keyword arguments: `f(b=5, a=1)` - order-free and self-documenting.
- Local variables live only inside the function. Pass data in as parameters, get results out with return.
- Assigning inside a function makes a name local → beware `UnboundLocalError`.
- Never use `[]`/`{}` as a default - use `None`.
- `*args` → tuple of extra positional arguments.

```exercise
id: default-greeting
title: A default greeting
difficulty: beginner
instructions: |
  Write `greet(name, greeting="Hello")` that **returns** `"<greeting>, <name>!"`. Print:

  1. `greet("Asha")`
  2. `greet("Ben", "Welcome")`
  3. `greet(greeting="Hi", name="Chen")` (keyword arguments)

  ```text
  Hello, Asha!
  Welcome, Ben!
  Hi, Chen!
  ```
starter: |
  def greet(name, greeting="Hello"):
      pass

hints:
  - "`return f\"{greeting}, {name}!\"`"
solution: |
  def greet(name, greeting="Hello"):
      return f"{greeting}, {name}!"

  print(greet("Asha"))
  print(greet("Ben", "Welcome"))
  print(greet(greeting="Hi", name="Chen"))
explanation: |
  When the second argument is missing, the default "Hello" is used. Keyword arguments can be given in any order.
check:
  expected: |
    Hello, Asha!
    Welcome, Ben!
    Hi, Chen!
  tests:
    - name: greet returns the text
      code: |
        assert greet("X") == "Hello, X!" and greet("Y", "Hey") == "Hey, Y!"
```

```exercise
id: fix-scope
title: Fix the scope bug
difficulty: beginner
instructions: |
  This program crashes with `UnboundLocalError`. Rewrite `add_points` so it **takes the current score as a
  parameter and returns the new score** - no global variables. The output must be:

  ```text
  10
  25
  ```
starter: |
  score = 0

  def add_points(points):
      score = score + points
      return score

  score = add_points(10)
  print(score)
  score = add_points(15)
  print(score)
hints:
  - "Change the definition to `def add_points(score, points):`"
  - "Change the calls to `add_points(score, 10)` and `add_points(score, 15)`."
solution: |
  score = 0

  def add_points(score, points):
      return score + points

  score = add_points(score, 10)
  print(score)
  score = add_points(score, 15)
  print(score)
explanation: |
  Now everything the function needs arrives through its parameters, and the result leaves through `return`. The
  function no longer depends on - or changes - anything outside itself.
check:
  expected: |
    10
    25
  tests:
    - name: add_points uses only its parameters
      code: |
        assert add_points(5, 7) == 12
```

```exercise
id: safe-default
title: Avoid the shared-list trap
difficulty: intermediate
instructions: |
  `add_tag` has the mutable-default bug: tags from one call leak into the next. Fix it so each call without a
  `tags` argument starts with a fresh empty list. Output:

  ```text
  ['python']
  ['sql']
  ['a', 'b']
  ```
starter: |
  def add_tag(tag, tags=[]):
      tags.append(tag)
      return tags

  print(add_tag("python"))
  print(add_tag("sql"))
  print(add_tag("b", ["a"]))
hints:
  - "Use `tags=None` as the default."
  - "Inside: `if tags is None: tags = []`"
solution: |
  def add_tag(tag, tags=None):
      if tags is None:
          tags = []
      tags.append(tag)
      return tags

  print(add_tag("python"))
  print(add_tag("sql"))
  print(add_tag("b", ["a"]))
explanation: |
  The default value is created once, when `def` runs, so a list default is shared by every call. `None` is a safe
  "nothing given" marker; creating the list inside the function gives each call its own list.
check:
  expected: |
    ['python']
    ['sql']
    ['a', 'b']
```

```exercise
id: flexible-total
title: A flexible order total
difficulty: challenge
instructions: |
  Write `order_total(*prices, discount=0, delivery=4.99)`:

  - add up any number of prices,
  - subtract the discount **percentage** (e.g. `discount=10` means 10% off the prices),
  - add delivery, but delivery is free when the discounted price total is 50 or more,
  - return the result rounded to 2 decimals.

  Print these three calls:

  ```text
  order_total(10, 20) -> 34.99
  order_total(30, 25, discount=10) -> 54.49
  order_total(5, discount=50, delivery=2) -> 4.5
  ```

  (In the second call, 55 minus 10% is 49.50 - just under 50 - so delivery is still charged.)
starter: |
  def order_total(*prices, discount=0, delivery=4.99):
      pass

  print("order_total(10, 20) ->", order_total(10, 20))
  print("order_total(30, 25, discount=10) ->", order_total(30, 25, discount=10))
  print("order_total(5, discount=50, delivery=2) ->", order_total(5, discount=50, delivery=2))
hints:
  - "`subtotal = sum(prices) * (1 - discount / 100)`"
  - "`if subtotal >= 50: delivery = 0` then `return round(subtotal + delivery, 2)`"
solution: |
  def order_total(*prices, discount=0, delivery=4.99):
      subtotal = sum(prices) * (1 - discount / 100)
      if subtotal >= 50:
          delivery = 0
      return round(subtotal + delivery, 2)

  print("order_total(10, 20) ->", order_total(10, 20))
  print("order_total(30, 25, discount=10) ->", order_total(30, 25, discount=10))
  print("order_total(5, discount=50, delivery=2) ->", order_total(5, discount=50, delivery=2))
explanation: |
  `*prices` gathers all positional arguments into a tuple. Parameters after `*prices` can only be given by
  keyword, which keeps calls readable: `discount=10` cannot be confused with a price. Note the order of the
  steps: the free-delivery rule is checked on the *discounted* subtotal (55 × 0.9 = 49.50), so delivery is
  charged and the total is 54.49.
check:
  expected: |
    order_total(10, 20) -> 34.99
    order_total(30, 25, discount=10) -> 54.49
    order_total(5, discount=50, delivery=2) -> 4.5
```

```quiz
- id: q1
  question: 'With `def f(a, b=5): return a + b`, what is `f(1)`?'
  type: text
  answer: ["6"]
  explanation: b uses its default value 5.
- id: q2
  question: Which definition is valid?
  options:
    - "def f(a, b=2):"
    - "def f(a=1, b):"
    - "def f(=1):"
    - "def f(a b):"
  answer: "def f(a, b=2):"
  explanation: Parameters with defaults must come after those without.
- id: q3
  question: What happens when you print a variable that was only created inside a function?
  options:
    - NameError - local variables do not exist outside the function
    - It prints its last value
    - It prints None
    - It prints 0
  answer: NameError - local variables do not exist outside the function
  explanation: Local variables disappear when the function finishes. Return the value instead.
- id: q4
  question: Why is `def f(items=[])` dangerous?
  options:
    - The same list is shared between all calls that use the default
    - Lists cannot be parameters
    - It is a SyntaxError
    - It makes the function slower
  answer: The same list is shared between all calls that use the default
  explanation: Defaults are created once. Use None and create the list inside the function.
- id: q5
  question: 'What does `def total(*nums): return sum(nums)` receive in `nums` when called as `total(1, 2, 3)`?'
  options:
    - The tuple (1, 2, 3)
    - Only 1
    - The list [1, 2, 3]
    - An error
  answer: The tuple (1, 2, 3)
  explanation: "*args collects extra positional arguments into a tuple."
- id: q6
  question: Why is `greet(name="Asha", greeting="Hi")` easier to read than `greet("Asha", "Hi")`?
  options:
    - Keyword arguments say which value goes to which parameter
    - It runs faster
    - It is required for strings
    - It avoids indentation
  answer: Keyword arguments say which value goes to which parameter
  explanation: Named arguments are self-documenting and can be given in any order.
```
