---
id: py-10-5-security-and-maintainable-code
title: Secure and maintainable code
track: python
level: 10
order: 5
minutes: 50
summary: Protect your programs from bad input and SQL injection, handle secrets and passwords properly, and write code that you (and others) can still understand a year later.
objectives:
  - Validate user input instead of trusting it
  - Use parameterised SQL queries to prevent SQL injection
  - Keep secrets out of code and store passwords as salted hashes
  - Apply naming, small functions, constants and docstrings to keep code maintainable
prerequisites: [py-10-4-testing-and-debugging]
tags: [security, validation, sql injection, parameterised query, placeholder, secrets, password, hash, hashlib, environment variable, maintainable, clean code, naming, docstring, constant, pep 8]
---

## Simple explanation

**Never trust input** - from users, files, web forms or APIs. It might be wrong by accident, or harmful on
purpose.

The classic danger is **SQL injection**: building a query by gluing text together.

```python
import sqlite3
conn = sqlite3.connect(":memory:")
conn.execute("CREATE TABLE users (name TEXT, is_admin INTEGER)")
conn.executemany("INSERT INTO users VALUES (?, ?)", [("asha", 0), ("root", 1)])

name = "x' OR '1'='1"                                   # typed by an attacker
unsafe = f"SELECT name FROM users WHERE name = '{name}'"
print(conn.execute(unsafe).fetchall())                  # [('asha',), ('root',)] - every user leaked!

safe = "SELECT name FROM users WHERE name = ?"           # placeholder
print(conn.execute(safe, (name,)).fetchall())           # [] - treated as plain text
```

With a **placeholder** (`?`), the database receives the value separately and never runs it as SQL.

**Maintainable code** is code that is easy to read and change: clear names, small functions, no magic numbers,
short comments that explain *why*, and tests.

## Real-world analogy

Building SQL from user text is like letting a stranger **write part of your instructions to the bank teller**
- they can add "...and also empty the vault". A placeholder is a **form with boxes**: whatever they write stays
inside the "name" box.

Maintainable code is a **well-labelled kitchen**: anyone (including future you) can find the spoons.

## Technical definition

- **Input validation**: check type, range, length and format; reject or clean bad values early, with a clear
  message. Prefer **allow-lists** ("only these characters") over block-lists.
- **Parameterised queries**: `conn.execute("... WHERE id = ?", (value,))` in sqlite3 (other drivers use `%s`
  or `:name`). Values can be parameterised; table/column names cannot - choose those from a fixed allow-list.
- **Secrets** (API keys, passwords): read from environment variables (`os.environ.get("API_KEY")`) or a config
  file excluded from version control; never print or log them.
- **Passwords**: never store them as plain text. Store a **salted, slow hash**:
  `hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)` with a random salt from
  `secrets.token_bytes(16)`; compare with `hmac.compare_digest`. Use the `secrets` module (not `random`) for
  anything security-related.
- **Dangerous functions**: `eval()`/`exec()` on user input can run any code; `pickle.load` on untrusted files
  can too. Use `int()`, `float()`, `json.loads()` to parse data instead.
- **Least privilege**: give scripts only the access they need (a read-only database account, a specific folder).
- **Maintainability**: PEP 8 style (snake_case names, 4-space indents), descriptive names, functions that do
  one thing, named constants (`VAT_RATE = 0.2`) instead of magic numbers, docstrings (`"""What this does."""`),
  no duplicated logic, type hints, tests, and a formatter/linter (e.g. `ruff`, `black`).

## Step-by-step examples

**Example 1 - validating input**

```python
def parse_age(text):
    """Turn text into an age from 0 to 130, or raise ValueError."""
    text = text.strip()
    if not text.isdigit():
        raise ValueError("Age must be a whole number")
    age = int(text)
    if age > 130:
        raise ValueError("Age looks too large")
    return age
```

**Example 2 - hashing a password**

```python
import hashlib, hmac, secrets

def hash_password(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, 200_000)
    return salt, digest

def check_password(password, salt, digest):
    return hmac.compare_digest(hash_password(password, salt)[1], digest)

salt, digest = hash_password("correct horse")
print(check_password("correct horse", salt, digest))   # True
print(check_password("wrong", salt, digest))           # False
```

