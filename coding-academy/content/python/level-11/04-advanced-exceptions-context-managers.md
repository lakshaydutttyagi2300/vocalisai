---
id: py-11-4-advanced-exceptions-context-managers
title: Custom exceptions and context managers
track: python
level: 11
order: 4
minutes: 45
summary: Design your own exception hierarchy, chain errors with "raise ... from", use else/finally correctly, and write context managers with classes and contextlib.
objectives:
  - Create custom exception classes and a small hierarchy
  - Chain exceptions with raise ... from ... to keep the original cause
  - Use try / except / else / finally in the right places
  - Write context managers with __enter__/__exit__ and with @contextmanager
prerequisites: [py-7-3-exceptions, py-8-3-iterators-generators-context]
tags: [exception, custom exception, hierarchy, raise from, chaining, finally, else, context manager, with, __enter__, __exit__, contextlib, contextmanager, suppress, cleanup]
---

## Simple explanation

Python's built-in errors (`ValueError`, `KeyError`...) are general. For your own programs you can define
**specific** errors that say exactly what went wrong:

```python
class InsufficientFunds(Exception):
    """Raised when a withdrawal is larger than the balance."""

def withdraw(balance, amount):
    if amount > balance:
        raise InsufficientFunds(f"need {amount - balance} more")
    return balance - amount

try:
    withdraw(50, 80)
except InsufficientFunds as err:
    print("Sorry:", err)          # Sorry: need 30 more
```

A **context manager** is anything you can use with `with`: it sets something up and **guarantees clean-up**,
even if an error happens - like `with open(...)` closing the file. You can write your own.

## Real-world analogy

Custom exceptions are **specific warning lights** in a car - "oil low" is far more useful than one generic
"something is wrong" light. A context manager is a **hotel room key card**: check-in gives you the room, and
check-out happens automatically when you leave, even if you leave in a hurry.

## Technical definition

- Custom exceptions subclass `Exception` (or a more specific built-in such as `ValueError`). A small
  **hierarchy** (`class AppError(Exception)`, `class ConfigError(AppError)`) lets callers catch broadly
  (`except AppError`) or precisely.
- `raise NewError("message") from original` **chains** errors: the traceback shows both, and
  `err.__cause__` holds the original. `from None` hides the original when it is irrelevant.
- `try` / `except` / `else` / `finally`: `else` runs only if no exception happened; `finally` **always** runs
  (clean-up). Keep the `try` block small.
- Re-raise with a bare `raise` inside `except` to pass the same error on after logging it.
- `ExceptionGroup` and `except*` (Python 3.11+) handle several errors at once (e.g. from parallel tasks).
- **Context manager protocol**: `__enter__(self)` (its return value is bound by `as`) and
  `__exit__(self, exc_type, exc, tb)` (runs on exit; return `True` to swallow an exception).
- `contextlib.contextmanager` turns a generator into a context manager: code before `yield` = enter, after =
  exit (put it in `finally` to run on errors). `contextlib.suppress(FileNotFoundError)` ignores a specific error.

## Step-by-step examples

**Example 1 - chaining with `from`**

```python
class ConfigError(Exception):
    pass

def load_port(settings):
    try:
        return int(settings["port"])
    except (KeyError, ValueError) as err:
        raise ConfigError("port setting is missing or not a number") from err

try:
    load_port({"port": "eighty"})
except ConfigError as err:
    print(err, "| caused by:", type(err.__cause__).__name__)
# port setting is missing or not a number | caused by: ValueError
```

**Example 2 - else and finally**

```python
def read_number(text):
    try:
        value = int(text)
    except ValueError:
        print("not a number")
    else:
        print("got", value)          # only when no error
    finally:
        print("done")                # always

read_number("5")      # got 5 / done
read_number("x")      # not a number / done
```

**Example 3 - a context manager with contextlib**

```python
from contextlib import contextmanager

@contextmanager
def section(title):
    print(f"--- {title} ---")
    try:
        yield
    finally:
        print(f"--- end of {title} ---")

with section("Report"):
    print("all good")
```

## Common mistakes

