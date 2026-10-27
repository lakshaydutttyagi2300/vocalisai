---
id: py-9-3-when-to-use-oop
title: When classes help - and when functions are better
track: python
level: 9
order: 3
minutes: 35
summary: Learn to choose between plain functions, dictionaries and classes, use special methods like __str__ and __eq__, and avoid over-engineering.
objectives:
  - Recognise when a class makes code clearer and when it adds noise
  - Use __str__, __repr__ and __eq__ to make objects pleasant to use
  - Refactor a "dictionary plus loose functions" design into a small class
  - Refactor an unnecessary class back into a function
prerequisites: [py-9-2-inheritance-encapsulation-composition]
tags: [oop, design, functions, dunder, __str__, __repr__, __eq__, refactoring, keep it simple]
---

## Simple explanation

Classes are a tool, not a goal. A good rule:

- **Use a function** when you just transform input into output: `total = add_vat(price)`. No memory needed
  between calls.
- **Use a class** when some **data and the actions on that data belong together** and the data **changes over
  time**: a bank account (balance + deposit/withdraw), a game character (health + take_damage), a shopping cart.

Warning sign of an unnecessary class: it has only `__init__` and **one** other method, and you create it only
to call that method once:

```python
# Over-engineered
class Greeter:
    def __init__(self, name):
        self.name = name
    def greet(self):
        return f"Hello {self.name}"

print(Greeter("Asha").greet())

# Simpler and just as clear
def greet(name):
    return f"Hello {name}"

print(greet("Asha"))
```

## Real-world analogy

A **calculator** button (function) takes numbers and returns a result - it does not need to remember you. A
**bank account** (object) must remember its balance between visits and enforce rules about it. You would not open
a bank account just to add two numbers.

## Technical definition

- **Special ("dunder") methods** customise how objects behave with Python's built-in features:
  - `__str__(self)` - text for `print(obj)` and `str(obj)` (for users).
  - `__repr__(self)` - unambiguous text for developers (shown in the console and inside lists).
  - `__eq__(self, other)` - what `==` means for two objects (by default, `==` checks whether they are the very
    same object).
  - `__len__`, `__lt__` (for sorting), `__contains__` (`in`) and many others exist.
- **Signs a class helps**: several functions all take the same dictionary as their first argument; data must
  stay valid (rules on changes); you need many similar objects with their own state.
- **Signs a class hurts**: no state; one method; deep inheritance to share a single line; getters/setters that
  do nothing. Python modules already group functions - you don't need a class for that.

## Step-by-step examples

**Example 1 - functions that share a dictionary want to be a class**

```python
# Before: every function takes the same dict
def make_timer():
    return {"seconds": 0}

def tick(timer):
    timer["seconds"] += 1

def show(timer):
    return f"{timer['seconds']}s"

# After: the data and its actions live together
class Timer:
    def __init__(self):
        self.seconds = 0

    def tick(self):
        self.seconds += 1

    def __str__(self):
        return f"{self.seconds}s"

t = Timer()
t.tick(); t.tick()
print(t)          # 2s   - print uses __str__
```

**Example 2 - `__repr__` and `__eq__`**

```python
class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def __repr__(self):
        return f"Point({self.x}, {self.y})"

    def __eq__(self, other):
        return isinstance(other, Point) and (self.x, self.y) == (other.x, other.y)

print([Point(1, 2), Point(3, 4)])   # [Point(1, 2), Point(3, 4)]
print(Point(1, 2) == Point(1, 2))   # True (without __eq__ it would be False)
```

**Example 3 - a class that should be a function**

```python
class TaxCalculator:
    def __init__(self, rate):
        self.rate = rate
    def calculate(self, amount):
        return amount * self.rate

# Used once:  TaxCalculator(0.2).calculate(100)
def tax(amount, rate=0.2):
    return amount * rate
```

The function is shorter, easier to test and does the same job.

## Common mistakes

- **Making everything a class** "because that's professional". Simple, readable code is professional.
- **Forgetting `__str__`** - `print(obj)` shows `<__main__.Timer object at 0x...>`, which is useless to users.
- **Comparing objects with `==` without `__eq__`** - two objects with identical data are "not equal".
- **Getter/setter methods for every attribute** (`get_name()`, `set_name()`) - in Python, use plain attributes
  and switch to `@property` later only if you need rules.
- **A class with only static data** - a dictionary or a module-level constant is enough.

## Practical application

When you read other people's code, you'll see both styles. Data-analysis scripts are mostly functions; games,
GUIs and simulations are mostly classes; web frameworks mix both. Asking "does this need to remember state and
protect rules?" will guide you to the simplest design that works.

## Revision notes