**Example 3 - refactoring for readability**

```python
# Before
def f(l):
    t = 0
    for i in l:
        if i[1] > 0:
            t += i[1] * 1.2
    return t

# After
VAT_RATE = 0.2

def total_with_vat(order_lines):
    """Sum the prices of order lines that have a positive price, adding VAT."""
    return sum(price * (1 + VAT_RATE) for _name, price in order_lines if price > 0)
```

## Common mistakes

- **f-strings or `+` to build SQL with user data** - always use placeholders.
- **`eval(input())`** to read numbers - use `int()`/`float()`.
- **API keys pasted into code** and then shared or uploaded publicly.
- **Storing passwords as plain text or with a fast hash** (plain MD5/SHA-256) - use a salted slow hash.
- **`random` for tokens or passwords** - it is predictable; use `secrets`.
- **Single-letter names and 100-line functions** - fine today, a puzzle in six months.
- **Catching every exception silently** (`except: pass`) - hides real problems.

## Practical application

Any program that takes input from people or the internet must validate it; any program that talks to a
database must use parameters. When you build the projects in this app (an expense tracker, a database-backed
app), apply these rules from the start - retrofitting security is harder. Readable code pays off every time
you return to an old project.

## Revision notes

- Validate input early; prefer allow-lists; give clear error messages.
- SQL: placeholders (`?`) for values; allow-lists for table/column names.
- Secrets in environment variables or excluded config files; never in shared code or logs.
- Passwords: salted slow hash (`pbkdf2_hmac`) + `secrets` + `hmac.compare_digest`.
- Avoid `eval`/`exec`/`pickle` on untrusted data.
- Clear names, small functions, constants, docstrings, tests.

```exercise
id: parameterised-query
title: Fix a query that is open to SQL injection
difficulty: beginner
instructions: |
  `find_products` builds its SQL with an f-string, so the attacker's search returns every product. Rewrite it to
  use a `?` placeholder. Normal searches must still work, and the attack must return an empty list.

  ```text
  [('kettle', 25.0)]
  []
  ```
starter: |
  import sqlite3

  conn = sqlite3.connect(":memory:")
  conn.execute("CREATE TABLE products (name TEXT, price REAL)")
  conn.executemany("INSERT INTO products VALUES (?, ?)",
                   [("kettle", 25.0), ("toaster", 30.0), ("secret prototype", 999.0)])

  def find_products(name):
      sql = f"SELECT name, price FROM products WHERE name = '{name}'"
      return conn.execute(sql).fetchall()

  print(find_products("kettle"))
  print(find_products("x' OR '1'='1"))
hints:
  - "Write the query as `\"SELECT name, price FROM products WHERE name = ?\"` with no quotes around the `?`."
  - "Pass the value separately: `conn.execute(sql, (name,))` - note the comma that makes a one-item tuple."
solution: |
  import sqlite3

  conn = sqlite3.connect(":memory:")
  conn.execute("CREATE TABLE products (name TEXT, price REAL)")
  conn.executemany("INSERT INTO products VALUES (?, ?)",
                   [("kettle", 25.0), ("toaster", 30.0), ("secret prototype", 999.0)])

  def find_products(name):
      sql = "SELECT name, price FROM products WHERE name = ?"
      return conn.execute(sql, (name,)).fetchall()

  print(find_products("kettle"))
  print(find_products("x' OR '1'='1"))
explanation: |
  With the placeholder, the whole attack string is compared as an ordinary name - no product is called that, so
  nothing is returned. The database never interprets the value as SQL.
check:
  expected: |
    [('kettle', 25.0)]
    []
  forbid_text: ["f\"SELECT", "f'SELECT", "' +", "\" +"]
  tests:
    - name: names with apostrophes still work
      code: |
        conn.execute("INSERT INTO products VALUES (?, ?)", ("o'clock timer", 9.5))
        assert find_products("o'clock timer") == [("o'clock timer", 9.5)]
