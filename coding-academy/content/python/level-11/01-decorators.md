---
id: py-11-1-decorators
title: Decorators and functions as objects
track: python
level: 11
order: 1
minutes: 45
summary: Treat functions as values, write closures, and build decorators that add behaviour such as logging, timing, caching and validation without changing the original function.
objectives:
  - Pass functions as arguments and return them from other functions
  - Explain closures (inner functions that remember values)
  - Write a decorator with @ syntax and functools.wraps
  - Write a decorator that takes arguments
  - Use built-in decorators such as functools.lru_cache
prerequisites: [py-6-2-arguments-and-scope, py-8-2-comprehensions-lambda-sorting]
tags: [decorator, closure, higher-order function, wraps, functools, lru_cache, cache, wrapper, "@", first-class function]
---

## Simple explanation

In Python, **functions are values**: you can store them in variables, put them in lists, pass them to other
functions and return them.

```python
def shout(text):
    return text.upper()

speak = shout              # no brackets: the function itself, not its result
print(speak("hi"))         # HI
```

A **decorator** is a function that **wraps** another function to add something before or after it runs -
without editing the original:

```python
def announce(func):
    def wrapper(*args, **kwargs):
        print(f"calling {func.__name__}")
        return func(*args, **kwargs)
    return wrapper

@announce                  # same as: add = announce(add)
def add(a, b):
    return a + b

print(add(2, 3))           # calling add / 5
```

## Real-world analogy

A decorator is **gift wrapping**: the present (the function) is unchanged, but the wrapping adds something on
the outside - a label, a bow, a "fragile" sticker. You can wrap many different presents with the same paper.

## Technical definition

- **First-class functions**: functions are objects - assignable, passable, returnable.
- **Higher-order function**: takes or returns a function (`sorted(key=...)`, `map`, decorators).
- **Closure**: an inner function that remembers variables from the enclosing function even after it returned.
  Use `nonlocal name` to *change* such a variable.
- **Decorator**: a callable taking a function and returning a replacement. `@decorator` above `def f` means
  `f = decorator(f)`.
- `*args, **kwargs` in the wrapper accept any arguments and pass them on unchanged.
- `@functools.wraps(func)` on the wrapper copies the name and docstring, so `f.__name__` stays `"f"`.
- **Decorator with arguments**: a function that *returns* a decorator - three levels: `def repeat(n)` →
  `def decorator(func)` → `def wrapper(*args, **kwargs)`.
- Built-ins: `@functools.lru_cache` / `@functools.cache` (memoisation), `@property`, `@staticmethod`,
  `@classmethod`, `@dataclass`.

## Step-by-step examples

**Example 1 - a closure**

```python
def make_multiplier(factor):
    def multiply(x):
        return x * factor          # remembers factor
    return multiply

double = make_multiplier(2)
triple = make_multiplier(3)
print(double(5), triple(5))        # 10 15
```

**Example 2 - a counting decorator with wraps**

```python
import functools

def count_calls(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        wrapper.calls += 1
        return func(*args, **kwargs)
    wrapper.calls = 0
    return wrapper

@count_calls
def greet(name):
    """Say hello."""
    return f"Hello {name}"

greet("Asha"); greet("Ben")
print(greet.calls, greet.__name__, greet.__doc__)   # 2 greet Say hello.
```

**Example 3 - caching slow results**

```python
from functools import lru_cache

@lru_cache(maxsize=None)
def fib(n):
    return n if n < 2 else fib(n - 1) + fib(n - 2)

print(fib(80))     # 23416728348467685 - instant, because results are remembered
```

Without the cache, `fib(80)` would make billions of calls.

## Common mistakes

- **`@decorator` with a wrapper that forgets `return func(...)`** - the decorated function returns None.
- **Calling the function when passing it**: `announce(add())` instead of `announce(add)`.
- **Forgetting `functools.wraps`** - every decorated function is named "wrapper", confusing errors and tools.
- **Wrapper with fixed parameters** (`def wrapper(a, b)`) - breaks for other functions. Use `*args, **kwargs`.
- **Decorator with arguments missing a level** - `@repeat(3)` needs `repeat` to *return* a decorator.
- **Caching functions with side effects** or whose arguments are lists (unhashable) - `lru_cache` needs
  hashable arguments and only suits pure functions.

## Practical application

Web frameworks use decorators to connect URLs to functions (`@app.route("/home")`); test tools use them to mark
tests; you can use them to log calls, time slow functions, retry flaky network calls, check permissions, or cache
expensive calculations - all without touching the function bodies.

## Revision notes

- Functions are values: `f` is the function, `f()` calls it.
- Closure = inner function remembering outer variables (`nonlocal` to change them).
- Decorator pattern: `def deco(func): @wraps(func) def wrapper(*args, **kwargs): ...; return func(*args, **kwargs); return wrapper`.
- `@deco` means `f = deco(f)`; `@deco(arg)` needs a decorator factory.
- `@lru_cache` remembers results of pure functions.

