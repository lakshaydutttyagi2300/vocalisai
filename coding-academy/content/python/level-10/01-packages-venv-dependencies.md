---
id: py-10-1-packages-venv-dependencies
title: Packages, virtual environments and dependencies
track: python
level: 10
order: 1
minutes: 45
summary: Understand pip, PyPI, virtual environments and requirements files, organise your own code into modules and packages, and read version numbers.
objectives:
  - Explain what a package, PyPI, pip and a virtual environment are
  - Create and use a virtual environment from the terminal
  - Record dependencies in requirements.txt and reinstall them
  - Split your own code into a module and import it
  - Read and compare version numbers
prerequisites: [py-8-1-modules-and-stdlib]
tags: [pip, pypi, venv, virtual environment, requirements.txt, package, module, dependency, version, semver, __init__.py]
---

## Simple explanation

Python comes with a large **standard library** (`math`, `csv`, `json`...). Everything else - for example
`requests` for web requests or `pandas` for data analysis - is a **third-party package** that you download from
**PyPI** (the Python Package Index, pypi.org) with **pip**:

```text
py -m pip install requests          (Windows)
python3 -m pip install requests     (Mac/Linux)
```

If every project installed packages into the same place, they would fight over versions. A **virtual
environment** ("venv") is a private folder of packages for **one project**:

```text
py -m venv .venv                    create it (once per project)
.venv\Scripts\activate              Windows: switch it on
source .venv/bin/activate           Mac/Linux: switch it on
pip install requests                now installs only into this project
pip freeze > requirements.txt       record exact versions
pip install -r requirements.txt     reinstall them later or on another computer
deactivate                          switch it off
```

This very app uses a virtual environment: the installer created `.venv` inside the app folder and installed
the packages listed in `requirements.txt`.

