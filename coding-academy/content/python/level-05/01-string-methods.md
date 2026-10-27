---
id: py-5-1-string-methods
title: String methods - changing, searching and replacing text
track: python
level: 5
order: 1
minutes: 40
summary: Strings have built-in tools - change case, trim spaces, search, count, replace, test what kind of characters they contain - plus indexing and slicing text.
objectives:
  - Index and slice strings like lists
  - Explain why strings cannot be changed in place, and how methods return new strings
  - Use upper, lower, title, strip, replace, count, find, startswith, endswith
  - Test text with isdigit, isalpha and isspace-style methods
  - Chain several string methods together
prerequisites: [py-4-2-working-with-lists]
tags: [string, method, upper, lower, strip, replace, find, count, startswith, isdigit, slicing, immutable]
---

## Simple explanation

Text (a **string**) comes with many built-in tools called **methods**. You call a method with a dot:

```python
name = "  asha SHARMA  "
print(name.strip())            # "asha SHARMA"   - remove spaces at both ends
print(name.strip().title())    # "Asha Sharma"   - capitalise each word
print("hello".upper())         # "HELLO"
print("banana".count("a"))     # 3
print("I like tea".replace("tea", "coffee"))   # "I like coffee"
```

Strings work like lists of characters for reading: `"Python"[0]` is `"P"` and `"Python"[1:4]` is `"yth"`.

**Important:** strings **cannot be changed in place** (they are *immutable*). Methods never modify the original;
they **return a new string**. To keep the result, assign it: `name = name.strip()`.

## Real-world analogy

String methods are like the tools in a **word processor**: "Change case", "Find", "Find and replace", "Remove
extra spaces". The difference: Python never edits your original document - it hands you an edited copy, and you
decide whether to keep it.

## Technical definition

| Method | Result |
|---|---|
| `s.upper()`, `s.lower()`, `s.title()`, `s.capitalize()` | changed case |
| `s.strip()`, `s.lstrip()`, `s.rstrip()` | without whitespace at both/left/right ends (or given characters: `s.strip(".!")`) |
| `s.replace(old, new)` | every `old` replaced with `new` |
| `s.count(sub)` | number of non-overlapping occurrences |
| `s.find(sub)` | index of first occurrence, or `-1` if absent (`s.index(sub)` raises ValueError instead) |
| `s.startswith(prefix)`, `s.endswith(suffix)` | True/False (accept a tuple of options) |
| `s.isdigit()`, `s.isalpha()`, `s.isalnum()`, `s.isupper()`, `s.islower()`, `s.isspace()` | character tests |
| `len(s)` | number of characters |

- Indexing `s[i]` and slicing `s[a:b:c]` work as for lists; `s[::-1]` reverses.
- Item assignment `s[0] = "X"` raises `TypeError` (immutable).
- Methods can be **chained**: each one returns a string, so the next method applies to that:
  `s.strip().lower().replace(" ", "-")`.
- `in` tests substrings: `"@" in email`.

## Step-by-step examples

**Example 1 - cleaning user input** (Input: `   YES  `)

```python
answer = input("Continue? ")
answer = answer.strip().lower()
if answer == "yes":
    print("Continuing")
```

Output: `Continue?    YES  ` then `Continuing`. Stripping and lower-casing makes "Yes", " yes" and "YES" all
match.

**Example 2 - searching**

```python
email = "maya.k@example.com"
at = email.find("@")
print(at)                  # 6
print(email[:at])          # maya.k
print(email[at + 1:])      # example.com
print(email.endswith(".com"))   # True
```

**Example 3 - replacing and counting**

```python
text = "the cat sat on the mat"
print(text.count("at"))                 # 3
print(text.replace("the", "a"))         # a cat sat on a mat
print(text)                             # unchanged!
```

**Example 4 - testing characters** (Input: `12a`)

```python
code = input("PIN: ")
if len(code) == 4 and code.isdigit():
    print("Valid PIN")
else:
    print("A PIN is exactly 4 digits")
```

**Example 5 - building a "slug" for a web address**

```python
title = "  My First Python Project!  "
slug = title.strip().lower().replace(" ", "-").strip("!")
print(slug)                # my-first-python-project
```

## Common mistakes

- **Forgetting to keep the result**: `name.upper()` on its own line does nothing useful; write
  `name = name.upper()`.
