---
id: py-8-1-modules-and-stdlib
title: Modules, imports, packages and the standard library
track: python
level: 8
order: 1
minutes: 40
summary: Reuse code with import - the different import styles, writing your own module, what packages are, and a tour of useful standard-library modules (math, random, statistics, collections, datetime, pathlib).
objectives:
  - Import modules in different ways and explain the trade-offs
  - Create your own module file and import it
  - Explain the difference between a module, a package and a library
  - Use standard-library modules - random, statistics, collections.Counter, math
  - Find documentation for a module with help() and dir()
prerequisites: [py-6-3-problem-decomposition]
tags: [module, import, package, standard library, random, statistics, collections, Counter, math, help]
---

## Simple explanation

A **module** is simply a Python file whose functions and variables you can use in another program with
**import**. Python ships with hundreds of ready-made modules - the **standard library** ("batteries included").

```python
import math
print(math.sqrt(16))           # 4.0

from random import choice
print(choice(["rock", "paper", "scissors"]))

import statistics as stats
print(stats.mean([2, 4, 9]))   # 5
```

- `import math` - use as `math.sqrt(...)` (clear where it comes from).
- `from random import choice` - use `choice(...)` directly.
- `import statistics as stats` - a shorter nickname (an *alias*).

A **package** is a folder of modules. A **library** is the everyday word for any reusable collection (module or
package). Extra libraries from the internet are installed with `pip` (Level 10).

## Real-world analogy

The standard library is like a **well-equipped kitchen**: you do not build a blender before making a smoothie -
you take it from the cupboard (`import`). `from blender import pulse_button` is taking just the part you need;
`import blender as b` is putting a short label on the cupboard.

## Technical definition

- **Module**: a `.py` file (or built-in extension); importing runs it once and creates a module object whose
  attributes are its top-level names. Later imports reuse the cached module.
- **Search path**: Python looks for modules in the script's folder (in this app: your practice folder), then the
  standard library, then installed packages (`sys.path`).
- **Package**: a directory of modules (usually with an `__init__.py`); import with dots:
  `from email.message import EmailMessage`.
- Import styles: `import m`, `import m as alias`, `from m import name`, `from m import name as alias`.
  Avoid `from m import *` - it hides where names come from and can overwrite your own names.
- Discover: `dir(module)` lists names; `help(module.function)` shows documentation; docs.python.org has it all.
- Useful standard modules: `math`, `random`, `statistics`, `datetime`, `pathlib`, `os`, `json`, `csv`,
  `collections` (`Counter`, `defaultdict`, `namedtuple`), `itertools`, `string`, `time`, `logging`, `re`
  (regular expressions), `sqlite3`.
- **Name clashes**: never name your own file like a standard module (`random.py`, `math.py`) - it would be
  imported instead of the real one.

## Step-by-step examples

**Example 1 - random choices**

```python
import random
random.seed(42)                     # makes the "random" results repeatable (useful for testing)
print(random.randint(1, 6))         # a dice roll from 1 to 6
print(random.choice(["red", "green", "blue"]))
cards = ["A", "K", "Q", "J"]
random.shuffle(cards)
print(cards)
```

**Example 2 - statistics**

```python
import statistics
data = [3, 7, 7, 2, 9]
print(statistics.mean(data))     # 5.6
print(statistics.median(data))   # 7
print(statistics.mode(data))     # 7
```

**Example 3 - collections.Counter**

```python
from collections import Counter
words = "the cat and the hat and the bat".split()
counts = Counter(words)
print(counts.most_common(2))     # [('the', 3), ('and', 2)]
```

`Counter` does the counting pattern from Level 4 in one line.

**Example 4 - your own module**