- Function: input → output, no memory. Class: data + behaviour + changing state + rules.
- Several functions sharing one dict → candidate for a class.
- A class with one method used once → candidate for a function.
- `__str__` for users, `__repr__` for developers, `__eq__` for `==`.
- Prefer the simplest design; you can refactor later.

```exercise
id: dict-to-class
title: Refactor a dictionary into a class
difficulty: beginner
instructions: |
  The starter code manages a game player with a dictionary and two functions. Rewrite it as a class `Player`
  with `__init__(self, name)` (health starts at 100), `take_damage(self, amount)` (health never goes below 0) and
  `__str__` returning `"<name>: <health> HP"`. The final three lines must stay exactly as given.

  ```text
  Asha: 70 HP
  Asha: 0 HP
  ```
starter: |
  def make_player(name):
      return {"name": name, "health": 100}

  def take_damage(player, amount):
      player["health"] = max(0, player["health"] - amount)

  # Replace the code above with a Player class

  p = Player("Asha")
  p.take_damage(30)
  print(p)
  p.take_damage(500)
  print(p)
hints:
  - "`class Player:` with `self.name = name` and `self.health = 100` in `__init__`."
  - "`self.health = max(0, self.health - amount)`"
  - "`def __str__(self): return f\"{self.name}: {self.health} HP\"`"
solution: |
  class Player:
      def __init__(self, name):
          self.name = name
          self.health = 100

      def take_damage(self, amount):
          self.health = max(0, self.health - amount)

      def __str__(self):
          return f"{self.name}: {self.health} HP"

  p = Player("Asha")
  p.take_damage(30)
  print(p)
  p.take_damage(500)
  print(p)