> The practice lab cannot run pip or a terminal (that's a safety rule), so the exercises below practise the
> ideas with plain Python. Try the commands above in a real terminal when you are ready.

## Real-world analogy

PyPI is a **giant public library** of toolkits. pip is the **librarian** who fetches them. A virtual
environment is a **separate toolbox for each job**: your woodworking toolbox and your plumbing toolbox don't
get mixed up, and `requirements.txt` is the **packing list** that lets you rebuild the toolbox anywhere.

## Technical definition

- **Module**: one `.py` file you can `import`. **Package**: a folder of modules (traditionally with an
  `__init__.py` file). **Distribution/library**: what pip installs (may contain several packages).
- **Import search path** (`sys.path`): Python looks in the script's folder, then the standard library, then the
  active environment's `site-packages`.
- **venv**: `python -m venv <folder>` creates an isolated interpreter + `site-packages`. Activating it puts its
  `python` and `pip` first on your PATH. Never commit the `.venv` folder to version control - commit
  `requirements.txt` instead.
- **Version specifiers** in requirements files: `==1.2.3` (exact), `>=1.2` (at least), `~=1.2` (compatible:
  `>=1.2, <2.0`). Most packages use **semantic versioning**: `MAJOR.MINOR.PATCH` - major changes may break your
  code, minor adds features, patch fixes bugs.
- **Pinning** exact versions makes installs repeatable; a separate "constraints" file can pin the packages your
  packages depend on.
- `if __name__ == "__main__":` lets a module run code only when executed directly, not when imported.

## Step-by-step examples

**Example 1 - your own module**

Folder layout:

```text
my_project/
    helpers.py
    main.py
```

`helpers.py`:

```python
def shout(text):
    return text.upper() + "!"
```

`main.py`:

```python
from helpers import shout
print(shout("hello"))       # HELLO!
```

**Example 2 - the `__main__` guard**

```python
# helpers.py
def shout(text):
    return text.upper() + "!"

if __name__ == "__main__":       # only when you run "python helpers.py"
    print(shout("testing"))
```

Importing `helpers` from another file will **not** print "TESTING!".

**Example 3 - comparing versions correctly**

```python
print("1.10.0" > "1.9.0")            # False - text comparison, wrong!
as_tuple = lambda v: tuple(int(p) for p in v.split("."))
print(as_tuple("1.10.0") > as_tuple("1.9.0"))   # True - number comparison
```

## Common mistakes

- **Installing into the wrong Python**: `pip install x` worked but `import x` fails. Use `py -m pip` /
  `python3 -m pip` (or activate the venv first) so pip belongs to the Python you run.
- **Naming your file like a package** (`random.py`, `csv.py`, `requests.py`) - your file is imported instead of
  the real one. Rename it.
- **Committing `.venv`** - it is large and computer-specific. Commit `requirements.txt`.
- **Comparing versions as text** - "1.10" < "1.9" alphabetically.
- **Installing packages you don't need** - each one is code you have to trust and keep updated.

## Practical application

Every real project starts with: create a folder, `py -m venv .venv`, activate, `pip install` what you need,
`pip freeze > requirements.txt`. When you share the project or move to a new computer, `pip install -r
requirements.txt` rebuilds the same environment. Splitting code into modules keeps files short and lets you
reuse functions across scripts.

## Revision notes

- PyPI = package library; pip = installer; venv = per-project package folder.
- `py -m venv .venv` → activate → `pip install` → `pip freeze > requirements.txt`.
- `pip install -r requirements.txt` recreates the environment.
- Module = `.py` file; package = folder of modules. Avoid names that clash with real packages.
- `if __name__ == "__main__":` for code that should only run directly.
- Compare versions as tuples of numbers, not as text.

```exercise
id: parse-requirements
title: Read a requirements file
difficulty: beginner
instructions: |
  `requirements` holds the text of a requirements file. Build a dictionary that maps each package name to its
  pinned version, skipping blank lines and comments (lines starting with `#`). Lines look like
  `name==version`. Print the dictionary.

  ```text
  {'streamlit': '1.66.1', 'PyYAML': '6.0.3', 'anthropic': '2.3.0'}
  ```
starter: |
  requirements = """
  # web interface
  streamlit==1.66.1
  PyYAML==6.0.3

  # optional AI tutor
  anthropic==2.3.0
  """

  pins = {}
  # your code here
  print(pins)
hints:
  - "Loop over `requirements.splitlines()` and `.strip()` each line."
  - "Skip a line if it is empty or `line.startswith(\"#\")` - use `continue`."
  - "`name, version = line.split(\"==\")` then `pins[name] = version`."
solution: |
  requirements = """
  # web interface
  streamlit==1.66.1
  PyYAML==6.0.3

  # optional AI tutor
  anthropic==2.3.0
  """

  pins = {}
  for line in requirements.splitlines():
      line = line.strip()
      if not line or line.startswith("#"):
          continue
      name, version = line.split("==")
      pins[name] = version
  print(pins)
explanation: |
  Real tools parse requirements files in much the same way: ignore blanks and comments, then split each line into
  a name and a version.
check:
  expected: |
    {'streamlit': '1.66.1', 'PyYAML': '6.0.3', 'anthropic': '2.3.0'}
  requires: [for]
```

```exercise
id: compare-versions
title: Compare version numbers
difficulty: beginner
instructions: |
  Write `version_tuple(text)` that turns `"1.10.2"` into `(1, 10, 2)`, and `is_newer(a, b)` that returns True
  when version `a` is newer than version `b`.

  ```text
  (1, 10, 2)
  True
  False
  True
  ```
starter: |
  def version_tuple(text):
      pass

  def is_newer(a, b):
      pass

  print(version_tuple("1.10.2"))
  print(is_newer("1.10.0", "1.9.9"))
  print(is_newer("2.0.0", "2.0.0"))
  print(is_newer("3.0", "2.99.99"))
hints:
  - "`tuple(int(part) for part in text.split(\".\"))`"
  - "Tuples compare item by item, so `version_tuple(a) > version_tuple(b)` does the rest."
solution: |
  def version_tuple(text):
      return tuple(int(part) for part in text.split("."))

  def is_newer(a, b):
      return version_tuple(a) > version_tuple(b)

  print(version_tuple("1.10.2"))
  print(is_newer("1.10.0", "1.9.9"))
  print(is_newer("2.0.0", "2.0.0"))
  print(is_newer("3.0", "2.99.99"))
explanation: |
  Converting each part to an int makes 10 bigger than 9. Tuples compare left to right, exactly like version
  numbers: major first, then minor, then patch.
check:
  expected: |
    (1, 10, 2)
    True
    False
    True
  tests:
    - name: patch versions count
      code: |
        assert is_newer("1.2.10", "1.2.9")
        assert not is_newer("0.9", "0.10")
```

```exercise
id: check-environment
title: Check an environment against its pins
difficulty: intermediate
instructions: |
  `pins` says which versions a project needs; `installed` says what is actually installed in an environment.
  Write `report(pins, installed)` that returns one line per pinned package, in the order of `pins`:

  - `name: ok` when the installed version matches
  - `name: missing` when it is not installed
  - `name: installed X, needs Y` when the version differs

  Then print the report, and finally `Ready: True` or `Ready: False` (ready only when every line ends in "ok").

  ```text
  streamlit: ok
  PyYAML: installed 6.0.1, needs 6.0.3
  anthropic: missing
  Ready: False
  ```
starter: |
  pins = {"streamlit": "1.66.1", "PyYAML": "6.0.3", "anthropic": "2.3.0"}
  installed = {"streamlit": "1.66.1", "PyYAML": "6.0.1", "pytest": "9.1.1"}

  def report(pins, installed):
      lines = []
      # your code here
      return lines

  lines = report(pins, installed)
  for line in lines:
      print(line)
  print("Ready:", all(line.endswith(": ok") for line in lines))
hints:
  - "Loop with `for name, needed in pins.items():`."
  - "`installed.get(name)` returns None when the package is missing."
  - "Three cases: `have is None`, `have == needed`, otherwise a version mismatch."
solution: |
  pins = {"streamlit": "1.66.1", "PyYAML": "6.0.3", "anthropic": "2.3.0"}
  installed = {"streamlit": "1.66.1", "PyYAML": "6.0.1", "pytest": "9.1.1"}

  def report(pins, installed):
      lines = []
      for name, needed in pins.items():
          have = installed.get(name)
          if have is None:
              lines.append(f"{name}: missing")
          elif have == needed:
              lines.append(f"{name}: ok")
          else:
              lines.append(f"{name}: installed {have}, needs {needed}")
      return lines

  lines = report(pins, installed)
  for line in lines:
      print(line)
  print("Ready:", all(line.endswith(": ok") for line in lines))
explanation: |
  This is what "it works on my computer but not on yours" usually comes down to: a missing package or a different
  version. `pip install -r requirements.txt` fixes exactly these differences. Extra packages (pytest here) don't
  matter, so they are not reported.
check:
  expected: |
    streamlit: ok
    PyYAML: installed 6.0.1, needs 6.0.3
    anthropic: missing
    Ready: False
  tests:
    - name: a matching environment is ready
      code: |
        assert report({"a": "1.0"}, {"a": "1.0", "b": "2"}) == ["a: ok"]

```exercise
id: satisfies-spec
title: Does a version satisfy a requirement?
difficulty: challenge
instructions: |
  Write `satisfies(version, spec)` where `spec` is one of `==X`, `>=X`, `<X` or several of these separated by
  commas (all must hold). Use your own version comparison (tuples of ints). Then print which of the available
  versions satisfy `>=1.4,<2.0`.

  ```text
  True
  False
  True
  ['1.4.0', '1.10.1', '1.9.3']
  ```
starter: |
  def satisfies(version, spec):
      pass

  print(satisfies("1.4.2", ">=1.4"))
  print(satisfies("2.0.0", ">=1.4,<2.0"))
  print(satisfies("3.1", "==3.1"))
  available = ["1.3.9", "1.4.0", "1.10.1", "2.0.0", "1.9.3"]
  print([v for v in available if satisfies(v, ">=1.4,<2.0")])
hints:
  - "Write a helper `vt(text)` that returns a tuple of ints."
  - "Split the spec on commas; for each part, check which operator it starts with (`==`, `>=` or `<`) and compare with the rest of the text."
  - "If any part fails, `return False`; after the loop, `return True`."
solution: |
  def vt(text):
      return tuple(int(part) for part in text.split("."))

  def satisfies(version, spec):
      v = vt(version)
      for part in spec.split(","):
          part = part.strip()
          if part.startswith("=="):
              ok = v == vt(part[2:])
          elif part.startswith(">="):
              ok = v >= vt(part[2:])
          elif part.startswith("<"):
              ok = v < vt(part[1:])
          else:
              raise ValueError(f"Unknown specifier: {part}")
          if not ok:
              return False
      return True

  print(satisfies("1.4.2", ">=1.4"))
  print(satisfies("2.0.0", ">=1.4,<2.0"))
  print(satisfies("3.1", "==3.1"))
  available = ["1.3.9", "1.4.0", "1.10.1", "2.0.0", "1.9.3"]
  print([v for v in available if satisfies(v, ">=1.4,<2.0")])
explanation: |
  This is a tiny version of what pip does when it chooses which version to install. If you ever add `>` and
  `<=`, test the two-character operators (`>=`, `<=`) before the one-character ones, otherwise `">=1.4"` would be
  read as `>` followed by `"=1.4"`. One limitation: `(1, 4) < (1, 4, 0)` because a shorter tuple that matches the
  start counts as smaller - real tools pad versions to the same length before comparing.
check:
  expected: |
    True
    False
    True
    ['1.4.0', '1.10.1', '1.9.3']
  tests:
    - name: exact match fails for a different version
      code: |
        assert satisfies("3.1.1", "==3.1") is False
        assert satisfies("0.9", "<1.0") is True
```

```quiz
- id: q1
  question: What is a virtual environment?
  options:
    - A private folder of installed packages for one project
    - A program that runs Python in the cloud
    - A copy of your computer
    - The Python standard library
  answer: A private folder of installed packages for one project
  explanation: Each project gets its own packages and versions, so projects don't clash.
- id: q2
  question: Which command records the exact versions installed in the current environment?
  options:
    - pip freeze > requirements.txt
    - pip install -r requirements.txt
    - py -m venv .venv
    - pip list --upgrade
  answer: pip freeze > requirements.txt
  explanation: '`pip install -r requirements.txt` does the reverse: it installs from the file.'
- id: q3
  question: Why is `"1.10.0" > "1.9.0"` False in Python?
  options:
    - Strings compare character by character, and "1" < "9"
    - Python can't compare strings
    - Version 1.10 is older
    - The dots are ignored
  answer: Strings compare character by character, and "1" < "9"
  explanation: Convert versions to tuples of ints before comparing.
- id: q4
  question: You named your file `random.py` and now `random.randint` fails. Why?
  options:
    - Your file is imported instead of the standard random module
    - random was removed from Python
    - You need to pip install random
    - Files can't be named random
  answer: Your file is imported instead of the standard random module
  explanation: The script's folder is searched first. Rename your file.
- id: q5
  question: What should you commit to version control for a project's dependencies?
  options:
    - requirements.txt
    - The whole .venv folder
    - Nothing - dependencies can't be recorded
    - The site-packages folder of your computer
  answer: requirements.txt
  explanation: The .venv folder is large and specific to one computer; requirements.txt rebuilds it.
- id: q6
  question: When does code under `if __name__ == "__main__":` run?
  options:
    - Only when the file is run directly, not when it is imported
    - Every time the module is imported
    - Never
    - Only inside a virtual environment
  answer: Only when the file is run directly, not when it is imported
  explanation: When imported, __name__ is the module's name instead of "__main__".
```
