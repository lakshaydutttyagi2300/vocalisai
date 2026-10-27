---
id: proj-py-09-cli-utility
title: Command-line text toolkit
track: python
order: 9
difficulty: intermediate
summary: A real command-line tool with sub-commands (stats, find, replace) built with argparse - usable from a terminal like any professional utility, and testable from Python.
internet: false
skills: [py-10-1-packages-venv-dependencies, py-10-3-automation-and-logging, py-10-4-testing-and-debugging, py-7-1-reading-writing-files, py-5-1-string-methods, py-6-2-arguments-and-scope]
starter: |
  import argparse

  def main(argv=None):
      parser = argparse.ArgumentParser(description="Small text toolkit")
      parser.add_argument("file", help="the text file to read")
      args = parser.parse_args(argv)
      # your code here: read the file and print how many lines and words it has

  # In the lab there is no terminal, so call main() with a list of arguments:
  from pathlib import Path
  Path("poem.txt").write_text("The cat sat\non the mat\n", encoding="utf-8")
  main(["poem.txt"])
stages:
  - name: Beginner
    description: One command.
    tasks:
      - {id: b1, text: "main(argv) parses arguments with argparse and reads the named file"}
      - {id: b2, text: "It prints the number of lines, words and characters"}
      - {id: b3, text: "A missing file gives a clear error message, not a traceback"}
  - name: Intermediate
    description: Sub-commands and options.
    tasks:
      - {id: i1, text: "Sub-commands: stats FILE, find FILE WORD (prints matching lines with line numbers) and replace FILE OLD NEW"}
      - {id: i2, text: "find has an --ignore-case option"}
      - {id: i3, text: "replace has a --dry-run option and otherwise writes the changed file (keeping a .bak copy)"}
      - {id: i4, text: "main() returns an exit code (0 = ok, 1 = error) and there are assert tests calling main([...])"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Run it from a real terminal: python textkit.py stats poem.txt (see the steps below)"}
      - {id: e2, text: "Accept several files and wildcards (stats *.txt)"}
      - {id: e3, text: "Add a top command listing the 10 most common words (collections.Counter)"}
      - {id: e4, text: "Package it with a pyproject.toml so 'pip install .' gives you a textkit command"}
---

## Goal

Programs like `git`, `pip` and `python` itself are command-line tools: you type a command with arguments. Here you
build one, the professional way: `argparse` for arguments, sub-commands, helpful errors, exit codes and tests.

## Example run

In a terminal (on your own computer):

```text
> py textkit.py stats poem.txt
poem.txt: 2 lines, 6 words, 23 characters
> py textkit.py find poem.txt CAT --ignore-case
1: The cat sat
> py textkit.py replace poem.txt mat rug --dry-run
would change 1 line(s)
> py textkit.py stats missing.txt
error: file not found: missing.txt
```

In the Python Lab, there's no terminal, so the sample solution calls `main([...])` with a list of arguments -
exactly what argparse would receive from the terminal.

## Step-by-step plan

1. `main(argv=None)` builds the parser and calls `parser.parse_args(argv)` (`None` means "use the real command
   line").
2. Add sub-commands with `parser.add_subparsers(dest="command", required=True)` and one sub-parser each.
3. Write one function per command; `main` dispatches and returns 0 or 1.
4. Catch `FileNotFoundError` and print a short `error:` message.
5. Test with asserts: `assert main(["stats", "poem.txt"]) == 0`.

## Hints

- `sub = parser.add_subparsers(dest="command", required=True)`, then
  `find = sub.add_parser("find"); find.add_argument("file"); find.add_argument("word");
  find.add_argument("--ignore-case", action="store_true")`.
- argparse handles `--help` for you and exits; in tests, avoid `--help` or catch `SystemExit`.
- At the bottom of a real script: `if __name__ == "__main__": raise SystemExit(main())` - the exit code goes to
  the terminal.
- To run it on your own computer: save as `textkit.py` in a folder, open a terminal there, and run
  `py textkit.py stats poem.txt` (Windows) or `python3 textkit.py stats poem.txt` (Mac/Linux).

## Sample solution

```python
import argparse
import shutil
import sys
from pathlib import Path


def cmd_stats(args):
    text = Path(args.file).read_text(encoding="utf-8")
    print(f"{args.file}: {len(text.splitlines())} lines, {len(text.split())} words, {len(text)} characters")


def cmd_find(args):
    word = args.word.lower() if args.ignore_case else args.word
    lines = Path(args.file).read_text(encoding="utf-8").splitlines()
    found = 0
    for number, line in enumerate(lines, start=1):
        haystack = line.lower() if args.ignore_case else line
        if word in haystack:
            print(f"{number}: {line}")
            found += 1
    if not found:
        print("no matches")


def cmd_replace(args):
    path = Path(args.file)
    lines = path.read_text(encoding="utf-8").splitlines(keepends=True)
    changed = sum(1 for line in lines if args.old in line)
    if args.dry_run:
        print(f"would change {changed} line(s)")
        return
    shutil.copy(path, path.with_suffix(path.suffix + ".bak"))
    path.write_text("".join(line.replace(args.old, args.new) for line in lines), encoding="utf-8")
    print(f"changed {changed} line(s); backup saved as {path.name}.bak")


def build_parser():
    parser = argparse.ArgumentParser(prog="textkit", description="Small text toolkit")
    sub = parser.add_subparsers(dest="command", required=True)
    stats = sub.add_parser("stats", help="count lines, words and characters")
    stats.add_argument("file")
    stats.set_defaults(handler=cmd_stats)
    find = sub.add_parser("find", help="show lines containing a word")
    find.add_argument("file")
    find.add_argument("word")
    find.add_argument("--ignore-case", action="store_true")
    find.set_defaults(handler=cmd_find)
    replace = sub.add_parser("replace", help="replace text in a file")
    replace.add_argument("file")
    replace.add_argument("old")
    replace.add_argument("new")
    replace.add_argument("--dry-run", action="store_true")
    replace.set_defaults(handler=cmd_replace)
    return parser


def main(argv=None):
    args = build_parser().parse_args(argv)
    try:
        args.handler(args)
    except FileNotFoundError:
        print(f"error: file not found: {args.file}", file=sys.stderr)
        return 1
    return 0


# --- demo and tests (in a real script: if __name__ == "__main__": raise SystemExit(main()))
Path("poem.txt").write_text("The cat sat\non the mat\n", encoding="utf-8")
assert main(["stats", "poem.txt"]) == 0
assert main(["find", "poem.txt", "CAT", "--ignore-case"]) == 0
assert main(["replace", "poem.txt", "mat", "rug", "--dry-run"]) == 0
assert main(["replace", "poem.txt", "mat", "rug"]) == 0
assert "rug" in Path("poem.txt").read_text() and Path("poem.txt.bak").exists()
assert main(["stats", "missing.txt"]) == 1
print("all checks passed")
```

## Test your program

Besides the asserts: run `main(["--help"])` inside `try: ... except SystemExit: pass` to see the generated help,
give a wrong sub-command, forget an argument, and use a file with Windows line endings. Then follow the hint to
run it from a real terminal.