Create a file in your practice folder (the Python Lab's *Free coding* can create it):

```python
code = '''
def greet(name):
    return f"Hello, {name}!"

VERSION = "1.0"
'''
with open("helpers.py", "w", encoding="utf-8") as f:
    f.write(code)

import helpers
print(helpers.greet("Asha"), helpers.VERSION)
```

Output: `Hello, Asha! 1.0`. Any `.py` file in the same folder can be imported by its name (without `.py`).

## Common mistakes

- **Naming a file after a module** (`random.py`) → `AttributeError: module 'random' has no attribute 'randint'`
  because your file was imported instead.
- **Forgetting the module prefix**: after `import math`, write `math.sqrt`, not `sqrt`.
- **`from module import *`** - unclear origins and silent overwrites.
- **Importing inside loops** - harmless but untidy; put imports at the top of the file.
- **ModuleNotFoundError** for third-party packages - they must be installed with pip first.

## Practical application

Real programs are mostly *glue* between modules: `csv` to read data, `statistics` to summarise, `datetime` for
dates, `json` to save results, `random` for games and sampling, `pathlib` for files. Knowing what already exists
saves hours - always check the standard library before writing something yourself.

## Revision notes

- `import m` → `m.name`; `from m import name`; `import m as alias`. Avoid `import *`.
- Module = a .py file; package = a folder of modules; standard library = modules that come with Python.
- Your own `helpers.py` → `import helpers`.
- Explore with `dir(m)` and `help(m.func)`.
- Handy: `random`, `statistics`, `collections.Counter`, `math`, `datetime`, `pathlib`, `json`, `csv`.
- Never name your files after standard modules.

```exercise
id: dice-stats
title: Dice statistics
difficulty: beginner
instructions: |
  Using `random.seed(1)` (already in the starter, so the results are repeatable), roll a six-sided die 10 times
  with `random.randint(1, 6)`, store the rolls in a list and print the list, the mean and the median using the
  `statistics` module.

  ```text
  [2, 5, 1, 3, 1, 4, 4, 4, 6, 4]
  Mean: 3.4
  Median: 4.0
  ```
starter: |
  import random
  random.seed(1)
hints:
  - "`import statistics` at the top."
  - "`rolls = []` and `for _ in range(10): rolls.append(random.randint(1, 6))`"
  - "`statistics.mean(rolls)` and `statistics.median(rolls)`"
solution: |
  import random
  import statistics
  random.seed(1)
  rolls = []
  for _ in range(10):
      rolls.append(random.randint(1, 6))
  print(rolls)
  print("Mean:", statistics.mean(rolls))
  print("Median:", statistics.median(rolls))
explanation: |
  A seed makes the random sequence reproducible - handy for testing. `statistics` provides mean, median, mode,
  standard deviation and more. (`_` is a conventional name for a loop variable you do not use.)
check:
  expected: |
    [2, 5, 1, 3, 1, 4, 4, 4, 6, 4]
    Mean: 3.4
    Median: 4.0
  requires: [import]
```

```exercise
id: counter-words
title: Most common words with Counter
difficulty: beginner
instructions: |
  Use `collections.Counter` to find the **3 most common words** (in lower case) in `text`, and print each with its
  count:

  ```text
  to 4
  be 2
  or 2
  ```
starter: |
  text = "To be or not to be to do or to dare"
hints:
  - "`from collections import Counter`"
  - "`counts = Counter(text.lower().split())`"
  - "`for word, n in counts.most_common(3): print(word, n)`"
solution: |
  from collections import Counter
  text = "To be or not to be to do or to dare"
  counts = Counter(text.lower().split())
  for word, n in counts.most_common(3):
      print(word, n)
explanation: |
  `Counter` counts items in one step; `most_common(n)` returns the n most frequent as (item, count) pairs. "be" and
  "or" both appear twice; when counts are equal, `most_common` keeps the order in which the words were first
  seen, so "be" comes before "or".
check:
  expected: |
    to 4
    be 2
    or 2
  requires: ["call:Counter", "method:most_common"]
```

```exercise
id: own-module
title: Create and import your own module
difficulty: intermediate
instructions: |
  The starter writes a module file `shapes.py` into your practice folder. Add a second function
  `circle_area(r)` to the module text (use `math.pi * r ** 2`, rounded to 2 decimals), then import the module and
  print `shapes.square_area(3)` and `shapes.circle_area(2)`:

  ```text
  9
  12.57
  ```
starter: |
  module_code = '''
  import math

  def square_area(side):
      return side * side
  '''
  with open("shapes.py", "w", encoding="utf-8") as f:
      f.write(module_code)

  import importlib, shapes
  importlib.reload(shapes)    # pick up changes if you run this again
hints:
  - "Add to the module text: `def circle_area(r):` and `return round(math.pi * r ** 2, 2)` (indented inside the function)."
  - "After the import lines: `print(shapes.square_area(3))` and `print(shapes.circle_area(2))`."
solution: |
  module_code = '''
  import math

  def square_area(side):
      return side * side

  def circle_area(r):
      return round(math.pi * r ** 2, 2)
  '''
  with open("shapes.py", "w", encoding="utf-8") as f:
      f.write(module_code)

  import importlib, shapes
  importlib.reload(shapes)    # pick up changes if you run this again
  print(shapes.square_area(3))
  print(shapes.circle_area(2))
explanation: |
  A module is just a .py file. Importing it runs it once and gives you its functions as `shapes.name`. Because
  Python caches imports, `importlib.reload` re-reads the file after you change it.
check:
  expected: |
    9
    12.57
  tests:
    - name: shapes.py defines circle_area
      code: |
        import shapes
        assert shapes.circle_area(1) == 3.14
```

```exercise
id: password-generator
title: A password generator with the standard library
difficulty: challenge
instructions: |
  Write `make_password(length)` that returns a random password of the given length using letters and digits from
  `string.ascii_letters + string.digits`, chosen with `random.choice`. It must contain **at least one digit**:
  keep generating until it does.

  The starter prints two generated passwords and then `True True` if both contain a digit. The exact passwords
  depend on the random sequence, so the checker tests the rules (length, allowed characters, at least one digit)
  rather than the exact text.
starter: |
  import random
  import string
  random.seed(7)

  def make_password(length):
      pass

  p1 = make_password(10)
  p2 = make_password(4)
  print(p1, p2)
  print(any(c.isdigit() for c in p1), any(c.isdigit() for c in p2))
hints:
  - "`alphabet = string.ascii_letters + string.digits`"
  - "Build one password: `\"\".join(random.choice(alphabet) for _ in range(length))`"
  - "`while True:` generate, and `return` it as soon as `any(c.isdigit() for c in password)`."
solution: |
  import random
  import string
  random.seed(7)

  def make_password(length):
      alphabet = string.ascii_letters + string.digits
      while True:
          password = "".join(random.choice(alphabet) for _ in range(length))
          if any(c.isdigit() for c in password):
              return password

  p1 = make_password(10)
  p2 = make_password(4)
  print(p1, p2)
  print(any(c.isdigit() for c in p1), any(c.isdigit() for c in p2))
explanation: |
  `string` provides ready-made character sets; `random.choice` picks one character at a time. For real passwords
  use the `secrets` module (`secrets.choice`), which is designed for security - `random` is predictable, as the
  seed shows.
check:
  contains: ["True True"]
  tests:
    - name: passwords have the right length and only letters/digits
      code: |
        import string
        for n in (1, 5, 12):
            p = make_password(n)
            assert len(p) == n, f"make_password({n}) has length {len(p)}"
            assert all(c in string.ascii_letters + string.digits for c in p)
            assert any(c.isdigit() for c in p)
```

```quiz
- id: q1
  question: After `import math`, how do you call the square-root function?
  options:
    - math.sqrt(9)
    - sqrt(9)
    - math(sqrt, 9)
    - import.sqrt(9)
  answer: math.sqrt(9)
  explanation: With "import math", names are accessed through the module name.
- id: q2
  question: What is a module?
  options:
    - A Python file whose code can be imported and reused
    - A type of loop
    - A website
    - A variable that holds numbers
  answer: A Python file whose code can be imported and reused
  explanation: Any .py file can be imported as a module.
- id: q3
  question: You named your file random.py and now `random.randint` fails. Why?
  options:
    - Python imports your file instead of the standard random module
    - random is broken
    - randint was removed from Python
    - Files cannot be named random.py
  answer: Python imports your file instead of the standard random module
  explanation: The script's own folder is searched first. Rename your file.
- id: q4
  question: Which import gives the name `choice` directly, without a prefix?
  options:
    - from random import choice
    - import random
    - import random as choice
    - import choice
  answer: from random import choice
  explanation: from module import name puts that name straight into your program.
- id: q5
  question: 'What does `Counter("banana").most_common(1)` return?'
  options:
    - "[('a', 3)]"
    - "[('b', 1)]"
    - "('a', 3)"
    - "3"
  answer: "[('a', 3)]"
  explanation: most_common(1) returns a list with the single most frequent item and its count.
- id: q6
  question: Why is `from module import *` discouraged?
  options:
    - It hides where names come from and can silently overwrite your own names
    - It is slower
    - It only imports one name
    - It is a SyntaxError
  answer: It hides where names come from and can silently overwrite your own names
  explanation: Explicit imports keep code readable and safe.
```
