---
id: py-11-3-type-hints-dataclasses
title: Type hints, dataclasses and enums
track: python
level: 11
order: 3
minutes: 45
summary: Document what your functions expect with type hints, create tidy data classes with @dataclass, and replace magic strings with Enum.
objectives:
  - Add type hints to variables, parameters and return values
  - Use list[int], dict[str, float], Optional / X | None and union types
  - Create dataclasses with defaults, ordering and frozen (read-only) instances
  - Use Enum for a fixed set of named values
prerequisites: [py-9-1-classes-objects]
tags: [type hints, annotations, typing, optional, union, dataclass, field, frozen, order, enum, mypy, static typing]
---

## Simple explanation

**Type hints** say what kind of value a variable, parameter or return value should be:

```python
def average(scores: list[float]) -> float:
    return sum(scores) / len(scores)

name: str = "Asha"
```

Python **does not enforce** them when the program runs - `average("oops")` still runs (and crashes). They help
**you, your editor and checking tools** (like `mypy`) spot mistakes before running, and they document the code.

A **dataclass** writes the boring parts of a class for you (`__init__`, `__repr__`, `__eq__`):

```python
from dataclasses import dataclass

@dataclass
class Product:
    name: str
    price: float
    quantity: int = 0          # default value

p = Product("kettle", 25.0)
print(p)                        # Product(name='kettle', price=25.0, quantity=0)
print(p == Product("kettle", 25.0))   # True
```

## Real-world analogy

Type hints are **labels on storage boxes** ("cables only"). Nobody stops you from putting socks in, but
everyone can see what *should* be there, and a checker can warn you. A dataclass is a **pre-printed form**: the
fields are already laid out, you only fill them in.

## Technical definition

- Syntax: `def f(x: int, y: str = "a") -> bool:`; variables `count: int = 0`.
- Built-in generics: `list[int]`, `dict[str, float]`, `tuple[int, int]`, `set[str]`.
- `X | None` (or `Optional[X]` from `typing`) for "an X or None"; `int | float` for unions.
- `typing` extras: `Callable[[int], str]`, `Iterable[str]`, `Any`, `TypedDict`, `Literal["r", "w"]`.
- Hints are stored in `func.__annotations__`; **not checked at runtime**. Use `mypy` or your editor (e.g. VS
  Code with Pylance) to check them.
- `@dataclass` options: `order=True` adds `<`, `>` (compares fields in order); `frozen=True` makes instances
  read-only (and hashable); `field(default_factory=list)` for mutable defaults. `__post_init__` runs after
  `__init__` for validation.
- `Enum`: `class Status(Enum): OPEN = "open"; CLOSED = "closed"` - a fixed set of named constants.
  `Status("open")` looks up by value; `Status.OPEN.name` / `.value`.

## Step-by-step examples

**Example 1 - Optional return type**

```python
def find_price(prices: dict[str, float], item: str) -> float | None:
    return prices.get(item)

result = find_price({"tea": 2.5}, "coffee")
if result is None:
    print("not found")
```

**Example 2 - dataclass with validation and a mutable default**

```python
from dataclasses import dataclass, field

@dataclass
class Order:
    customer: str
    items: list[str] = field(default_factory=list)   # NOT items: list[str] = []

    def __post_init__(self):
        if not self.customer:
            raise ValueError("customer is required")

o = Order("Asha")
o.items.append("tea")
print(o)          # Order(customer='Asha', items=['tea'])
```

**Example 3 - Enum**

```python
from enum import Enum

class Size(Enum):
    SMALL = "S"
    MEDIUM = "M"
    LARGE = "L"

choice = Size("M")
print(choice, choice.name, choice.value)   # Size.MEDIUM MEDIUM M
```

Typos like `"meduim"` become errors immediately instead of silent bugs.

## Common mistakes

- **Expecting hints to stop wrong values** - they don't at runtime; validate input separately.
- **`items: list = []` in a dataclass** - Python refuses (mutable default). Use `field(default_factory=list)`.
- **Changing a frozen dataclass** - raises `FrozenInstanceError`; create a new one with
  `dataclasses.replace(obj, field=new)`.
