---
id: py-10-3-automation-and-logging
title: Automation, pathlib and logging
track: python
level: 10
order: 3
minutes: 45
summary: Automate boring file tasks with pathlib, make scripts safe with a dry-run mode, and record what happened with the logging module.
objectives:
  - Work with folders and file paths using pathlib
  - Find, rename and move files safely, with a dry-run option
  - Use logging levels instead of print for diagnostic messages
  - Write a small automation script that reports what it did
prerequisites: [py-7-1-reading-writing-files, py-7-3-exceptions]
tags: [automation, pathlib, path, glob, rename, move, shutil, logging, debug, info, warning, error, dry run, script]
---

## Simple explanation

**Automation** means letting Python do repetitive work: renaming 300 photos, sorting downloads into folders,
producing a report every Monday. Two tools make this pleasant:

- **`pathlib`** - file paths as objects:

  ```python
  from pathlib import Path

  folder = Path("reports")
  folder.mkdir(exist_ok=True)              # create it if needed
  (folder / "jan.txt").write_text("sales: 10")
  for file in folder.glob("*.txt"):       # every .txt file
      print(file.name, file.suffix, file.stem)   # jan.txt .txt jan
  ```

- **`logging`** - messages with a **level** that you can switch on and off, instead of scattering `print`s:

  ```python
  import logging, sys
  logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s")
  logging.info("Moved 3 files")
  logging.warning("Skipped notes.tmp")
  logging.debug("details...")      # hidden, because the level is INFO
  ```

**Golden rule of automation:** scripts that move, rename or delete files should first run in **dry-run
mode** - print what they *would* do - so you can check before anything changes.

## Real-world analogy

An automation script is a **robot assistant** sorting your post. The dry run is the assistant saying "here's
my plan - shall I go ahead?". The log is the assistant's **diary**: "09:01 moved bill.pdf to Bills; 09:02 could
not read scan.jpg".

## Technical definition

- `Path` objects: `/` joins paths; `.name`, `.stem`, `.suffix`, `.parent`; `.exists()`, `.is_file()`,
  `.is_dir()`; `.mkdir(parents=True, exist_ok=True)`; `.glob("*.csv")` / `.rglob("*.csv")` (recursive);
  `.read_text()` / `.write_text()`; `.rename(target)`; `.unlink()` deletes a file; `.stat().st_size` is the size
  in bytes. `Path.home()` is your user folder.
- `shutil.copy(src, dst)`, `shutil.move(src, dst)`, `shutil.rmtree(folder)` (deletes a whole folder - careful).
- **Logging levels** (lowest to highest): `DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`. Messages below the
  configured level are ignored. `basicConfig(filename="app.log")` writes to a file;
  `format="%(asctime)s %(levelname)s %(message)s"` adds timestamps.
- Named loggers: `log = logging.getLogger(__name__)` in each module - the standard pattern in larger programs.
- **Idempotent** scripts can run twice safely (e.g. `exist_ok=True`, skipping files already processed).
- Scheduling (outside Python): Windows **Task Scheduler** or Mac/Linux **cron** can run your script daily.

> In the practice lab, scripts can only create and change files inside your practice folder - perfect for
> experimenting safely.

## Step-by-step examples

**Example 1 - sort files into folders by extension**

```python
from pathlib import Path

inbox = Path("inbox")
inbox.mkdir(exist_ok=True)
for name in ["a.pdf", "b.jpg", "c.pdf"]:
    (inbox / name).write_text("demo")

for file in sorted(inbox.iterdir()):
    if file.is_file():
        target = inbox / file.suffix.lstrip(".")       # "pdf", "jpg"
        target.mkdir(exist_ok=True)
        file.rename(target / file.name)
        print(f"{file.name} -> {target.name}/")
```

**Example 2 - a dry-run switch**

```python
DRY_RUN = True

def rename(file, new_name):
    if DRY_RUN:
        print(f"[dry run] would rename {file} -> {new_name}")
    else:
        file.rename(file.with_name(new_name))
```

**Example 3 - logging with a timestamp to a file**

```python
import logging
logging.basicConfig(filename="organiser.log", level=logging.INFO,
                    format="%(asctime)s %(levelname)s %(message)s")
logging.info("Started")
```