```

```exercise
id: validate-input
title: Validate user input
difficulty: beginner
instructions: |
  Write `parse_quantity(text)` that returns an int from 1 to 99, or raises `ValueError` with these exact
  messages:

  - not a whole number (after stripping spaces): `"Please enter a whole number"`
  - outside 1-99: `"Quantity must be between 1 and 99"`

  Do **not** use `eval`.

  ```text
  3
  12
  Please enter a whole number
  Please enter a whole number
  Quantity must be between 1 and 99
  Quantity must be between 1 and 99
  ```
starter: |
  def parse_quantity(text):
      return eval(text)

  for raw in ["3", " 12 ", "abc", "2.5", "0", "150"]:
      try:
          print(parse_quantity(raw))
      except ValueError as err:
          print(err)
hints:
  - "`text = text.strip()` then `if not text.isdigit(): raise ValueError(\"Please enter a whole number\")`."
  - "Convert with `int(text)` and check `1 <= quantity <= 99`."
solution: |
  def parse_quantity(text):
      text = text.strip()
      if not text.isdigit():
          raise ValueError("Please enter a whole number")
      quantity = int(text)
      if not 1 <= quantity <= 99:
          raise ValueError("Quantity must be between 1 and 99")
      return quantity

  for raw in ["3", " 12 ", "abc", "2.5", "0", "150"]:
      try:
          print(parse_quantity(raw))
      except ValueError as err:
          print(err)
explanation: |
  `isdigit()` is an allow-list: only digits pass, so "2.5", "-1" and "abc" are rejected with a friendly
  message. `eval` would have run whatever was typed as Python code.
check:
  expected: |
    3
    12
    Please enter a whole number
    Please enter a whole number
    Quantity must be between 1 and 99
    Quantity must be between 1 and 99
  forbid: [call:eval, call:exec]
```

```exercise
id: password-hashing
title: Store passwords safely
difficulty: intermediate
instructions: |
  Complete `hash_password(password, salt)` using `hashlib.pbkdf2_hmac("sha256", ...)` with 100_000 iterations,
  and `verify(password, salt, stored)` using `hmac.compare_digest`. The starter registers a user with a random
  salt and checks two login attempts. It also proves the stored value is not the password itself.

  ```text
  True
  False
  stored value hides the password: True
  ```
starter: |
  import hashlib
  import hmac
  import secrets

  def hash_password(password, salt):
      pass

  def verify(password, salt, stored):
      pass

  salt = secrets.token_bytes(16)
  stored = hash_password("blue-sky-42", salt)
  print(verify("blue-sky-42", salt, stored))
  print(verify("blue-sky-43", salt, stored))
  print("stored value hides the password:", b"blue-sky-42" not in stored)
hints:
  - "`hashlib.pbkdf2_hmac(\"sha256\", password.encode(\"utf-8\"), salt, 100_000)` returns bytes."
  - "verify: hash the attempt with the same salt, then `return hmac.compare_digest(attempt, stored)`."
solution: |
  import hashlib
  import hmac
  import secrets

  def hash_password(password, salt):
      return hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 100_000)

  def verify(password, salt, stored):
      attempt = hash_password(password, salt)
      return hmac.compare_digest(attempt, stored)

  salt = secrets.token_bytes(16)
  stored = hash_password("blue-sky-42", salt)
  print(verify("blue-sky-42", salt, stored))
  print(verify("blue-sky-43", salt, stored))
  print("stored value hides the password:", b"blue-sky-42" not in stored)
explanation: |
  You store the salt and the hash, never the password. At login you hash the attempt the same way and compare.
  The random salt means two users with the same password get different hashes; the many iterations make guessing
  slow; `compare_digest` avoids leaking information through timing.
check:
  expected: |
    True
    False
    stored value hides the password: True
  requires: [call:pbkdf2_hmac, call:compare_digest]
  tests:
    - name: different salts give different hashes
      code: |
        assert hash_password("same", b"a" * 16) != hash_password("same", b"b" * 16)
```

```exercise
id: refactor-readable
title: Refactor for readability
difficulty: challenge
instructions: |
  The function `p` works but is hard to read. Refactor it **without changing what it prints**:

  - rename it `shipping_cost(weight_kg, express)` with clear variable names
  - replace the magic numbers with named constants `BASE_FEE`, `PER_KG` and `EXPRESS_MULTIPLIER`
  - add a docstring
  - keep the logic: weights of 0 or less raise `ValueError("Weight must be positive")`

  ```text
  5.5
  8.25
  19.5
  Weight must be positive
  ```
