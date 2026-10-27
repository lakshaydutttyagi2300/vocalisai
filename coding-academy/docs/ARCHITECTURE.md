# Architecture

How *My Personal Coding Academy* is put together, and why. Written for a future maintainer (you, another
developer, or an AI assistant) who has not seen the original conversation.

## Goals that shaped the design

1. **Runs locally, works offline, no paid services.** No cloud, no accounts, no mandatory API keys.
2. **Beginner can install and run it** by double-clicking scripts.
3. **Content is separate from code**, in plain text the learner can read and extend.
4. **User data is separate from replaceable app files**, and survives updates.
5. **Learner code must not be able to damage the computer by accident.**
6. **The AI tutor is optional and swappable.**

## Technology choices

| Need | Choice | Why |
|---|---|---|
| Language | Python 3.12+ | The learner is learning Python, so they can eventually read every line |
| User interface | Streamlit 1.66 | Pure-Python web UI served on localhost; no HTML/JS build tools |
| App data | SQLite (built into Python) | Single file, zero setup, robust, easy to back up |
| SQL practice | SQLite | Same engine, sample databases as plain `.sql` files |
| Lesson format | Markdown + YAML blocks | Human-readable, portable, editable in Notepad |
| Search | Pure-Python BM25 | Offline, no embeddings service, fast for hundreds of documents |
| Code execution | Separate `python -I` subprocess + audit hook | No extra dependency; time/output limits; file-write guard |
| AI | `anthropic` SDK for Claude; plain HTTP for OpenAI-compatible APIs (Ollama, LM Studio...) | Optional; one small interface |

Rejected alternatives: Flask/React (more moving parts and languages), Docker (hard for beginners), a cloud
database (needs internet/accounts), a browser-based Python (Pyodide - large download and less faithful).

## Folder layout

```text
app.py                     entry point: page config, start-up, navigation menu
views/*.py                 one Streamlit page per menu item (thin: layout + calls into academy/)
academy/                   all logic, importable and testable without Streamlit (except academy/ui)
  paths.py                 every file location; ACADEMY_DATA_DIR overrides the data folder
  db.py                    progress database: connection helper, MIGRATIONS list, settings
  content.py               loads lessons/projects/articles; validates; reports problems instead of crashing
  python_runner.py         runs learner code in a child process and collects RunResult
  sandbox_bootstrap.py     runs INSIDE the child: limits, audit hook, input echo, tests
  python_checker.py        checks Python exercises (output cases, variants, tests, structure rules)
  sql_engine.py            datasets, practice DBs, guarded execution, answer checking
  progress.py              completion criteria, mastery, Leitner review boxes, quizzes, exports
  personal.py              notes, bookmarks, saved lab programs, project tasks
  search.py                BM25 index over content + notes
  backup.py                zip backups, validation, restore with safety backup, auto-backup
  error_explainer.py       plain-English explanations of Python and SQL errors
  ai/providers.py          AI provider interface + Claude + OpenAI-compatible; secrets file
  ai/tutor.py              tutor instructions and lesson context
  ui/common.py             cached content/index, styling, Tab-key editor helper, navigation links
  ui/exercises.py          exercise widgets (editor, Run, Check, hints, solution)
  ui/quiz.py               quiz widget
  ui/lesson.py             lesson page (4 tabs) and academy overview
content/                   built-in learning material (replaced by updates)
my_content/                learner's own material (kept by updates, included in backups)
data/                      learner's data (never in git, never replaced)
tests/                     pytest suite (engine + every exercise's model solution)
tools/generate_datasets.py regenerates content/sql/datasets/*.sql deterministically
```

## Data flow of an exercise check

1. `views/...` → `ui/exercises.render_python_exercise` shows the editor (a keyed `st.text_area`).
2. *Check* → `python_checker.check_python_exercise(exercise, code)`.
3. Static rules (`requires`, `forbid`, `require_text`, `min_comments`) use `ast`/`tokenize` - no execution.
4. Each output case / variant → `python_runner.run_python(code, stdin)`:
   - writes `job.json` to a temp folder, starts `python -I -X utf8 sandbox_bootstrap.py job.json` with
     `cwd = data/python_sandbox`, a minimal environment and a timeout;
   - the bootstrap opens the result file, applies limits (rlimits on Linux/macOS), wraps stdout/stderr with a
     size limit, replaces `input()` with an echoing version, installs an **audit hook** (blocks writes/deletes
     outside the sandbox, subprocesses, ctypes, winreg...), executes the code as `your_code.py`, runs any
     `tests` in the same namespace, and writes `result.json`.
5. The outcome (details per check) is stored via `progress.record_exercise_attempt`, then
   `progress.refresh_completion(lesson)` marks the lesson complete if all criteria are met.

SQL checks: `sql_engine.check_sql_exercise` builds two fresh in-memory copies of the dataset (cloned from a
cached template with SQLite's backup API), runs the learner's SQL and the model solution (or a `verify` query
after DML), and compares results (order-sensitive only if `ordered: true`; floats compared after rounding).

## Progress model

Tables (see `db.MIGRATIONS[0]`): `lesson_progress`, `exercise_attempts`, `exercise_drafts`, `exercise_help`,
`quiz_attempts`, `quiz_answers`, `review_state`, `notes`, `bookmarks`, `project_tasks`, `project_status`,
`lab_files`, `activity`, `settings`.

Statuses are **computed** (never stored) by `progress.lesson_status` from raw events, so the rules can change
without migrating data. Definitions are in the docstring of `academy/progress.py` and on the Progress page.

## Safety boundaries

- Streamlit listens on **localhost only** (`.streamlit/config.toml`) - other devices cannot reach the code
  runner.
- Learner Python: separate process, time limit, output limit, file-write/delete/rename guard, no subprocess,
  no ctypes, rlimits on POSIX. Designed to prevent accidents by a learner running their own code - not to
  contain deliberately harmful code. Documented to the learner ("only run code you understand").
- Learner SQL: practice copies only; authorizer denies ATTACH/DETACH/load_extension and risky PRAGMAs;
  `VACUUM INTO` refused; progress handler enforces a time limit.
- Backups: zip members validated (no absolute paths/`..`, size cap), DB integrity-checked and version-checked
  before restore; restore uses SQLite's backup API and always makes a safety backup first.
- Secrets: `data/secrets.json` only; excluded from backups and git.

## Caching

`ui/common.get_library()` caches the parsed content keyed by a signature of all content files' mtimes and sizes,
so editing a lesson file takes effect on the next page load without restarting. The search index is cached the
same way. Database access is never cached (each operation opens and closes a connection).