`organiser.log` then contains lines like `2026-10-27 09:15:02,113 INFO Started`.

## Common mistakes

- **No dry run** - a bug in a rename loop can scramble hundreds of files. Preview first; test on a copy.
- **Hard-coded Windows paths with backslashes** (`"C:\new\folder"` - `\n` becomes a newline!). Use `Path` and
  `/`, or raw strings `r"C:\new\folder"`.
- **Changing a folder while looping over it** - collect the list first (`sorted(folder.iterdir())`).
- **Overwriting files silently** - check `target.exists()` first.
- **Using print for everything** - logs with levels are easier to filter and can go to a file.
- **`basicConfig` called twice** - only the first call takes effect.

## Practical application

Typical personal automations: tidy the Downloads folder, rename photos by date, combine monthly CSV files,
back up a folder to a dated zip, check a folder of reports for missing months, or produce a summary email
text. Run them by hand first, then schedule them with Task Scheduler or cron once you trust them.

## Revision notes

- `Path("a") / "b.txt"`, `.name/.stem/.suffix/.parent`, `.glob()`, `.mkdir(exist_ok=True)`, `.rename()`.
- Always offer a dry run for scripts that change files; never overwrite without checking.
- `logging.basicConfig(level=..., format=...)`; levels DEBUG < INFO < WARNING < ERROR < CRITICAL.
- Make scripts idempotent - safe to run twice.