- **`except Exception: pass`** - hides every bug. Catch specific exceptions and handle them.
- **Huge `try` blocks** - you can't tell which line failed. Wrap only the risky line(s).
- **Raising a new error and losing the original** - use `raise ... from err`.
- **Clean-up code after the `yield` without `try/finally`** - it is skipped when an error occurs.
- **Returning True from `__exit__` by accident** - silently swallows every exception.
- **Custom exceptions for everything** - only create them when callers need to tell errors apart.

## Practical application

Libraries define exception hierarchies (`requests.exceptions.RequestException` → `ConnectionError`,
`Timeout`...), so you can choose how broadly to catch. Context managers handle anything with set-up and
clean-up: files, database transactions (commit or roll back), locks, temporary folders
(`tempfile.TemporaryDirectory`), timing a block of code, or temporarily changing a setting.

## Revision notes

- `class MyError(Exception): pass` - subclass a sensible base; build a small hierarchy if useful.
- `raise New(...) from err` keeps the cause; bare `raise` re-raises.
- `else` = only on success; `finally` = always.
- Context manager: `__enter__`/`__exit__`, or `@contextmanager` with `try: yield finally: ...`.
- Catch specific errors; keep `try` small.

```exercise
id: custom-exception
title: Create a custom exception
difficulty: beginner
instructions: |
  Create `class OutOfStock(Exception)`. `buy(stock, item, qty)` should raise
  `OutOfStock("only N left of ITEM")` when there isn't enough, otherwise reduce the stock and return the new
  amount. Catch the error in the loop and print it.

  ```text
  bought 2 tea, 3 left
  cannot buy: only 1 left of milk
  bought 1 milk, 0 left
  ```
starter: |
  # define OutOfStock here

  def buy(stock, item, qty):
      pass

  stock = {"tea": 5, "milk": 1}
  for item, qty in [("tea", 2), ("milk", 3), ("milk", 1)]:
      try:
          left = buy(stock, item, qty)
          print(f"bought {qty} {item}, {left} left")
      except OutOfStock as err:
          print("cannot buy:", err)
hints:
  - "`class OutOfStock(Exception):` with a docstring or `pass` as its body."
  - "In buy: `if qty > stock[item]: raise OutOfStock(f\"only {stock[item]} left of {item}\")`."
  - "Otherwise `stock[item] -= qty` and `return stock[item]`."
solution: |
  class OutOfStock(Exception):
      """Raised when there is not enough stock for a purchase."""

  def buy(stock, item, qty):
      if qty > stock[item]:
          raise OutOfStock(f"only {stock[item]} left of {item}")
      stock[item] -= qty
      return stock[item]

  stock = {"tea": 5, "milk": 1}
  for item, qty in [("tea", 2), ("milk", 3), ("milk", 1)]:
      try:
          left = buy(stock, item, qty)
          print(f"bought {qty} {item}, {left} left")
      except OutOfStock as err:
          print("cannot buy:", err)
explanation: |
  The caller can now catch exactly this situation without accidentally catching unrelated errors such as a
  KeyError for an unknown item.
check:
  expected: |
    bought 2 tea, 3 left
    cannot buy: only 1 left of milk
    bought 1 milk, 0 left
  tests:
    - name: OutOfStock is an Exception subclass
      code: |
        assert issubclass(OutOfStock, Exception) and OutOfStock is not Exception
```

```exercise
id: chain-errors
title: Chain errors with raise ... from
difficulty: beginner
instructions: |
  `parse_settings` turns `"key=value"` lines into a dict, converting `timeout` to an int. Wrap problems in a
  `SettingsError` that keeps the original exception as its cause (`raise ... from err`):

  - a line without `=` → `SettingsError("line N is not key=value")`
  - a timeout that isn't a number → `SettingsError("timeout must be a whole number")`

  ```text
  {'name': 'demo', 'timeout': 30}
  line 2 is not key=value | cause: ValueError
  timeout must be a whole number | cause: ValueError
  ```
starter: |
  class SettingsError(Exception):
      pass

  def parse_settings(text):
      settings = {}
      for number, line in enumerate(text.splitlines(), start=1):
          key, value = line.split("=")
          settings[key] = value
      settings["timeout"] = int(settings["timeout"])
      return settings

  print(parse_settings("name=demo\ntimeout=30"))
  for bad in ["name=demo\noops", "timeout=soon"]:
      try:
          parse_settings(bad)
      except SettingsError as err:
          print(err, "| cause:", type(err.__cause__).__name__)
hints:
  - "`key, value = line.split(\"=\")` raises ValueError when there is no `=`. Wrap it: `try: ... except ValueError as err: raise SettingsError(f\"line {number} is not key=value\") from err`."
  - "Do the same around `int(settings[\"timeout\"])`."
solution: |
  class SettingsError(Exception):
      pass

  def parse_settings(text):
      settings = {}
      for number, line in enumerate(text.splitlines(), start=1):
          try:
              key, value = line.split("=")
          except ValueError as err:
              raise SettingsError(f"line {number} is not key=value") from err
          settings[key] = value
      try:
          settings["timeout"] = int(settings["timeout"])
      except ValueError as err:
          raise SettingsError("timeout must be a whole number") from err
      return settings

  print(parse_settings("name=demo\ntimeout=30"))
  for bad in ["name=demo\noops", "timeout=soon"]:
      try:
          parse_settings(bad)
      except SettingsError as err:
          print(err, "| cause:", type(err.__cause__).__name__)
explanation: |
  Callers only need to catch `SettingsError`, and the friendly message says what to fix - while `__cause__` keeps
  the technical detail for debugging. Without `from err`, `__cause__` would be None.
check:
  expected: |
    {'name': 'demo', 'timeout': 30}
    line 2 is not key=value | cause: ValueError
    timeout must be a whole number | cause: ValueError
  require_text: ["from err"]
```

```exercise
id: else-finally
title: try / except / else / finally
difficulty: intermediate
instructions: |
  Complete `process(values)`: for each value, try to compute `100 / int(value)`.

  - On `ValueError` print `"<value>: not a number"`; on `ZeroDivisionError` print `"<value>: cannot divide by zero"`.
  - In an `else` block print `"<value>: <result>"` (result rounded to 2 decimals) and add 1 to `ok`.
  - In a `finally` block add 1 to `attempts`.

  After the loop print the counters.

  ```text
  4: 25.0
  x: not a number
  0: cannot divide by zero
  3: 33.33
  2 ok out of 4 attempts
  ```
starter: |
  def process(values):
      ok = 0
      attempts = 0
      for value in values:
          pass  # your try / except / else / finally here
      print(f"{ok} ok out of {attempts} attempts")

  process(["4", "x", "0", "3"])
hints:
  - "`try: result = 100 / int(value)` - keep only the risky line in the try."
  - "Two `except` blocks, then `else:` for the success message, then `finally: attempts += 1`."
solution: |
  def process(values):
      ok = 0
      attempts = 0
      for value in values:
          try:
              result = 100 / int(value)
          except ValueError:
              print(f"{value}: not a number")
          except ZeroDivisionError:
              print(f"{value}: cannot divide by zero")
          else:
              print(f"{value}: {round(result, 2)}")
              ok += 1
          finally:
              attempts += 1
      print(f"{ok} ok out of {attempts} attempts")

  process(["4", "x", "0", "3"])
explanation: |
  The `try` contains only the line that can fail; success-only code goes in `else`, so an error inside it would
  not be mistaken for a conversion problem. `finally` runs every time, whatever happened.
check:
  expected: |
    4: 25.0
    x: not a number
    0: cannot divide by zero
    3: 33.33
    2 ok out of 4 attempts
  require_text: ["else:", "finally:"]
```

```exercise
id: own-context-manager
title: Write a context manager
difficulty: challenge
instructions: |
  Write a class `Transaction` that works with `with` for a simple "bank": on enter it saves a **copy** of the
  accounts dict and returns the accounts; on exit, if an exception happened it **restores** the saved copy, prints
  `rolled back: <error>` and swallows the error (return True); otherwise it prints `committed`.

  ```text
  committed
  {'asha': 70, 'ben': 80}
  rolled back: not enough money
  {'asha': 70, 'ben': 80}
  ```
starter: |
  # write the Transaction class here

  accounts = {"asha": 100, "ben": 50}

  def transfer(accts, source, target, amount):
      accts[source] -= amount
      if accts[source] < 0:
          raise ValueError("not enough money")
      accts[target] += amount

  with Transaction(accounts) as accts:
      transfer(accts, "asha", "ben", 30)
  print(accounts)

  with Transaction(accounts) as accts:
      transfer(accts, "ben", "asha", 500)
  print(accounts)
hints:
  - "`__init__(self, accounts)` stores the dict; `__enter__` saves `self.saved = dict(self.accounts)` and returns `self.accounts`."
  - "`__exit__(self, exc_type, exc, tb)`: `if exc_type is None:` print committed and `return False`."
  - "Otherwise restore in place: `self.accounts.clear()`, `self.accounts.update(self.saved)`, print the message with `exc`, `return True`."
solution: |
  class Transaction:
      def __init__(self, accounts):
          self.accounts = accounts

      def __enter__(self):
          self.saved = dict(self.accounts)
          return self.accounts

      def __exit__(self, exc_type, exc, tb):
          if exc_type is None:
              print("committed")
              return False
          self.accounts.clear()
          self.accounts.update(self.saved)
          print(f"rolled back: {exc}")
          return True

  accounts = {"asha": 100, "ben": 50}

  def transfer(accts, source, target, amount):
      accts[source] -= amount
      if accts[source] < 0:
          raise ValueError("not enough money")
      accts[target] += amount

  with Transaction(accounts) as accts:
      transfer(accts, "asha", "ben", 30)
  print(accounts)

  with Transaction(accounts) as accts:
      transfer(accts, "ben", "asha", 500)
  print(accounts)
explanation: |
  The failed transfer had already taken 500 from Ben before the error; the context manager put everything back.
  This is exactly how database transactions behave: all changes or none. Restoring with clear/update changes the
  same dict object, so every reference to `accounts` sees the restored values.
check:
  expected: |
    committed
    {'asha': 70, 'ben': 80}
    rolled back: not enough money
    {'asha': 70, 'ben': 80}
  require_text: ["__enter__", "__exit__"]
```

```quiz
- id: q1
  question: When does the `else` block of a try statement run?
  options:
    - Only when no exception was raised in the try block
    - Always
    - Only when an exception was raised
    - Before the try block
  answer: Only when no exception was raised in the try block
  explanation: finally is the one that always runs.
- id: q2
  question: What does `raise ConfigError("bad port") from err` add?
  options:
    - It records err as the cause, so both errors appear in the traceback
    - It hides err completely
    - It retries the code
    - It converts err into a warning
  answer: It records err as the cause, so both errors appear in the traceback
  explanation: The original is available as __cause__.
- id: q3
  question: Which is the best base class for a custom "invalid setting value" error?
  options:
    - ValueError (or your own app's base error)
    - BaseException
    - KeyboardInterrupt
    - SystemExit
  answer: ValueError (or your own app's base error)
  explanation: Subclass Exception or a fitting subclass; BaseException also covers Ctrl+C and exit.
- id: q4
  question: In a @contextmanager function, where should clean-up code go so it runs even after an error?
  options:
    - In a finally block around the yield
    - Before the yield
    - After the yield, with no try
    - In a separate function
  answer: In a finally block around the yield
  explanation: Without try/finally, an error inside the with block skips the code after yield.
- id: q5
  question: What happens if __exit__ returns True?
  options:
    - The exception from the with block is swallowed
    - The with block runs again
    - The program exits
    - Nothing - the return value is ignored
  answer: The exception from the with block is swallowed
  explanation: Only do this deliberately, like the rollback example.
- id: q6
  question: 'Why is `except Exception: pass` usually a bad idea?'
  options:
    - It silently hides every bug, so problems go unnoticed
    - It is a syntax error
    - It makes code slower
    - It only catches KeyError
  answer: It silently hides every bug, so problems go unnoticed
  explanation: Catch specific exceptions and do something useful with them.
```
