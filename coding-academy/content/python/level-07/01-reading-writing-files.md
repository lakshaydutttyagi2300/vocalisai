---
id: py-7-1-reading-writing-files
title: Reading and writing files
track: python
level: 7
order: 1
minutes: 45
summary: Save data so it survives after the program ends - open files safely with with, choose the right mode (read, write, append), read line by line, work with paths, and avoid accidentally destroying data.
objectives:
  - Open files with open() inside a with block and explain why with is safer
  - Choose between the modes "r", "w", "a" and "x"
  - Read a whole file, a list of lines, or line by line
  - Build file paths with pathlib and check whether a file exists
  - Avoid accidental data loss when writing files
prerequisites: [py-6-1-defining-functions, py-5-1-string-methods]
tags: [file, open, with, read, write, append, mode, path, pathlib, encoding, data loss]
---

## Simple explanation

Variables disappear when a program ends. **Files** keep data permanently.

```python
with open("diary.txt", "w", encoding="utf-8") as f:
    f.write("Today I learned about files.\n")

with open("diary.txt", encoding="utf-8") as f:
    text = f.read()
print(text)
```

- `open(name, mode)` opens a file. The **mode** says what you want to do:
  - `"r"` read (the default) - the file must exist;
  - `"w"` **write - creates the file, or EMPTIES it first if it exists**;
  - `"a"` append - adds to the end, keeping what is there;
  - `"x"` create - fails if the file already exists (a safe "new file only" mode).
- `with ... as f:` opens the file and **closes it automatically** at the end of the block - even if an error
  happens. Always use `with`.
- `encoding="utf-8"` makes accents and symbols (é, ₹, ✓) work the same on every computer.

In this app, files are created in your **practice folder** (Python Lab → *Practice folder* tab).

## Real-world analogy

Opening a file in mode `"w"` is like taking a **fresh sheet of paper and throwing the old one in the bin**.
Mode `"a"` is like **adding a new line at the bottom of a diary page**. `with` is like a **library that
automatically returns your book** when you leave the reading room - you cannot forget.

## Technical definition

- `open(file, mode="r", encoding=None)` returns a **file object**. Text mode (default) reads/writes `str`;
  binary mode (`"rb"`, `"wb"`) uses `bytes`.
- **Reading**: `f.read()` → the whole text; `f.readlines()` → list of lines (each ending with `"\n"`);
  `for line in f:` → one line at a time (memory-friendly for big files). Use `line.rstrip("\n")` or
  `line.strip()` to remove the line ending.
- **Writing**: `f.write(text)` writes exactly the text (add `"\n"` yourself); `print(..., file=f)` also works.
- `with` uses a **context manager** that calls `f.close()` automatically.
- **Paths**: `pathlib.Path` objects: `Path("data") / "notes.txt"` joins parts correctly on every operating system;
  `p.exists()`, `p.read_text(encoding=...)`, `p.write_text(text, encoding=...)`, `p.name`, `p.suffix`,
  `p.parent`, `Path.cwd()`.
- Relative paths are relative to the **current working directory** (the practice folder in this app).
- Errors: `FileNotFoundError` (reading a missing file), `PermissionError`, `IsADirectoryError`,
  `FileExistsError` (mode `"x"`).

## Step-by-step examples

**Example 1 - write, then read**

```python
with open("shopping.txt", "w", encoding="utf-8") as f:
    f.write("bread\n")
    f.write("milk\n")
    f.write("eggs\n")

with open("shopping.txt", encoding="utf-8") as f:
    for line in f:
        print("-", line.strip())
```

Output:

```text
- bread
- milk
- eggs
```

**Example 2 - append keeps old content**

```python
with open("log.txt", "a", encoding="utf-8") as f:
    f.write("program started\n")
```

Run it three times and `log.txt` has three lines. With `"w"` it would always have one.

**Example 3 - read all lines into a list**

```python
with open("shopping.txt", encoding="utf-8") as f:
    items = [line.strip() for line in f]
print(items, len(items))       # ['bread', 'milk', 'eggs'] 3
```

(`[... for line in f]` is a list comprehension - Level 8. A loop with append does the same.)

**Example 4 - pathlib**

```python
from pathlib import Path

folder = Path("reports")
folder.mkdir(exist_ok=True)              # create the folder if needed
report = folder / "summary.txt"
report.write_text("Total: 42\n", encoding="utf-8")
print(report.exists(), report.name, report.suffix)   # True summary.txt .txt
print(report.read_text(encoding="utf-8"))
```

**Example 5 - avoiding data loss: check before overwriting**

```python
from pathlib import Path

target = Path("important.txt")
if target.exists():
    print("important.txt already exists - not overwriting it")
else:
    target.write_text("first version\n", encoding="utf-8")
```

