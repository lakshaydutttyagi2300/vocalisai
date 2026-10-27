# Project status and handover

**Purpose:** let anyone (the owner, another developer, another AI assistant) continue this project without the
original conversation.

*Last updated: 2026-10-27 (end of build session 1 - version 1.0 complete)*

## Current state in one paragraph

A complete, working local learning app (Streamlit + SQLite) with all 14 required sections; the **full
curriculum** - Python levels 0-11 (48 lessons) and SQL levels 0-7 (24 lessons), each lesson with explanations,
examples, auto-checked exercises, hints, model solutions and a quiz; **20 practical projects** (Python "level 12"
and SQL "level 8"); a sandboxed Python runner; an SQL practice engine with 7 sample databases;
progress/mastery/spaced-revision tracking; offline search; backup and restore; an optional pluggable AI tutor;
installers for Windows/macOS/Linux; and documentation. Everything listed as "Done" below was tested as described.

## Where the code lives

- Folder `coding-academy/` in the GitHub repository `lakshaydutttyagi2300/vocalisai`, branch
  `claude/nice-einstein-9wflst`. The rest of that repository is an unrelated web app - this folder is
  self-contained and can be moved to its own repository or simply copied.

## Features

| Feature | Status | How verified |
|---|---|---|
| Launch, navigation (14 sections) | Done | Browser test: every page loads with no errors at 1280 px and 390 px (phone) width, no sideways scrolling |
| Lessons (Learn / Practise / Quiz / Revise tabs, completion criteria) | Done | Browser test: read → run → wrong answer feedback → hint → correct → quiz 6/6 → automatic completion |
| Python practice lab (editor with Tab/Enter helpers, run, input, practice folder, saved programs) | Done | Unit tests + browser test |
| Python exercise checking (output, test cases, variants, structure rules, hidden tests) | Done | Unit tests; every one of 192 model solutions passes its check and every starter fails it |
| Python safety (time/output limits, file and process guards) | Done (see limitations) | Unit tests (Linux) |
| SQL practice lab (schema browser, run, reset, query plan, history, plain-English errors) | Done | Unit tests + browser test |
| SQL exercise checking (result comparison, `verify` queries for changes, required keywords) | Done | Unit tests; every one of 94 model solutions passes; ordered exercises checked for ties automatically |
| Projects (20, staged tasks, collapsed hints and sample solutions, reflections) | Done | Every sample solution runs in the tests (Python solutions in the sandbox with demo input; SQL solutions on their database); browser test of the pages |
| Progress, mastery, spaced revision, recommendations | Done | Unit tests + restart test (progress, saved answers, notes and practice files survive a restart) |
| Quizzes: lesson, level assessment, revision; history | Done | Unit tests + browser test |
| Knowledge base with offline search (lessons, articles, your notes) | Done | Unit tests + browser test |
| Notes (lesson-linked, tags, Markdown export) and bookmarks | Done | Unit tests + browser test |
| Backup (manual + automatic), restore (with safety backup), Google Drive folder support | Done | Unit tests (round trip, bad zips, zip-slip, version checks) + browser test (backup → delete note → restore → note back) |
| Settings, Help & Troubleshooting pages | Done | Browser test |
| Works offline | Done | Network-isolated test: internet confirmed unreachable; all 14 pages, Python and SQL checking, search and backup worked; zero attempts to contact other hosts |
| Optional AI tutor (Claude via `anthropic`; OpenAI-compatible for Ollama/LM Studio/others) | Done | OpenAI-compatible path tested against a local fake server; **real Claude/Ollama calls NOT tested** (no key/model in the build environment) |
| Installers: `install_mac_linux.sh`, `start_mac_linux.sh` | Done | Fresh install from a clean copy: installed in 26 s, app started on localhost only, full test suite passed in the fresh copy |
| Installers: `install_windows.bat`, `start_windows.bat` | Done | **NOT executed** - no Windows machine in the build environment (written carefully: CRLF line endings, tested commands mirror the Mac/Linux scripts) |

## Curriculum coverage

| Track | Levels | Lessons | Auto-checked exercises | Quiz questions | Projects |
|---|---|---|---|---|---|
| Python | 0-11 (+ level 12 = projects) | 48 | 192 | 289 | 10 |
| SQL | 0-7 (+ level 8 = projects) | 24 | 94 | 144 | 10 |

- **Python levels:** 0 foundations · 1 first programs · 2 decisions · 3 loops · 4 collections · 5 text, dates
  and numbers · 6 functions · 7 files, CSV/JSON, exceptions · 8 modules, comprehensions, generators · 9 OOP ·
  10 practical Python (venv/pip, APIs, automation/logging, testing, security and maintainable code) · 11 advanced
  (decorators, itertools, type hints/dataclasses, custom exceptions/context managers, performance, concurrency and
  design).
- **SQL levels:** 0 database fundamentals · 1 basic queries · 2 aggregation · 3 changing data, tables,
  constraints · 4 joins · 5 CASE, functions, subqueries, CTEs/UNION · 6 window functions, recursive queries ·
  7 design/normalisation, indexes/query plans, transactions/ACID. Differences between SQLite and
  PostgreSQL/MySQL/SQL Server are explained where they matter.
