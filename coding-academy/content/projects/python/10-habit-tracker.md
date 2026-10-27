---
id: proj-py-10-habit-tracker
title: Habit tracker (complete project)
track: python
order: 10
difficulty: challenge
summary: A complete small application - classes and dataclasses, JSON persistence, streak calculations with dates, input validation, tests and a clean structure - that you could keep using every day.
internet: false
skills: [py-9-1-classes-objects, py-11-3-type-hints-dataclasses, py-7-2-csv-json, py-5-3-dates-and-numbers, py-10-4-testing-and-debugging, py-10-5-security-and-maintainable-code, py-9-3-when-to-use-oop]
demo_input: |
  add
  Read 20 minutes
  add
  Walk
  done
  1
  2026-06-01
  done
  1
  2026-06-02
  done
  1
  2026-06-03
  done
  2
  2026-06-03
  done
  2
  yesterday
  2026-06-02
  list
  quit
starter: |
  import json
  from dataclasses import dataclass, field
  from datetime import date
  from pathlib import Path

  @dataclass
  class Habit:
      name: str
      done_dates: list[str] = field(default_factory=list)

  # Stage 1: create habits, mark them done for a date, list them
stages:
  - name: Beginner
    description: The core model.
    tasks:
      - {id: b1, text: "A Habit dataclass stores a name and the dates it was done (YYYY-MM-DD)"}
      - {id: b2, text: "You can add habits and mark a habit done for a date (no duplicates for the same day)"}
      - {id: b3, text: "list shows each habit with how many times it was done"}
  - name: Intermediate
    description: Persistence, streaks and tests.
    tasks:
      - {id: i1, text: "Habits are saved to habits.json after each change and loaded at start"}
      - {id: i2, text: "current_streak(today) counts consecutive days up to today (or yesterday)"}
      - {id: i3, text: "Invalid input (unknown habit number, bad dates) is handled with clear messages"}
      - {id: i4, text: "At least 5 assert tests cover streaks (including gaps and an empty habit) and saving/loading"}
  - name: Extension ideas
    required: false
    tasks:
      - {id: e1, text: "Longest streak ever, and completion % for the last 30 days"}
      - {id: e2, text: "A weekly calendar view printed with ✓ and ·"}
      - {id: e3, text: "Weekly habits (e.g. 3 times a week) as a subclass or a frequency field"}
      - {id: e4, text: "Store the data in SQLite instead of JSON and compare the code"}
---

## Goal

This is a "complete" project: it brings together most of what you've learned and is organised the way real
programs are - a **model** (the data and rules), **storage** (saving and loading), an **interface** (the menu)
and **tests**. Keep these parts separate and the program stays easy to change.

## Example run

```text
Command (add/done/list/quit): add
Habit name: Read 20 minutes
Command (add/done/list/quit): done
1) Read 20 minutes   2) Walk
Which habit? 1
Date (YYYY-MM-DD, empty = today): 2026-06-03
Command (add/done/list/quit): list
1) Read 20 minutes  done 3 times  current streak: 3 days
2) Walk             done 2 times  current streak: 2 days
```

## Step-by-step plan

1. **Model**: `Habit` (dataclass) with `mark_done(day)`, `times_done`, `current_streak(today)`.
2. **Storage**: `save(habits, path)` / `load(path)` converting to and from plain dictionaries
   (`dataclasses.asdict`).
3. **Interface**: a menu loop with `add`, `done`, `list`, `quit`, and helper functions to ask for a habit number
   and a date.
4. **Tests**: asserts for the model and storage (use a separate test file name).
5. Keep `today` as a parameter (dependency injection) so tests can use a fixed date.

## Hints

- Streak: start from `today` (or yesterday if today isn't done yet) and step back one day at a time with
  `timedelta(days=1)` while the date is in the set of done dates.
- Store dates as ISO text (`day.isoformat()`) in JSON; convert back with `date.fromisoformat`.
- Use a `set` for quick "was it done on this day?" checks.
- The sample solution uses a fixed "today" (2026-06-03) so the demo always gives the same result - use
  `date.today()` for real use.

## Sample solution

```python
import json
from dataclasses import asdict, dataclass, field
from datetime import date, timedelta
from pathlib import Path

DATA = Path("habits.json")


@dataclass
class Habit:
    name: str
    done_dates: list[str] = field(default_factory=list)

    def mark_done(self, day: date) -> bool:
        """Record the habit for a day. Returns False if it was already recorded."""
        text = day.isoformat()
        if text in self.done_dates:
            return False
        self.done_dates.append(text)
        self.done_dates.sort()
        return True

    @property
    def times_done(self) -> int:
        return len(self.done_dates)

    def current_streak(self, today: date) -> int:
        done = set(self.done_dates)
        day = today if today.isoformat() in done else today - timedelta(days=1)
        streak = 0
        while day.isoformat() in done:
            streak += 1
            day -= timedelta(days=1)
        return streak


def save(habits: list[Habit], path: Path = DATA) -> None:
    path.write_text(json.dumps([asdict(h) for h in habits], indent=2), encoding="utf-8")


def load(path: Path = DATA) -> list[Habit]:
    if not path.exists():
        return []
    return [Habit(**item) for item in json.loads(path.read_text(encoding="utf-8"))]


def ask_habit(habits: list[Habit]) -> Habit | None:
    print("   ".join(f"{i}) {h.name}" for i, h in enumerate(habits, start=1)))
    text = input("Which habit? ").strip()
    if text.isdigit() and 1 <= int(text) <= len(habits):
        return habits[int(text) - 1]
    print("There is no habit with that number.")
    return None


def ask_date(today: date) -> date:
    while True:
        text = input("Date (YYYY-MM-DD, empty = today): ").strip()
        if not text:
            return today
        try:
            return date.fromisoformat(text)
        except ValueError:
            print("Please use the format YYYY-MM-DD.")


def run(today: date, path: Path = DATA) -> None:
    habits = load(path)
    while True:
        command = input("Command (add/done/list/quit): ").strip().lower()
        if command == "add":
            name = input("Habit name: ").strip()
            if name:
                habits.append(Habit(name))
                save(habits, path)
            else:
                print("A habit needs a name.")
        elif command == "done" and habits:
            habit = ask_habit(habits)
            if habit:
                if habit.mark_done(ask_date(today)):
                    save(habits, path)
                else:
                    print("Already recorded for that day.")
        elif command == "list":
            for i, h in enumerate(habits, start=1):
                print(f"{i}) {h.name:<17} done {h.times_done} times  "
                      f"current streak: {h.current_streak(today)} days")
        elif command == "quit":
            break
        else:
            print("Unknown command (or no habits yet).")


# ---- tests (fixed dates so they always give the same answer)
TODAY = date(2026, 6, 3)
h = Habit("test")
assert h.current_streak(TODAY) == 0
for d in ["2026-06-01", "2026-06-02", "2026-06-03"]:
    h.mark_done(date.fromisoformat(d))
assert h.current_streak(TODAY) == 3
assert h.mark_done(TODAY) is False
assert Habit("gap", ["2026-05-30", "2026-06-02"]).current_streak(TODAY) == 1      # yesterday counts
assert Habit("old", ["2026-05-01"]).current_streak(TODAY) == 0
test_file = Path("habits_test.json")
save([h], test_file)
assert load(test_file) == [h]
test_file.unlink()
print("tests passed")

DATA.unlink(missing_ok=True)      # start fresh for this demo - remove to keep your habits
run(TODAY)
```

## Test your program

Run the tests after every change. Then use it for real for a week (with `date.today()`), and keep a list of
annoyances - each one is a feature or fix for the next version. That's how real software grows.