- **Over-complicated hints** for beginners' scripts - hints are most valuable on functions others call.
- **Comparing an Enum with a string** (`Size.SMALL == "S"` is False) - compare with `Size.SMALL` or use `.value`.

## Practical application

Type hints make large programs easier to change: your editor autocompletes fields and warns about mistakes.
Dataclasses are perfect for records - a row of a CSV, an expense, a quiz question (this app's content loader uses
dataclasses for lessons and exercises). Enums suit fixed choices: order status, difficulty level, payment method.

## Revision notes

- `def f(x: int) -> str:`; `list[int]`, `dict[str, float]`, `X | None`.
- Hints document and enable checking tools; they are not enforced at runtime.
- `@dataclass` → free `__init__`, `__repr__`, `__eq__`; `order=True`, `frozen=True`, `field(default_factory=...)`,
  `__post_init__`.
- `Enum` for fixed sets of named values.

```exercise
id: add-type-hints
title: Add type hints
difficulty: beginner
instructions: |
  Add type hints to every parameter and return value of the three functions (the code must still behave the
  same). Use `list[float]`, `dict[str, int]`, `str | None` where they fit.

  ```text
  12.5
  {'a': 2, 'b': 1}
  None
  Asha
  ```
starter: |
  def mean(values):
      return sum(values) / len(values)

  def letter_counts(text):
      counts = {}
      for ch in text:
          counts[ch] = counts.get(ch, 0) + 1
      return counts

  def first_long_word(words, min_length):
      for w in words:
          if len(w) >= min_length:
              return w
      return None

  print(mean([10.0, 15.0]))
  print(letter_counts("aba"))
  print(first_long_word(["hi", "yo"], 3))
  print(first_long_word(["Al", "Asha"], 3))
hints:
  - "`def mean(values: list[float]) -> float:`"
  - "`def letter_counts(text: str) -> dict[str, int]:`"
  - "`def first_long_word(words: list[str], min_length: int) -> str | None:`"
solution: |
  def mean(values: list[float]) -> float:
      return sum(values) / len(values)

  def letter_counts(text: str) -> dict[str, int]:
      counts: dict[str, int] = {}
      for ch in text:
          counts[ch] = counts.get(ch, 0) + 1
      return counts

  def first_long_word(words: list[str], min_length: int) -> str | None:
      for w in words:
          if len(w) >= min_length:
              return w
      return None

  print(mean([10.0, 15.0]))
  print(letter_counts("aba"))
  print(first_long_word(["hi", "yo"], 3))
  print(first_long_word(["Al", "Asha"], 3))
explanation: |
  The output is unchanged - hints don't alter behaviour. But now anyone reading `first_long_word` knows it may
  return None, and an editor can warn if you forget to handle that.
check:
  expected: |
    12.5
    {'a': 2, 'b': 1}
    None
    Asha
  tests:
    - name: every parameter and return value has a hint
      code: |
        for fn in (mean, letter_counts, first_long_word):
            hints = fn.__annotations__
            params = fn.__code__.co_varnames[:fn.__code__.co_argcount]
            missing = [p for p in params if p not in hints]
            assert not missing, f"{fn.__name__}: add hints for {missing}"
            assert "return" in hints, f"{fn.__name__}: add a return type (-> ...)"
```