- **Trying to change a character**: `word[0] = "J"` → TypeError. Build a new string: `"J" + word[1:]`.
- **`find` returning -1**: `s[s.find("x"):]` with no `x` silently slices from -1 (the last character). Check for
  -1 first.
- **Case-sensitive comparisons**: compare `.lower()` versions when case should not matter.
- **`isdigit()` and negatives/decimals**: `"-5".isdigit()` and `"2.5".isdigit()` are False.

## Practical application

Cleaning data (extra spaces, inconsistent capitals), validating input (is it a number? does it look like an
email?), formatting names and codes, searching logs for errors, creating file names - text handling is a large
part of real-world programming and of the data-quality projects.

## Revision notes

- Strings are immutable: methods return **new** strings - assign the result.
- Case: `upper lower title capitalize`; spaces: `strip lstrip rstrip`.
- Search: `in`, `find` (-1 if absent), `count`, `startswith`, `endswith`.
- Change: `replace(old, new)`.
- Tests: `isdigit isalpha isalnum isspace isupper islower`.
- Index/slice like lists; `s[::-1]` reverses. Chain: `s.strip().lower()`.

```exercise
id: tidy-name
title: Tidy up a name
difficulty: beginner
instructions: |
  Ask `Name: ` and print the name with surrounding spaces removed and each word capitalised.

  ```text
  Name:    ada LOVELACE
  Hello, Ada Lovelace!
  ```
starter: |
  name = input("Name: ")
hints:
  - "`name.strip()` removes the spaces; `.title()` capitalises each word."
  - "Chain them: `name.strip().title()` - and store the result!"
solution: |
  name = input("Name: ")
  clean = name.strip().title()
  print("Hello, " + clean + "!")
explanation: |
  Each method returns a new string, so they can be chained. The original `name` is not changed.
stdin: "   ada LOVELACE"
check:
  cases:
    - {stdin: "   ada LOVELACE", expected: "Name:    ada LOVELACE\nHello, Ada Lovelace!\n"}
    - {stdin: "grace hopper  ", expected: "Name: grace hopper  \nHello, Grace Hopper!\n"}
  requires: ["method:strip", "method:title"]
```

```exercise
id: yes-no
title: A forgiving yes/no question
difficulty: beginner
instructions: |
  Ask `Do you want a receipt? ` and print `Printing receipt` if the answer is yes in any capitalisation and with
  any spaces around it (e.g. `YES`, ` Yes `, `y` also counts as yes). Otherwise print `No receipt`.
starter: |
  answer = input("Do you want a receipt? ")
hints:
  - "Clean the answer first: `answer = answer.strip().lower()`"
  - "`if answer == \"yes\" or answer == \"y\":` - or `if answer in (\"yes\", \"y\"):`"
solution: |
  answer = input("Do you want a receipt? ")
  answer = answer.strip().lower()
  if answer in ("yes", "y"):
      print("Printing receipt")
  else:
      print("No receipt")
explanation: |
  Normalising (cleaning) input before comparing makes programs friendlier: the user does not need to type it in
  exactly one way.
stdin: " YES "
check:
  cases:
    - {stdin: " YES ", expected: "Do you want a receipt?  YES \nPrinting receipt\n"}
    - {stdin: "y", expected: "Do you want a receipt? y\nPrinting receipt\n"}
    - {stdin: "Yes", expected: "Do you want a receipt? Yes\nPrinting receipt\n"}
    - {stdin: "no", expected: "Do you want a receipt? no\nNo receipt\n"}
    - {stdin: "yesterday", expected: "Do you want a receipt? yesterday\nNo receipt\n"}
```

```exercise
id: email-parts
title: Split an email address
difficulty: intermediate
instructions: |
  Ask `Email: `. If it contains exactly one `@`, print the user name (before `@`) and the domain (after `@`).
  Otherwise print `Invalid email`. Use `count`, `find` and slicing.

  ```text
  Email: sam.lee@mail.example
  User: sam.lee
  Domain: mail.example
  ```
starter: |
  email = input("Email: ")
hints:
  - "`email.count(\"@\") == 1` checks there is exactly one @."
  - "`at = email.find(\"@\")`, then `email[:at]` and `email[at + 1:]`."
