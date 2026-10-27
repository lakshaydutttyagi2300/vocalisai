# Project status and handover

**Purpose:** let anyone (the owner, another developer, another AI assistant) continue this project without the
original conversation. Updated at each milestone.

*Last updated: 2026-10-27 (end of build session 1, milestone 3)*

## Current state in one paragraph

A working local learning app (Streamlit + SQLite) with all 14 required sections, a sandboxed Python runner,
an SQL practice engine with 7 sample databases, progress/mastery/revision tracking, offline search, backup and
restore, an optional pluggable AI tutor, installers for Windows/macOS/Linux, and documentation. The **beginner
curriculum is complete** (Python levels 0-3, SQL levels 0-2). Later levels and the projects are being added in
the same session - see "Curriculum coverage" for the exact state.

## Where the code lives

- Folder `coding-academy/` in the GitHub repository `lakshaydutttyagi2300/vocalisai`, branch
  `claude/nice-einstein-9wflst` (the rest of that repository is an unrelated web app - this folder is
  self-contained and can be moved to its own repository).

## Features

| Feature | Status | How verified |
|---|---|---|
| Launch, navigation (14 sections) | Done | Browser test: every page loads with no errors |
| Lessons (4-tab view, completion criteria) | Done | Browser test: read → exercise → quiz → completion |
| Python practice lab (editor, run, input, files, saved programs) | Done | Unit tests + browser test |
| Python exercise checking (output, variants, tests, structure rules) | Done | Unit tests; every model solution passes its checks |
| Python safety (time/output limits, file and process guards) | Done (see limitations) | Unit tests (Linux) |
| SQL practice lab (schema browser, run, reset, query plan, history) | Done | Unit tests + browser page load |
| SQL exercise checking (result comparison, verify for DML) | Done | Unit tests; every model solution passes |
| Progress, mastery, spaced revision, recommendations | Done | Unit tests |
| Quizzes: lesson, level assessment, revision; history | Done | Unit tests + browser test (lesson quiz) |
| Knowledge base with offline search (incl. notes) | Done | Unit tests |
| Notes (lesson-linked, tags, Markdown export) and bookmarks | Done | Unit tests |
| Backup (manual + automatic), restore (with safety backup), Google Drive folder support | Done | Unit tests (round trip, bad zips, zip-slip, version checks) |
| Settings | Done | Browser page load |
| Help & troubleshooting pages | Done | Browser page load |
| Optional AI tutor (Claude via `anthropic`; OpenAI-compatible for Ollama/LM Studio/others) | Done | OpenAI-compatible path tested against a local fake server; **real Claude/Ollama calls NOT tested** (no key/model available in the build environment) |
| Installers: `install_mac_linux.sh`, `start_mac_linux.sh` | Done | Syntax-checked; full fresh-install test pending (see below) |
| Installers: `install_windows.bat`, `start_windows.bat` | Done | **NOT executed** - no Windows machine in the build environment |

## Curriculum coverage

| Track | Levels complete | Lessons |
|---|---|---|
| Python | 0, 1, 2, 3 | 17 |
| SQL | 0, 1, 2 | 8 |

Knowledge base: glossary, Python errors, SQL errors, Python cheat sheet, SQL cheat sheet, SQLite vs other
databases, debugging guide, learning tips, Git basics. Help: 8 pages.

**In progress in this session:** Python levels 4-11, SQL levels 3-7, 10 Python + 10 SQL projects.

## Tests performed

- `pytest`: engine, safety rules, checker, SQL engine, progress/mastery, backup/restore, search, AI plumbing, and
  a content test that runs every exercise's model solution through its own checker.
- Headless Chromium (Playwright) against a running instance: all pages load without exceptions; a full lesson
  flow (mark read, run, check wrong/right answers, hints, Tab-key indentation, quiz, automatic completion);
  no requests to any non-localhost host were made.

## Known limitations (honest list)

1. **Python lab is a safety net, not a security sandbox.** Audit hooks block accidental damage (writing or
   deleting outside the practice folder, starting programs, ctypes) but determined malicious code could bypass
   them. Learners should only run code they understand.
2. **Windows: no memory limit** for practice programs (the time limit still applies). Memory/CPU limits use
   `resource` limits on Linux/macOS.
3. **Windows scripts untested** on real Windows (written carefully; CRLF line endings; no parentheses inside
   `if` blocks).
4. **AI tutor untested against real services** (Claude API, Ollama). The request code follows the official
   `anthropic` SDK documentation and the OpenAI-compatible format.
5. Code editor is a plain text box with Tab/Enter helpers - no syntax colouring while typing (examples are
   colour-highlighted).
6. Project completion is self-assessed (task checkboxes); projects are not auto-graded.
7. Progress is per computer (no sync) - by design; move it with backup/restore.
8. The lab's `input()` reads all answers from the Input box up front (no interactive typing mid-run).

## Next steps (exact)

1. Finish Python levels 4-11 and SQL levels 3-7 (same format; run `pytest tests/test_content.py`).
2. Write the 20 projects in `content/projects/python` and `content/projects/sql`.
3. Run the full browser test at desktop and 390 px width, the restart-persistence test, a backup/restore
   through the UI, and an offline (network-isolated) test.
4. Fresh-install test of `install_mac_linux.sh` in a clean copy.
5. Update this file, commit, push, and deliver a zip of the folder.