```exercise
id: dataclass-basics
title: Replace a class with a dataclass
difficulty: beginner
instructions: |
  Rewrite `Book` as a `@dataclass` with fields `title: str`, `author: str` and `pages: int = 0`. Remove the
  hand-written `__init__`, `__repr__` and `__eq__` - the dataclass provides them.

  ```text
  Book(title='Emma', author='Jane Austen', pages=474)
  Book(title='Dune', author='Frank Herbert', pages=0)
  True
  ```
starter: |
  class Book:
      def __init__(self, title, author, pages=0):
          self.title = title
          self.author = author
          self.pages = pages

      def __repr__(self):
          return f"Book(title={self.title!r}, author={self.author!r}, pages={self.pages!r})"

      def __eq__(self, other):
          return (self.title, self.author, self.pages) == (other.title, other.author, other.pages)

  print(Book("Emma", "Jane Austen", 474))
  print(Book("Dune", "Frank Herbert"))
  print(Book("Emma", "Jane Austen", 474) == Book("Emma", "Jane Austen", 474))
hints:
  - "`from dataclasses import dataclass` at the top."
  - "Put `@dataclass` above `class Book:` and list the fields with their types: `title: str` ..."
solution: |
  from dataclasses import dataclass

  @dataclass
  class Book:
      title: str
      author: str
      pages: int = 0

  print(Book("Emma", "Jane Austen", 474))
  print(Book("Dune", "Frank Herbert"))
  print(Book("Emma", "Jane Austen", 474) == Book("Emma", "Jane Austen", 474))
explanation: |
  Three methods replaced by three lines of field declarations - with the same behaviour. Less code means fewer
  places for bugs.
check:
  expected: |
    Book(title='Emma', author='Jane Austen', pages=474)
    Book(title='Dune', author='Frank Herbert', pages=0)
    True
  require_text: ["@dataclass"]
  forbid_text: ["def __init__", "def __repr__", "def __eq__"]
```

```exercise
id: sortable-frozen
title: Ordered, frozen dataclasses
difficulty: intermediate
instructions: |
  Create a dataclass `Version` with `order=True` and `frozen=True` and integer fields `major`, `minor`, `patch`.
  Add a `__str__` that returns `"major.minor.patch"`. Sort the versions, print the newest, and show that changing
  a frozen version raises an error.

  ```text
  ['1.2.0', '1.10.0', '2.0.1']
  newest: 2.0.1
  cannot change: FrozenInstanceError
  ```
starter: |
  from dataclasses import dataclass, FrozenInstanceError

  # write the Version dataclass here

  versions = [Version(2, 0, 1), Version(1, 10, 0), Version(1, 2, 0)]
  print([str(v) for v in sorted(versions)])
  print("newest:", max(versions))
  try:
      versions[0].major = 5
  except FrozenInstanceError as err:
      print("cannot change:", type(err).__name__)
hints:
  - "`@dataclass(order=True, frozen=True)` above `class Version:`."
  - "Fields in the order they should be compared: `major: int`, `minor: int`, `patch: int`."
  - "`def __str__(self): return f\"{self.major}.{self.minor}.{self.patch}\"`"
solution: |
  from dataclasses import dataclass, FrozenInstanceError

  @dataclass(order=True, frozen=True)
  class Version:
      major: int
      minor: int
      patch: int

      def __str__(self):
          return f"{self.major}.{self.minor}.{self.patch}"

  versions = [Version(2, 0, 1), Version(1, 10, 0), Version(1, 2, 0)]
  print([str(v) for v in sorted(versions)])
  print("newest:", max(versions))
  try:
      versions[0].major = 5
  except FrozenInstanceError as err:
      print("cannot change:", type(err).__name__)
explanation: |
  `order=True` compares the fields in the order they are declared - exactly how version numbers work. `frozen=True`
  makes versions read-only values, which also lets them be used as dictionary keys or in sets.
check:
  expected: |
    ['1.2.0', '1.10.0', '2.0.1']
    newest: 2.0.1
    cannot change: FrozenInstanceError
  require_text: ["order=True", "frozen=True"]
```

```exercise
id: enum-status
title: Enums and validation
difficulty: challenge
instructions: |
  Create an `Enum` called `Status` with members `TODO = "todo"`, `DOING = "doing"`, `DONE = "done"`. Create a
  dataclass `Task` with `title: str` and `status: Status = Status.TODO`, and a `__post_init__` that converts a
  plain string status into a `Status` (so `Task("x", "done")` works) - an invalid string must raise `ValueError`.
  Then count tasks per status.

  ```text
  Task(title='write report', status=<Status.DONE: 'done'>)
  todo: 2
  doing: 1
  done: 1
  error: 'finished' is not a valid Status
  ```