solution: |
  email = input("Email: ")
  if email.count("@") == 1:
      at = email.find("@")
      print("User:", email[:at])
      print("Domain:", email[at + 1:])
  else:
      print("Invalid email")
explanation: |
  `find` gives the position of the @; slicing up to it gives the part before, and from one past it gives the
  part after.
stdin: "sam.lee@mail.example"
check:
  cases:
    - {stdin: "sam.lee@mail.example", expected: "Email: sam.lee@mail.example\nUser: sam.lee\nDomain: mail.example\n"}
    - {stdin: "a@b.co", expected: "Email: a@b.co\nUser: a\nDomain: b.co\n"}
    - {stdin: "no-at-sign.com", expected: "Email: no-at-sign.com\nInvalid email\n"}
    - {stdin: "two@@ats.com", expected: "Email: two@@ats.com\nInvalid email\n"}
  requires: ["method:find", slice]
```

```exercise
id: password-strength
title: Password strength checker
difficulty: challenge
instructions: |
  Ask `Password: ` and check four rules. Print each problem found (in this order), or `Strong password` if there
  are none:

  - `Too short` - fewer than 8 characters
  - `Add a digit` - no digit
  - `Add a capital letter` - no upper-case letter
  - `Add a lower-case letter` - no lower-case letter

  ```text
  Password: hello
  Too short
  Add a digit
  Add a capital letter
  ```
starter: |
  password = input("Password: ")
hints:
  - "Loop over the characters and set flags: `if ch.isdigit(): has_digit = True` (start each flag as False)."
  - "Use `ch.isupper()` and `ch.islower()` for the letter rules."
  - "Remember whether any problem was printed so you know whether to print `Strong password`."
solution: |
  password = input("Password: ")
  has_digit = False
  has_upper = False
  has_lower = False
  for ch in password:
      if ch.isdigit():
          has_digit = True
      if ch.isupper():
          has_upper = True
      if ch.islower():
          has_lower = True
  problems = []
  if len(password) < 8:
      problems.append("Too short")
  if not has_digit:
      problems.append("Add a digit")
  if not has_upper:
      problems.append("Add a capital letter")
  if not has_lower:
      problems.append("Add a lower-case letter")
  if problems:
      for problem in problems:
          print(problem)
  else:
      print("Strong password")
explanation: |
  Each flag records whether at least one character of that kind was seen. Collecting the problems in a list makes
  it easy to print them all - or the success message when the list is empty.
stdin: "hello"
check:
  cases:
    - {stdin: "hello", expected: "Password: hello\nToo short\nAdd a digit\nAdd a capital letter\n"}
    - {stdin: "Sunshine2026", expected: "Password: Sunshine2026\nStrong password\n"}
    - {stdin: "ALLCAPS123", expected: "Password: ALLCAPS123\nAdd a lower-case letter\n"}
    - {stdin: "abc", expected: "Password: abc\nToo short\nAdd a digit\nAdd a capital letter\n"}
```

```quiz
- id: q1
  question: 'What does `"  Hi  ".strip()` return?'
  options:
    - '"Hi"'
    - '"  Hi"'
    - '"Hi  "'
    - '"  Hi  "'
  answer: '"Hi"'
  explanation: strip removes whitespace from both ends.
- id: q2
  question: After `s = "cat"` and `s.upper()` (on its own line), what is `s`?
  type: text
  answer: ["cat", "'cat'", '"cat"']
  explanation: Strings are immutable; upper() returned a new string that was not stored.
- id: q3
  question: 'What does `"hello".find("z")` return?'
  type: text
  answer: ["-1"]
  explanation: find returns -1 when the text is not found (index would raise ValueError).
- id: q4
  question: 'What does `"Python"[1:4]` give?'
  type: text
  answer: ["yth", "'yth'", '"yth"']
  explanation: Indexes 1, 2 and 3 - y, t, h.
- id: q5
  question: Which method checks that a string contains only digits?
  options:
    - isdigit()
    - isnumber()
    - digits()
    - isint()
  answer: isdigit()
  explanation: '"2026".isdigit() is True; "-5" and "2.5" are False.'
- id: q6
  question: 'What does `"a-b-c".replace("-", "")` return?'
  type: text
  answer: ["abc", "'abc'", '"abc"']
  explanation: Every "-" is replaced with an empty string.
```