- **Projects:** Python - calculator, number guessing, quiz app, expense tracker, file organiser, CSV analyser,
  weather API app (works offline from a cached copy; one optional stage uses the free, keyless Open-Meteo
  service), SQLite contacts app, command-line toolkit, habit tracker. SQL - employee analysis, sales report,
  customer analysis/RFM, personal finance, inventory, school report cards, monthly KPIs, rankings/analytics,
  data quality investigation, library database design.
- **Sample databases (7):** school, shop, company, inventory, expenses, quality (deliberately messy), blank.
  Generated reproducibly by `tools/generate_datasets.py`.
- **Knowledge base:** glossary, Python errors, SQL errors, Python cheat sheet, SQL cheat sheet, SQLite vs other
  databases, debugging guide, learning tips, Git basics; plus 8 help pages.

## Tests performed (this session)

- `pytest` (1,167 passed, 2 skipped): engine, safety rules, checker, SQL engine, progress/mastery,
  backup/restore, search, AI plumbing, and content tests that: run every exercise's model solution through its
  own check; make sure every starter code fails; check every lesson's structure (7 sections, ≥ 3 exercises incl.
  beginner and harder, ≥ 5 quiz questions, hints, explanations); check example outputs shown in instructions
  match the check; check SQL examples in lessons run and Python examples parse; check quiz options are real text;
  check ordered SQL exercises have no ties; run every project's sample solution. The 2 skips are tie checks that
  can't apply (the sort column isn't shown).
- Headless Chromium (Playwright): all 14 pages at desktop and phone width; the full lesson flow; Python lab
  (input, saving, practice folder, error explanation); SQL lab (run, refused delete explained, reset); SQL and
  Python exercise checking on new levels (transactions, async); notes and search; backup → restore; settings;
  restart persistence; projects (collapsed solutions, ticking tasks).
- Offline test in an isolated network namespace (see Features).
- Fresh install of a clean copy with `install_mac_linux.sh` + start with `start_mac_linux.sh`.

## Known limitations (honest list)

1. **The Python lab protects against accidents, not against deliberate attacks.** It keeps practice programs in
   the practice folder and stops runaway programs, but it is not designed to contain intentionally harmful code.
   Only run code you understand - which is good practice anyway.
2. **Windows: no memory limit** for practice programs (the time limit still applies). Memory/CPU limits are
   applied on Linux/macOS.
3. **Windows scripts not run on real Windows** (see Features).
4. **AI tutor not tested against real services** (Claude API, Ollama). The request code follows the official
   `anthropic` SDK documentation and the OpenAI-compatible format.
5. The code editor is a plain text box with Tab/Enter helpers - no syntax colouring while typing (examples are
   colour-highlighted).
6. Projects are self-assessed (task checkboxes); their sample solutions are tested, but learners' project code
   is not auto-graded.
7. Progress is per computer (no sync) - by design; move it with backup/restore.
8. The lab's `input()` reads all answers from the Input box up front (no interactive typing mid-run).
9. Programs that need packages not installed in the app (e.g. `requests`, `pandas`) can't run in the lab; the
   lessons use the standard library and explain how to install packages on your own computer.

## Next steps (optional improvements)

1. Run `install_windows.bat` / `start_windows.bat` on a Windows PC and fix anything that comes up.
2. Try the AI tutor with a real provider (free: Ollama with `llama3.2`; paid: a Claude API key).
3. Content ideas: more exercises per lesson, more level assessments, a pandas/data-analysis track, a Git/GitHub
   track.
4. Possible features: a syntax-highlighting code editor component (would add a dependency), progress charts over
   time, printable certificates per level.

## How to continue development

```text
cd coding-academy
.venv/bin/python -m pip install -r requirements-dev.txt      (Windows: .venv\Scripts\python ...)
.venv/bin/python -m pytest tests/ -q                         (all tests, about 1 minute)
.venv/bin/python tools/fix_yaml_quotes.py                    (after writing lesson/quiz content)
.venv/bin/python tools/generate_datasets.py                  (only if you change the sample data generator)
bash start_mac_linux.sh                                      (or start_windows.bat)
```

Read `docs/ARCHITECTURE.md` (how it fits together), `docs/CONTENT_FORMAT.md` (how to write lessons, exercises,
quizzes and projects), `docs/MAINTENANCE.md` and `docs/TROUBLESHOOTING.md`.

## Decisions log

- **Streamlit + SQLite + plain files**: no build step, runs offline, easy to install with Python alone.
- **Content as Markdown + YAML** under `content/` (built-in) and `my_content/` (yours): portable, readable without
  the app, easy to extend.
- **Mastery from results only** (quiz accuracy + exercise success, reduced credit after viewing a solution) -
  opening a lesson never counts as learning.
- **AI is optional and pluggable**; nothing in the app needs it.
- **Exercise checks are verified by tests** (model solution passes, starter fails) so wrong checks can't slip in.