starter: |
  from dataclasses import dataclass
  from enum import Enum

  # write Status and Task here

  tasks = [Task("write report", "done"), Task("email Ben"), Task("fix bug", Status.DOING), Task("book room", "todo")]
  print(tasks[0])
  for status in Status:
      print(f"{status.value}: {sum(1 for t in tasks if t.status is status)}")
  try:
      Task("party", "finished")
  except ValueError as err:
      print("error:", err)
hints:
  - "`class Status(Enum):` with the three members."
  - "In the dataclass: `def __post_init__(self): self.status = Status(self.status)` - Status(Status.DONE) also works."
  - "`Status(\"finished\")` raises ValueError automatically with that exact message."
solution: |
  from dataclasses import dataclass
  from enum import Enum

  class Status(Enum):
      TODO = "todo"
      DOING = "doing"
      DONE = "done"

  @dataclass
  class Task:
      title: str
      status: Status = Status.TODO

      def __post_init__(self):
          self.status = Status(self.status)

  tasks = [Task("write report", "done"), Task("email Ben"), Task("fix bug", Status.DOING), Task("book room", "todo")]
  print(tasks[0])
  for status in Status:
      print(f"{status.value}: {sum(1 for t in tasks if t.status is status)}")
  try:
      Task("party", "finished")
  except ValueError as err:
      print("error:", err)
explanation: |
  `Status(value)` turns "done" into `Status.DONE` and rejects anything not in the list, so a typo can never sneak
  into your data. Looping over an Enum gives its members in the order they were defined.
check:
  expected: |
    Task(title='write report', status=<Status.DONE: 'done'>)
    todo: 2
    doing: 1
    done: 1
    error: 'finished' is not a valid Status
  require_text: ["__post_init__", "Enum"]
```

```quiz
- id: q1
  question: 'What happens if you call `def double(x: int) -> int` with a string?'
  options:
    - It still runs - type hints are not enforced at runtime
    - Python refuses to start the program
    - The string is converted to an int automatically
    - A TypeHintError is raised
  answer: It still runs - type hints are not enforced at runtime
  explanation: Hints are for people and tools like mypy; Python ignores them when running.
- id: q2
  question: Which hint means "a string or None"?
  options:
    - str | None
    - str & None
    - list[str, None]
    - None[str]
  answer: str | None
  explanation: Optional[str] from typing means the same.
- id: q3
  question: Which methods does @dataclass generate by default?
  options:
    - __init__, __repr__ and __eq__
    - Only __init__
    - __str__ and __len__
    - Nothing - it only adds type checking
  answer: __init__, __repr__ and __eq__
  explanation: order=True adds comparison methods; frozen=True makes instances read-only.
- id: q4
  question: How do you give a dataclass field an empty list as its default?
  options:
    - 'items: list[str] = field(default_factory=list)'
    - 'items: list[str] = []'
    - 'items = list'
    - 'items: list[str] = None[]'
  answer: 'items: list[str] = field(default_factory=list)'
  explanation: A shared [] default would be reused by every instance, so dataclasses refuse it.
- id: q5
  question: Why use an Enum instead of plain strings like "done"?
  options:
    - Only the defined values are allowed, so typos become errors
    - Enums are faster to type
    - Strings can't be stored in variables
    - Enums are required by dataclasses
  answer: Only the defined values are allowed, so typos become errors
  explanation: Status("finsihed") raises ValueError instead of silently storing a wrong value.
- id: q6
  question: What does `frozen=True` do on a dataclass?
  options:
    - Makes instances read-only after creation
    - Stops the class from being imported
    - Makes the class faster by caching
    - Prevents creating more than one instance
  answer: Makes instances read-only after creation
  explanation: Assigning to a field raises FrozenInstanceError; frozen instances can be dict keys.
```