Professional programs go further: they write to a temporary file and only then replace the original, and they
keep backups - exactly what this app's Backup page does for your progress.

## Common mistakes

- **Using `"w"` when you meant `"a"`** - the old content is erased instantly, with no undo.
- **Forgetting `"\n"`** with `write` - everything ends up on one line.
- **Forgetting to strip line endings** - `"milk\n" == "milk"` is False.
- **Not using `with`** - files may not be saved/closed properly if the program crashes.
- **Reading a file that does not exist** → `FileNotFoundError`. Check `Path(...).exists()` or use try/except
  (lesson 3 of this level).
- **Hard-coding Windows paths** like `"C:\new\test.txt"` - `\n` and `\t` inside are escape codes! Use
  `pathlib` or raw strings `r"C:\new\test.txt"`.

## Practical application

Saving a to-do list or game scores between runs, writing reports, reading configuration, processing log files,
exporting data for Excel. The expense tracker and file organiser projects both depend on files - and on not
destroying the user's data.

## Revision notes

- `with open(name, mode, encoding="utf-8") as f:` - closes automatically.
- Modes: `"r"` read, `"w"` write (**erases**), `"a"` append, `"x"` create-only.
- Read: `f.read()`, `f.readlines()`, `for line in f:` (+ `line.strip()`).
- Write: `f.write("text\n")`.
- `pathlib.Path`: `/` to join, `.exists()`, `.read_text()`, `.write_text()`, `.mkdir(exist_ok=True)`.
- Protect data: think before `"w"`, check `exists()`, keep backups.