explanation: |
  The data (name, health) and the rule (health can't go below 0) now live together. `__str__` makes `print(p)`
  show something meaningful.
check:
  expected: |
    Asha: 70 HP
    Asha: 0 HP
  forbid_text: ["make_player"]
```

```exercise
id: class-to-function
title: Simplify an unnecessary class
difficulty: beginner
instructions: |
  `Formatter` only exists to call one method once. Replace it with a function `format_price(amount)` that returns
  the amount with a pound sign and two decimals. Remove the class.

  ```text
  £3.50
  £12.00
  ```
starter: |
  class Formatter:
      def __init__(self, amount):
          self.amount = amount

      def format(self):
          return f"£{self.amount:.2f}"

  print(Formatter(3.5).format())
  print(Formatter(12).format())
hints:
  - "`def format_price(amount): return f\"£{amount:.2f}\"`"
  - "Then call `print(format_price(3.5))`."
solution: |
  def format_price(amount):
      return f"£{amount:.2f}"

  print(format_price(3.5))
  print(format_price(12))
explanation: |
  The class had no state that changed and only one method. A function says the same thing in two lines and is
  easier to reuse and test.
check:
  expected: |
    £3.50
    £12.00
  forbid: [class]
  tests:
    - name: format_price works on its own
      code: |
        assert format_price(0.5) == "£0.50"
```

```exercise
id: point-equality
title: Make objects compare and print nicely
difficulty: intermediate
instructions: |
  Add `__repr__` and `__eq__` to `Money` so that:

  - `repr(Money(5, "GBP"))` is `Money(5, 'GBP')`
  - two Money objects are equal when both amount and currency match
  - comparing with something that isn't Money returns False (not an error)

  ```text
  [Money(5, 'GBP'), Money(5, 'EUR')]
  True
  False
  False
  ```
starter: |
  class Money:
      def __init__(self, amount, currency):
          self.amount = amount
          self.currency = currency

  print([Money(5, "GBP"), Money(5, "EUR")])
  print(Money(5, "GBP") == Money(5, "GBP"))
  print(Money(5, "GBP") == Money(5, "EUR"))
  print(Money(5, "GBP") == 5)
hints:
  - "`def __repr__(self): return f\"Money({self.amount}, {self.currency!r})\"` - `!r` adds the quotes."
  - "In `__eq__`, first check `isinstance(other, Money)`; if not, return False."
solution: |
  class Money:
      def __init__(self, amount, currency):
          self.amount = amount
          self.currency = currency

      def __repr__(self):
          return f"Money({self.amount}, {self.currency!r})"

      def __eq__(self, other):
          if not isinstance(other, Money):
              return False
          return self.amount == other.amount and self.currency == other.currency

  print([Money(5, "GBP"), Money(5, "EUR")])
  print(Money(5, "GBP") == Money(5, "GBP"))
  print(Money(5, "GBP") == Money(5, "EUR"))
  print(Money(5, "GBP") == 5)
explanation: |
  Lists show their items with `__repr__`, so defining it makes debugging easy. `__eq__` defines what "the same"
  means for your objects; checking the type first avoids AttributeError when comparing with other things.
check:
  expected: |
    [Money(5, 'GBP'), Money(5, 'EUR')]
    True
    False
    False
```

```exercise
id: choose-design
title: Design a to-do list
difficulty: challenge
instructions: |
  Write a class `TodoList` that stores tasks (each task has a title and a done flag) and supports:

  - `add(title)`
  - `complete(title)` - marks the task done; raises `KeyError` if no such task
  - `remaining()` - number of tasks not done
  - `__len__` - total number of tasks, so `len(todo)` works
  - `__str__` - one line per task: `[x] title` if done, `[ ] title` if not, joined with newlines

  ```text
  [x] buy milk
  [ ] call mum
  [ ] pay rent
  3 tasks, 2 remaining
  Error: no task called 'swim'
  ```
starter: |
  # write the TodoList class here

  todo = TodoList()
  todo.add("buy milk")
  todo.add("call mum")
  todo.add("pay rent")
  todo.complete("buy milk")
  print(todo)
  print(f"{len(todo)} tasks, {todo.remaining()} remaining")
  try:
      todo.complete("swim")
  except KeyError as err:
      print("Error:", err.args[0])
hints:
  - "Store tasks in a dict `self.tasks = {}` mapping title → done (True/False). Dicts keep insertion order."
  - "complete: `if title not in self.tasks: raise KeyError(f\"no task called '{title}'\")`"
  - "__str__: `\"\\n\".join(f\"[{'x' if done else ' '}] {title}\" for title, done in self.tasks.items())`"
solution: |
  class TodoList:
      def __init__(self):
          self.tasks = {}

      def add(self, title):
          self.tasks[title] = False

      def complete(self, title):
          if title not in self.tasks:
              raise KeyError(f"no task called '{title}'")
          self.tasks[title] = True

      def remaining(self):
          return sum(1 for done in self.tasks.values() if not done)

      def __len__(self):
          return len(self.tasks)

      def __str__(self):
          return "\n".join(f"[{'x' if done else ' '}] {title}" for title, done in self.tasks.items())

  todo = TodoList()
  todo.add("buy milk")
  todo.add("call mum")
  todo.add("pay rent")
  todo.complete("buy milk")
  print(todo)
  print(f"{len(todo)} tasks, {todo.remaining()} remaining")
  try:
      todo.complete("swim")
  except KeyError as err:
      print("Error:", err.args[0])
explanation: |
  Here a class earns its place: the task list is state that changes over time, there are several related actions
  and a rule (you can't complete a task that doesn't exist). `__len__` and `__str__` make it feel like a built-in
  type.
check:
  expected: |
    [x] buy milk
    [ ] call mum
    [ ] pay rent
    3 tasks, 2 remaining
    Error: no task called 'swim'
  tests:
    - name: new lists start empty
      code: |
        assert len(TodoList()) == 0
```

```quiz
- id: q1
  question: Which is the best fit for a plain function rather than a class?
  options:
    - Converting a temperature from Celsius to Fahrenheit
    - A bank account that tracks its balance
    - A game character whose health changes
    - A shopping cart that items are added to over time
  answer: Converting a temperature from Celsius to Fahrenheit
  explanation: It just turns input into output - nothing needs to be remembered.
- id: q2
  question: What does `print(obj)` use to decide what to show?
  options:
    - The object's __str__ method
    - The object's __init__ method
    - The object's __eq__ method
    - The class name only, always
  answer: The object's __str__ method
  explanation: Without __str__ (or __repr__), you get a default like <__main__.Timer object at 0x...>.
- id: q3
  question: Without an __eq__ method, when is `a == b` True for two objects of your class?
  options:
    - Only when a and b are the very same object
    - When all their attributes are equal
    - Never
    - Always
  answer: Only when a and b are the very same object
  explanation: The default compares identity, not data.
- id: q4
  question: Several functions all take the same dictionary as their first argument. What does that suggest?
  options:
    - The data and functions may belong together in a class
    - The code must be deleted
    - You should use global variables instead
    - Dictionaries are always wrong
  answer: The data and functions may belong together in a class
  explanation: That dictionary is effectively 'self'.
- id: q5
  question: Which is a warning sign of an unnecessary class?
  options:
    - It has __init__ plus one method and is used once
    - It stores data that changes over time
    - It protects rules about its data
    - Many instances are created
  answer: It has __init__ plus one method and is used once
  explanation: That is just a function with extra steps.
- id: q6
  question: Which special method makes `len(obj)` work?
  options:
    - __len__
    - __size__
    - __count__
    - __str__
  answer: __len__
  explanation: Python calls obj.__len__() when you write len(obj).
```