```exercise
id: functions-as-values
title: Pass a function to a function
difficulty: beginner
instructions: |
  Write `apply_to_all(func, values)` that returns a new list with `func` applied to each value. Use it with the
  built-in `abs`, with `str.upper`, and with your own function `square`.

  ```text
  [3, 0, 7]
  ['A', 'BC']
  [1, 4, 9]
  ```
starter: |
  def apply_to_all(func, values):
      pass

  def square(x):
      return x * x

  print(apply_to_all(abs, [-3, 0, 7]))
  print(apply_to_all(str.upper, ["a", "bc"]))
  print(apply_to_all(square, [1, 2, 3]))
hints:
  - "Inside, `func` is just a variable holding a function - call it with `func(value)`."
  - "`return [func(v) for v in values]`"
solution: |
  def apply_to_all(func, values):
      return [func(v) for v in values]

  def square(x):
      return x * x

  print(apply_to_all(abs, [-3, 0, 7]))
  print(apply_to_all(str.upper, ["a", "bc"]))
  print(apply_to_all(square, [1, 2, 3]))
explanation: |
  `abs`, `str.upper` and `square` are passed without brackets - you hand over the function itself, and
  `apply_to_all` decides when to call it. This is what the built-in `map` does.
check:
  expected: |
    [3, 0, 7]
    ['A', 'BC']
    [1, 4, 9]
  forbid: [call:map]
```

```exercise
id: closure-counter
title: A closure that remembers
difficulty: beginner
instructions: |
  Write `make_counter(start)` that returns a function. Each call to that function returns the next number,
  beginning at `start`. Two counters must be independent. Use `nonlocal`.

  ```text
  10 11 12
  1 2
  13
  ```
starter: |
  def make_counter(start):
      pass

  a = make_counter(10)
  b = make_counter(1)
  print(a(), a(), a())
  print(b(), b())
  print(a())
hints:
  - "Inside make_counter: `current = start`, then define `def next_number():`."
  - "In next_number: `nonlocal current`, save the value, add 1, return the saved value."
  - "Finally `return next_number` (no brackets)."
solution: |
  def make_counter(start):
      current = start

      def next_number():
          nonlocal current
          value = current
          current += 1
          return value

      return next_number

  a = make_counter(10)
  b = make_counter(1)
  print(a(), a(), a())
  print(b(), b())
  print(a())
explanation: |
  Each call to `make_counter` creates a new `current` variable, and the returned function keeps its own one.
  `nonlocal` lets the inner function change it instead of creating a new local variable.
check:
  expected: |
    10 11 12
    1 2
    13
  require_text: ["nonlocal"]
```

```exercise
id: logging-decorator
title: Write a logging decorator
difficulty: intermediate
instructions: |
  Write a decorator `log_calls` that prints `-> name(args)` before the call and `<- name returned value` after,
  and returns the original result. Use `functools.wraps` so the name is kept. Show the positional arguments
  with `", ".join(repr(a) for a in args)`.

  ```text
  -> add(2, 3)
  <- add returned 5
  5
  -> shout('hi')
  <- shout returned 'HI!'
  add shout
  ```
starter: |
  import functools

  # write log_calls here

  @log_calls
  def add(a, b):
      return a + b

  @log_calls
  def shout(text):
      return text.upper() + "!"

  print(add(2, 3))
  shout("hi")
  print(add.__name__, shout.__name__)
hints:
  - "`def log_calls(func):` containing `@functools.wraps(func)` and `def wrapper(*args, **kwargs):`."
  - "In the wrapper: print the arrow line, `result = func(*args, **kwargs)`, print the return line with `{result!r}`, `return result`."
  - "The name is `func.__name__`."
solution: |
  import functools

  def log_calls(func):
      @functools.wraps(func)
      def wrapper(*args, **kwargs):
          shown = ", ".join(repr(a) for a in args)
          print(f"-> {func.__name__}({shown})")
          result = func(*args, **kwargs)
          print(f"<- {func.__name__} returned {result!r}")
          return result
      return wrapper

  @log_calls
  def add(a, b):
      return a + b

  @log_calls
  def shout(text):
      return text.upper() + "!"

  print(add(2, 3))
  shout("hi")
  print(add.__name__, shout.__name__)
explanation: |
  The same decorator works for any function because the wrapper accepts `*args, **kwargs`. Without
  `functools.wraps`, both functions would report their name as "wrapper".
check:
  expected: |
    -> add(2, 3)
    <- add returned 5
    5
    -> shout('hi')
    <- shout returned 'HI!'
    add shout
  require_text: ["wraps"]
  requires: [decorator]
```