```exercise
id: list-by-extension
title: Count files by type
difficulty: beginner
instructions: |
  The starter creates a folder `demo_files` with some files. Use `pathlib` to count how many files have each
  extension, then print the counts sorted by extension:

  ```text
  .csv 2
  .pdf 3
  .txt 1
  ```
starter: |
  from pathlib import Path

  folder = Path("demo_files")
  folder.mkdir(exist_ok=True)
  for name in ["a.pdf", "b.pdf", "c.txt", "d.csv", "e.pdf", "f.csv"]:
      (folder / name).write_text("demo")

  counts = {}
  # your code here: loop over folder.glob("*") and count each file.suffix
hints:
  - "`for file in folder.glob(\"*\"):` then `counts[file.suffix] = counts.get(file.suffix, 0) + 1`."
  - "Print with `for ext in sorted(counts): print(ext, counts[ext])`."
solution: |
  from pathlib import Path

  folder = Path("demo_files")
  folder.mkdir(exist_ok=True)
  for name in ["a.pdf", "b.pdf", "c.txt", "d.csv", "e.pdf", "f.csv"]:
      (folder / name).write_text("demo")

  counts = {}
  for file in folder.glob("*"):
      if file.is_file():
          counts[file.suffix] = counts.get(file.suffix, 0) + 1
  for ext in sorted(counts):
      print(ext, counts[ext])
explanation: |
  `file.suffix` gives the extension including the dot. Sorting the keys gives a stable order - folder listings
  can come back in any order depending on the computer.
check:
  expected: |
    .csv 2
    .pdf 3
    .txt 1
  requires: [for]
```

```exercise
id: logging-levels
title: Log instead of print
difficulty: beginner
instructions: |
  Configure logging to print to the screen (`stream=sys.stdout`) with level **INFO** and the format
  `%(levelname)s: %(message)s`. Then process the order quantities: log `INFO` for each valid quantity,
  `WARNING` for zero, and `ERROR` for negative numbers. The `DEBUG` line must not appear.

  ```text
  INFO: order 1 ok (3 items)
  WARNING: order 2 has no items
  ERROR: order 3 has a negative quantity (-2)
  INFO: order 4 ok (5 items)
  ```
starter: |
  import logging
  import sys

  # configure logging here

  quantities = [3, 0, -2, 5]
  logging.debug("starting")
  for number, qty in enumerate(quantities, start=1):
      pass  # log the right message
hints:
  - "`logging.basicConfig(stream=sys.stdout, level=logging.INFO, format=\"%(levelname)s: %(message)s\")`"
  - "Use `logging.info(...)`, `logging.warning(...)` and `logging.error(...)` in an if/elif/else."
solution: |
  import logging
  import sys

  logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s")

  quantities = [3, 0, -2, 5]
  logging.debug("starting")
  for number, qty in enumerate(quantities, start=1):
      if qty > 0:
          logging.info(f"order {number} ok ({qty} items)")
      elif qty == 0:
          logging.warning(f"order {number} has no items")
      else:
          logging.error(f"order {number} has a negative quantity ({qty})")
explanation: |
  The DEBUG message is filtered out because the level is INFO. Switching to `level=logging.DEBUG` would show it
  without changing any other line - that is the advantage over print.
check:
  expected: |
    INFO: order 1 ok (3 items)
    WARNING: order 2 has no items
    ERROR: order 3 has a negative quantity (-2)
    INFO: order 4 ok (5 items)
  requires: [call:basicConfig, call:warning, call:error]
  forbid: [call:print]
```

```exercise
id: dry-run-renamer
title: A renamer with a dry run
difficulty: intermediate
instructions: |
  Write `tidy_names(folder, dry_run=True)` that renames every `.txt` file so its name is lower-case with spaces
  replaced by underscores (`"Meeting Notes.txt"` → `"meeting_notes.txt"`). Files whose name is already tidy are
  skipped. In dry-run mode it only prints `would rename A -> B`; otherwise it renames and prints `renamed A ->
  B`. Process files in sorted order. The starter runs it twice: dry run, then for real, then lists the folder.

  ```text
  would rename Meeting Notes.txt -> meeting_notes.txt
  would rename Shopping List.txt -> shopping_list.txt
  renamed Meeting Notes.txt -> meeting_notes.txt
  renamed Shopping List.txt -> shopping_list.txt
  ['meeting_notes.txt', 'shopping_list.txt', 'todo.txt']
  ```
starter: |
  from pathlib import Path

  folder = Path("rename_demo")
  folder.mkdir(exist_ok=True)
  for old in folder.glob("*"):
      old.unlink()
  for name in ["Meeting Notes.txt", "todo.txt", "Shopping List.txt"]:
      (folder / name).write_text("demo")

  def tidy_names(folder, dry_run=True):
      pass

  tidy_names(folder)
  tidy_names(folder, dry_run=False)
  print(sorted(p.name for p in folder.glob("*")))
hints:
  - "`for file in sorted(folder.glob(\"*.txt\")):` and `new_name = file.name.lower().replace(\" \", \"_\")`."
  - "`if new_name == file.name: continue`"
  - "Rename with `file.rename(file.with_name(new_name))`."
solution: |
  from pathlib import Path

  folder = Path("rename_demo")
  folder.mkdir(exist_ok=True)
  for old in folder.glob("*"):
      old.unlink()
  for name in ["Meeting Notes.txt", "todo.txt", "Shopping List.txt"]:
      (folder / name).write_text("demo")

  def tidy_names(folder, dry_run=True):
      for file in sorted(folder.glob("*.txt")):
          new_name = file.name.lower().replace(" ", "_")
          if new_name == file.name:
              continue
          if dry_run:
              print(f"would rename {file.name} -> {new_name}")
          else:
              file.rename(file.with_name(new_name))
              print(f"renamed {file.name} -> {new_name}")

  tidy_names(folder)
  tidy_names(folder, dry_run=False)
  print(sorted(p.name for p in folder.glob("*")))
explanation: |
  The dry run shows the plan without touching anything; the real run does the same work. Because tidy names are
  skipped, running the script again does nothing - it is idempotent. `sorted(...)` collects the file list before
  any renaming starts.
check:
  expected: |
    would rename Meeting Notes.txt -> meeting_notes.txt
    would rename Shopping List.txt -> shopping_list.txt
    renamed Meeting Notes.txt -> meeting_notes.txt
    renamed Shopping List.txt -> shopping_list.txt
    ['meeting_notes.txt', 'shopping_list.txt', 'todo.txt']
```

```exercise
id: folder-report
title: A folder size report
difficulty: challenge
instructions: |
  Write `folder_report(folder)` that looks at every file in the folder **and its subfolders** (`rglob`) and
  returns a dictionary with:

  - `"files"`: number of files
  - `"total_bytes"`: total size in bytes
  - `"largest"`: the name of the largest file
  - `"by_type"`: a dict of extension → total bytes, sorted by extension

  Print the result.

  ```text
  {'files': 4, 'total_bytes': 1650, 'largest': 'video.mp4', 'by_type': {'.mp4': 1000, '.txt': 650}}
  ```
starter: |
  from pathlib import Path

  root = Path("report_demo")
  (root / "sub").mkdir(parents=True, exist_ok=True)
  (root / "a.txt").write_text("x" * 100)
  (root / "b.txt").write_text("x" * 250)
  (root / "sub" / "c.txt").write_text("x" * 300)
  (root / "sub" / "video.mp4").write_text("x" * 1000)

  def folder_report(folder):
      pass

  print(folder_report(root))
hints:
  - "`files = [p for p in folder.rglob(\"*\") if p.is_file()]`"
  - "Size: `p.stat().st_size`. Largest: `max(files, key=lambda p: p.stat().st_size).name`."
  - "Build `by_type` with a loop, then `dict(sorted(by_type.items()))`."
solution: |
  from pathlib import Path

  root = Path("report_demo")
  (root / "sub").mkdir(parents=True, exist_ok=True)
  (root / "a.txt").write_text("x" * 100)
  (root / "b.txt").write_text("x" * 250)
  (root / "sub" / "c.txt").write_text("x" * 300)
  (root / "sub" / "video.mp4").write_text("x" * 1000)

  def folder_report(folder):
      files = [p for p in folder.rglob("*") if p.is_file()]
      by_type = {}
      for p in files:
          by_type[p.suffix] = by_type.get(p.suffix, 0) + p.stat().st_size
      return {
          "files": len(files),
          "total_bytes": sum(p.stat().st_size for p in files),
          "largest": max(files, key=lambda p: p.stat().st_size).name,
          "by_type": dict(sorted(by_type.items())),
      }

  print(folder_report(root))
explanation: |
  `rglob` walks into subfolders, `stat().st_size` gives each file's size, and `max(..., key=...)` finds the
  biggest. This is the core of a "what is filling my disk?" tool.
check:
  expected: |
    {'files': 4, 'total_bytes': 1650, 'largest': 'video.mp4', 'by_type': {'.mp4': 1000, '.txt': 650}}
  requires: [method:rglob]
```

```quiz
- id: q1
  question: What does `Path("reports") / "jan.csv"` create?
  options:
    - A path to the file jan.csv inside the reports folder
    - A division error
    - A new file on disk
    - The text "reports/jan.csv" with no special meaning
  answer: A path to the file jan.csv inside the reports folder
  explanation: The / operator joins Path parts; nothing is created on disk until you write.
- id: q2
  question: Logging is configured with level=logging.WARNING. Which call is shown?
  options:
    - logging.error("disk full")
    - logging.info("started")
    - logging.debug("x = 3")
    - None of them
  answer: logging.error("disk full")
  explanation: Only WARNING and above (WARNING, ERROR, CRITICAL) are shown.
- id: q3
  question: Why give a file-changing script a dry-run mode?
  options:
    - To preview exactly what it would do before anything changes
    - To make it run faster
    - Because Python requires it
    - To delete files more quickly
  answer: To preview exactly what it would do before anything changes
  explanation: Check the plan first; mistakes in rename/delete loops are costly.
- id: q4
  question: What is `Path("photo.final.jpg").suffix`?
  options:
    - .jpg
    - .final.jpg
    - photo
    - jpg
  answer: .jpg
  explanation: suffix is the last extension, including the dot. stem would be "photo.final".
- id: q5
  question: What problem does `"C:\new\folder"` have in a normal Python string?
  options:
    - \n is read as a newline character
    - Windows paths are not allowed
    - The colon is invalid
    - Nothing - it's fine
  answer: \n is read as a newline character
  explanation: Use Path with forward slashes or a raw string r"C:\new\folder".
- id: q6
  question: What does "idempotent" mean for a script?
  options:
    - Running it twice is safe and gives the same final result
    - It runs only once and then deletes itself
    - It has no bugs
    - It never writes files
  answer: Running it twice is safe and gives the same final result
  explanation: E.g. mkdir(exist_ok=True) and skipping already-processed files.
```
