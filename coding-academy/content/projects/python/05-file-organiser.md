---
id: proj-py-05-file-organiser
title: File organiser
track: python
order: 5
difficulty: intermediate
summary: A script that sorts a messy folder into sub-folders by file type, with a dry-run preview, no overwriting, a log, and an undo record.
internet: false
skills: [py-7-1-reading-writing-files, py-10-3-automation-and-logging, py-4-4-dictionaries, py-6-3-problem-decomposition, py-7-3-exceptions]
starter: |
  from pathlib import Path

  # Create a messy demo folder to practise on (only inside your practice folder)
  inbox = Path("messy_downloads")
  inbox.mkdir(exist_ok=True)
  for name in ["report.pdf", "holiday.jpg", "notes.txt", "song.mp3", "budget.xlsx", "photo.PNG"]:
      (inbox / name).write_text("demo")

  # your code here: move each file into a sub-folder by type
stages:
  - name: Beginner
    description: Sort files by extension.
    tasks:
      - {id: b1, text: "The script lists the files in a folder (not sub-folders) with pathlib"}
      - {id: b2, text: "Each file goes into a sub-folder chosen by its extension (e.g. images, documents, audio, other)"}
      - {id: b3, text: "Extensions are matched case-insensitively (.PNG and .png are both images)"}
  - name: Intermediate
    description: Safe enough to use on real folders.
    tasks:
      - {id: i1, text: "A dry-run mode prints what would happen without moving anything"}
      - {id: i2, text: "An existing file with the same name is never overwritten (add a number, e.g. report (1).pdf)"}
      - {id: i3, text: "Every move is logged with the logging module"}
      - {id: i4, text: "A summary at the end says how many files went to each folder"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Write an undo file (JSON of moves) and a function that moves everything back"}
      - {id: e2, text: "Sort by month instead (2026-06/) using each file's modification time"}
      - {id: e3, text: "Read the folder name from the command line with argparse"}
      - {id: e4, text: "Find duplicate files by comparing their contents (hashlib)"}
---

## Goal

Automate a boring job safely. The most important skill here isn't moving files - it's making a script you can
**trust**: preview first, never destroy data, record what happened.

> In the Python Lab, scripts can only touch files inside your practice folder, so you can experiment freely with
> the demo folder. On your own computer, always test on a **copy** first.

## Example run

```text
[dry run] report.pdf -> documents/
[dry run] holiday.jpg -> images/
[dry run] song.mp3 -> audio/
...
INFO: moved report.pdf -> documents/report.pdf
INFO: moved holiday.jpg -> images/holiday.jpg
Summary: audio 1, documents 3, images 2
```

## Step-by-step plan

1. A dictionary maps folder names to extensions: `{"images": {".jpg", ".png"}, ...}`.
2. `folder_for(path)` returns the folder for a file (lower-case suffix), or `"other"`.
3. `plan_moves(inbox)` returns a list of `(source, target)` pairs - no changes yet.
4. `apply_moves(moves, dry_run=True)` prints or performs them, using `unique_target()` to avoid overwriting.
5. Log each move; count per folder for the summary.

## Hints

- `sorted(p for p in inbox.iterdir() if p.is_file())` - files only, in a stable order.
- `path.suffix.lower()` gives `.png` for `photo.PNG`.
- `unique_target`: while the target exists, try `stem (1).suffix`, `stem (2).suffix`, ...
- `logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s")` shows log
  lines in the lab's output.

## Sample solution

```python
import json
import logging
import sys
from collections import Counter
from pathlib import Path

logging.basicConfig(stream=sys.stdout, level=logging.INFO, format="%(levelname)s: %(message)s")

TYPES = {
    "images": {".jpg", ".jpeg", ".png", ".gif"},
    "documents": {".pdf", ".txt", ".docx", ".xlsx", ".csv"},
    "audio": {".mp3", ".wav"},
}


def folder_for(path):
    for folder, extensions in TYPES.items():
        if path.suffix.lower() in extensions:
            return folder
    return "other"


def unique_target(target):
    number = 1
    candidate = target
    while candidate.exists():
        candidate = target.with_name(f"{target.stem} ({number}){target.suffix}")
        number += 1
    return candidate


def plan_moves(inbox):
    files = sorted(p for p in inbox.iterdir() if p.is_file())
    return [(p, inbox / folder_for(p) / p.name) for p in files]


def apply_moves(moves, dry_run=True):
    done = []
    for source, target in moves:
        if dry_run:
            print(f"[dry run] {source.name} -> {target.parent.name}/")
            continue
        target.parent.mkdir(exist_ok=True)
        target = unique_target(target)
        source.rename(target)
        logging.info(f"moved {source.name} -> {target.parent.name}/{target.name}")
        done.append([str(source), str(target)])
    return done


def undo(record_file):
    for source, target in reversed(json.loads(record_file.read_text())):
        Path(target).rename(unique_target(Path(source)))
    logging.info("undo finished")


inbox = Path("messy_downloads")
inbox.mkdir(exist_ok=True)
for name in ["report.pdf", "holiday.jpg", "notes.txt", "song.mp3", "budget.xlsx", "photo.PNG"]:
    (inbox / name).write_text("demo")
(inbox / "documents").mkdir(exist_ok=True)
(inbox / "documents" / "report.pdf").write_text("an older report")   # a name clash to handle

moves = plan_moves(inbox)
apply_moves(moves, dry_run=True)
done = apply_moves(moves, dry_run=False)
record = Path("organiser_undo.json")
record.write_text(json.dumps(done, indent=2))
counts = Counter(Path(target).parent.name for _, target in done)
print("Summary:", ", ".join(f"{folder} {n}" for folder, n in sorted(counts.items())))
```

## Test your program

Run it twice (the second run should find nothing to move), create a clash (a file with the same name already in
the target folder), include a file with no extension, and try the undo. Check the folder after each step in the
lab's **Practice folder** tab.