```exercise
id: retry-decorator
title: A decorator with arguments
difficulty: challenge
instructions: |
  Write `retry(times)` - a decorator factory. The decorated function is called up to `times` times; if it
  raises `ConnectionError`, print `attempt N failed` and try again. If every attempt fails, re-raise the last
  error. Any other exception type must not be retried.

  ```text
  attempt 1 failed
  attempt 2 failed
  connected on try 3
  attempt 1 failed
  attempt 2 failed
  gave up: still offline
  ```
starter: |
  import functools

  # write retry(times) here

  tries = {"count": 0}

  @retry(times=3)
  def flaky_connect():
      tries["count"] += 1
      if tries["count"] < 3:
          raise ConnectionError("network down")
      return f"connected on try {tries['count']}"

  @retry(times=2)
  def always_offline():
      raise ConnectionError("still offline")

  print(flaky_connect())
  try:
      always_offline()
  except ConnectionError as err:
      print("gave up:", err)
hints:
  - "Three levels: `def retry(times):` → `def decorator(func):` → `def wrapper(*args, **kwargs):`; each returns the next."
  - "In the wrapper: `for attempt in range(1, times + 1):` with `try: return func(*args, **kwargs)` and `except ConnectionError as err:`."
  - "In the except: print the message and remember `last_error = err`. After the loop, `raise last_error`."
solution: |
  import functools

  def retry(times):
      def decorator(func):
          @functools.wraps(func)
          def wrapper(*args, **kwargs):
              last_error = None
              for attempt in range(1, times + 1):
                  try:
                      return func(*args, **kwargs)
                  except ConnectionError as err:
                      print(f"attempt {attempt} failed")
                      last_error = err
              raise last_error
          return wrapper
      return decorator

  tries = {"count": 0}

  @retry(times=3)
  def flaky_connect():
      tries["count"] += 1
      if tries["count"] < 3:
          raise ConnectionError("network down")
      return f"connected on try {tries['count']}"

  @retry(times=2)
  def always_offline():
      raise ConnectionError("still offline")

  print(flaky_connect())
  try:
      always_offline()
  except ConnectionError as err:
      print("gave up:", err)
explanation: |
  `retry(times=3)` runs first and returns the real decorator, which then wraps the function. Only
  `ConnectionError` is caught, so programming mistakes (like a TypeError) still fail immediately instead of being
  hidden by retries. Real retry code also waits a little longer between each attempt.
check:
  expected: |
    attempt 1 failed
    attempt 2 failed
    connected on try 3
    attempt 1 failed
    attempt 2 failed
    gave up: still offline
  tests:
    - name: other errors are not retried
      code: |
        calls = []
        @retry(times=3)
        def broken():
            calls.append(1)
            raise TypeError("bug")
        try:
            broken()
        except TypeError:
            pass
        assert len(calls) == 1, "A TypeError should not be retried"
```

```quiz
- id: q1
  question: What does `@timer` above `def work():` mean?
  options:
    - work = timer(work)
    - timer = work(timer)
    - work is called immediately
    - timer becomes a method of work
  answer: work = timer(work)
  explanation: The decorator receives the function and returns its replacement.
- id: q2
  question: Why do wrappers usually accept `*args, **kwargs`?
  options:
    - So the decorator works with functions that take any arguments
    - Because Python requires it
    - To make the function faster
    - To hide errors
  answer: So the decorator works with functions that take any arguments
  explanation: The wrapper passes them on unchanged with func(*args, **kwargs).
- id: q3
  question: What does `functools.wraps(func)` do?
  options:
    - Copies the original function's name and docstring onto the wrapper
    - Runs the function twice
    - Caches results
    - Converts the function into a class
  answer: Copies the original function's name and docstring onto the wrapper
  explanation: Without it, every decorated function looks like "wrapper".
- id: q4
  question: What is a closure?
  options:
    - An inner function that remembers variables from the function that created it
    - A function that closes files
    - The last line of a function
    - A function with no arguments
  answer: An inner function that remembers variables from the function that created it
  explanation: make_multiplier(2) returns a function that remembers factor = 2.
- id: q5
  question: Which function suits `@lru_cache`?
  options:
    - A pure calculation whose result depends only on its arguments
    - A function that prints a random greeting
    - A function that reads the current time
    - A function that appends to a global list
  answer: A pure calculation whose result depends only on its arguments
  explanation: Caching a function with side effects or changing results gives wrong answers.
- id: q6
  question: How many nested functions does a decorator that takes arguments, like `@retry(3)`, usually need?
  options:
    - Three - the factory, the decorator and the wrapper
    - One
    - Two - the decorator and the wrapper only
    - None - arguments are not allowed
  answer: Three - the factory, the decorator and the wrapper
  explanation: retry(3) returns a decorator, which returns the wrapper.
```