```exercise
id: write-read-lines
title: Write and read back
difficulty: beginner
instructions: |
  Write the three colours in `colours` to a file called `colours.txt`, **one per line**. Then open the file again,
  read it, and print each line with a number in front:

  ```text
  1. red
  2. green
  3. blue
  ```
starter: |
  colours = ["red", "green", "blue"]
hints:
  - "Writing: `with open(\"colours.txt\", \"w\", encoding=\"utf-8\") as f:` then `f.write(colour + \"\\n\")` in a loop."
  - "Reading: loop over the file, keep a counter, and `line.strip()` each line."
solution: |
  colours = ["red", "green", "blue"]
  with open("colours.txt", "w", encoding="utf-8") as f:
      for colour in colours:
          f.write(colour + "\n")

  number = 1
  with open("colours.txt", encoding="utf-8") as f:
      for line in f:
          print(f"{number}. {line.strip()}")
          number += 1
explanation: |
  Each `write` adds one line because we add `"\n"`. When reading, `strip()` removes the line ending so the output
  is tidy.
check:
  expected: |
    1. red
    2. green
    3. blue
  requires: [with]
  tests:
    - name: colours.txt has one colour per line
      code: |
        assert open("colours.txt", encoding="utf-8").read() == "red\ngreen\nblue\n"
```

```exercise
id: append-log
title: An activity log that grows
difficulty: beginner
instructions: |
  The starter makes sure `activity.log` starts empty. Write a function `log(message)` that **appends** the message
  plus a new line to `activity.log`. Call it three times (`"start"`, `"working"`, `"finish"`), then print the
  number of lines in the file.

  ```text
  3
  ```
starter: |
  open("activity.log", "w", encoding="utf-8").close()   # start with an empty file

  def log(message):
      pass

hints:
  - "Inside log: `with open(\"activity.log\", \"a\", encoding=\"utf-8\") as f: f.write(message + \"\\n\")`"
  - "Count lines: `len(open(\"activity.log\", encoding=\"utf-8\").readlines())` - or read inside a with block."
solution: |
  open("activity.log", "w", encoding="utf-8").close()   # start with an empty file

  def log(message):
      with open("activity.log", "a", encoding="utf-8") as f:
          f.write(message + "\n")

  log("start")
  log("working")
  log("finish")
  with open("activity.log", encoding="utf-8") as f:
      print(len(f.readlines()))
explanation: |
  Mode `"a"` adds to the end of the file every time, so each call keeps the previous lines. Mode `"w"` would leave
  only the last message.
check:
  expected: |
    3
  tests:
    - name: the log contains the three messages in order
      code: |
        assert open("activity.log", encoding="utf-8").read() == "start\nworking\nfinish\n"
  require_text: ['"a"']
```

```exercise
id: safe-save
title: Never overwrite by accident
difficulty: intermediate
instructions: |
  Write a function `save_new(filename, text)` that writes `text` to the file **only if it does not exist yet**,
  and returns `True` if it saved or `False` if the file already existed. Use `pathlib.Path`.

  The starter deletes `notes_v1.txt` first so the test is repeatable. Expected output:

  ```text
  True
  False
  first draft
  ```
starter: |
  from pathlib import Path
  Path("notes_v1.txt").unlink(missing_ok=True)

  def save_new(filename, text):
      pass

  print(save_new("notes_v1.txt", "first draft"))
  print(save_new("notes_v1.txt", "second draft - should NOT replace the first"))
  print(Path("notes_v1.txt").read_text(encoding="utf-8"))
hints:
  - "`path = Path(filename)` then `if path.exists(): return False`"
  - "`path.write_text(text, encoding=\"utf-8\")` then `return True`"
solution: |
  from pathlib import Path
  Path("notes_v1.txt").unlink(missing_ok=True)

  def save_new(filename, text):
      path = Path(filename)
      if path.exists():
          return False
      path.write_text(text, encoding="utf-8")
      return True

  print(save_new("notes_v1.txt", "first draft"))
  print(save_new("notes_v1.txt", "second draft - should NOT replace the first"))
  print(Path("notes_v1.txt").read_text(encoding="utf-8"))
explanation: |
  Checking `exists()` before writing protects the first version. (Opening with mode `"x"` achieves the same: it
  raises `FileExistsError` instead of overwriting.)
check:
  expected: |
    True
    False
    first draft
```

```exercise
id: word-stats
title: Statistics for a text file
difficulty: challenge
instructions: |
  The starter creates `poem.txt`. Read it and print the number of **lines**, **words** and **characters**
  (characters including spaces but not counting the line-ending characters), and the **longest word**
  (ignore punctuation `,.!?` at the ends of words; if two words are equally long, keep the first).

  ```text
  Lines: 4
  Words: 22
  Characters: 109
  Longest word: twinkle
  ```
starter: |
  poem = """Twinkle, twinkle, little star,
  How I wonder what you are!
  Up above the world so high,
  Like a diamond in the sky."""
  with open("poem.txt", "w", encoding="utf-8") as f:
      f.write(poem + "\n")

  # your code below - read poem.txt (do not use the poem variable)
hints:
  - "Read all lines: `lines = f.read().splitlines()` gives lines without line endings."
  - "Words: loop over lines and `line.split()`; characters: `sum(len(line) for line in lines)`."
  - "Clean each word with `word.strip(\",.!?\")` and compare lengths with `>` so the first longest word wins."
solution: |
  poem = """Twinkle, twinkle, little star,
  How I wonder what you are!
  Up above the world so high,
  Like a diamond in the sky."""
  with open("poem.txt", "w", encoding="utf-8") as f:
      f.write(poem + "\n")

  with open("poem.txt", encoding="utf-8") as f:
      lines = f.read().splitlines()
  words = []
  for line in lines:
      words.extend(line.split())
  characters = sum(len(line) for line in lines)
  longest = ""
  for word in words:
      clean = word.strip(",.!?")
      if len(clean) > len(longest):
          longest = clean
  print("Lines:", len(lines))
  print("Words:", len(words))
  print("Characters:", characters)
  print("Longest word:", longest.lower())
explanation: |
  `splitlines()` splits text into lines and drops the line endings. `extend` adds all words of a line to the list.
  Stripping punctuation before comparing lengths gives fair word lengths.
check:
  expected: |
    Lines: 4
    Words: 22
    Characters: 109
    Longest word: twinkle
  require_text: ["poem.txt"]
```

```quiz
- id: q1
  question: What happens to an existing file's content when you open it with mode "w"?
  options:
    - It is erased immediately
    - New text is added at the end
    - Nothing - "w" only reads
    - Python asks for confirmation
  answer: It is erased immediately
  explanation: '"w" truncates the file. Use "a" to append or "x" to refuse existing files.'
- id: q2
  question: Why use `with open(...) as f:`?
  options:
    - The file is closed automatically, even if an error happens
    - It reads faster
    - It is the only way to open files
    - It creates a backup
  answer: The file is closed automatically, even if an error happens
  explanation: with uses a context manager that always closes the file.
- id: q3
  question: Which mode adds text to the end of a file?
  type: text
  answer: ["a", '"a"', "'a'", "append"]
  explanation: '"a" = append.'
- id: q4
  question: What does `for line in f:` give you for each line?
  options:
    - The line's text including the "\n" at the end
    - The line number
    - The line without any spaces
    - A list of words
  answer: The line's text including the "\n" at the end
  explanation: Use line.strip() or line.rstrip("\n") to remove the line ending.
- id: q5
  question: Which error do you get when reading a file that does not exist?
  type: text
  answer: ["FileNotFoundError"]
  explanation: Check with Path(...).exists() first, or handle the error with try/except.
- id: q6
  question: 'What does `Path("data") / "notes.txt"` create?'
  options:
    - A path to notes.txt inside the data folder, correct for any operating system
    - A division error
    - A new file immediately
    - The text "data/notes.txt" only on Linux
  answer: A path to notes.txt inside the data folder, correct for any operating system
  explanation: pathlib uses / to join path parts and picks the right separator (\ on Windows).
```