starter: |
  def p(w, e):
      if w <= 0:
          raise ValueError("Weight must be positive")
      c = 3.5 + w * 1.0
      if e:
          c = c * 1.5
      return round(c, 2)

  print(p(2, False))
  print(p(2, True))
  print(p(9.5, True))
  try:
      p(0, False)
  except ValueError as err:
      print(err)
hints:
  - "Put `BASE_FEE = 3.5`, `PER_KG = 1.0` and `EXPRESS_MULTIPLIER = 1.5` at the top."
  - "A docstring is a string on the first line inside the function: `\"\"\"Return the shipping cost...\"\"\"`."
  - "Remember to update the calls at the bottom to use the new name."
solution: |
  BASE_FEE = 3.5
  PER_KG = 1.0
  EXPRESS_MULTIPLIER = 1.5

  def shipping_cost(weight_kg, express):
      """Return the shipping cost in pounds for a parcel; express delivery costs 50% more."""
      if weight_kg <= 0:
          raise ValueError("Weight must be positive")
      cost = BASE_FEE + weight_kg * PER_KG
      if express:
          cost *= EXPRESS_MULTIPLIER
      return round(cost, 2)

  print(shipping_cost(2, False))
  print(shipping_cost(2, True))
  print(shipping_cost(9.5, True))
  try:
      shipping_cost(0, False)
  except ValueError as err:
      print(err)
explanation: |
  Same behaviour, but now the code explains itself: the names say what each value means and the constants can be
  changed in one place when prices change. Refactoring = improving structure without changing behaviour - which
  is exactly what the identical output proves.
check:
  expected: |
    5.5
    8.25
    19.5
    Weight must be positive
  forbid_text: ["def p("]
  tests:
    - name: shipping_cost has a docstring and uses the constants
      code: |
        assert shipping_cost.__doc__ and shipping_cost.__doc__.strip(), "Add a docstring to shipping_cost"
        assert BASE_FEE == 3.5 and PER_KG == 1.0 and EXPRESS_MULTIPLIER == 1.5
        assert "3.5" not in SOURCE.split("def shipping_cost", 1)[1], "Use BASE_FEE instead of 3.5 inside the function"
```

```quiz
- id: q1
  question: How do you stop SQL injection when a query includes user input?
  options:
    - Use placeholders (?) and pass the values separately
    - Build the query with an f-string
    - Remove all spaces from the input
    - Make the input upper-case
  answer: Use placeholders (?) and pass the values separately
  explanation: The database then treats the value as data, never as SQL.
- id: q2
  question: Which module should generate a password-reset token?
  options:
    - secrets
    - random
    - math
    - time
  answer: secrets
  explanation: random is predictable; secrets is designed for security.
- id: q3
  question: How should passwords be stored?
  options:
    - As a salted, slow hash (e.g. pbkdf2_hmac)
    - As plain text in a database
    - Encrypted with the same key for everyone and printed in logs
    - Reversed, so they look scrambled
  answer: As a salted, slow hash (e.g. pbkdf2_hmac)
  explanation: Even if the database leaks, the passwords are hard to recover.
- id: q4
  question: 'Why is `eval(input("Number: "))` dangerous?'
  options:
    - It runs whatever the user types as Python code
    - It is slower than int()
    - It only works with whole numbers
    - It prints the number twice
  answer: It runs whatever the user types as Python code
  explanation: Use int() or float() to convert text to numbers.
- id: q5
  question: Where should an API key used by your script be kept?
  options:
    - In an environment variable or a config file that is not shared
    - Hard-coded in the script
    - In the script's docstring
    - In the output of print() so you can see it
  answer: In an environment variable or a config file that is not shared
  explanation: Keys in shared code or logs get leaked.
- id: q6
  question: What is a "magic number" in code?
  options:
    - An unexplained literal value, like 1.2, instead of a named constant
    - A random number
    - A number that changes by itself
    - A number larger than a million
  answer: An unexplained literal value, like 1.2, instead of a named constant
  explanation: VAT_RATE = 0.2 tells the reader what the value means.
```
