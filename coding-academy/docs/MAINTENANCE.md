# Maintenance and continuing development

How to make common changes safely, without the original conversation. Read `ARCHITECTURE.md` first.

## Golden rules

1. **Back up first** (Backup & Restore page) before changing anything.
2. **Never delete or reset `data/`** - it is the learner's progress.
3. **Change one thing at a time**, then run the tests.
4. **Never edit an old database migration** - add a new one.
5. **Never put API keys in code or content.**

## Running the tests

From the app folder, in a terminal:

```text
Windows:   .venv\Scripts\python -m pip install -r requirements-dev.txt     (once)
           .venv\Scripts\python -m pytest
Mac/Linux: .venv/bin/python -m pip install -r requirements-dev.txt
           .venv/bin/python -m pytest
```

All tests should pass ("N passed"). The tests use a temporary data folder - they never touch your progress.
`tests/test_content.py` runs every exercise's model solution through its own checker, so it catches content
mistakes.

## Running the app while developing

`.streamlit/config.toml` sets `fileWatcherType = "none"` to save resources, so **code** changes need an app
restart (close the terminal window, start again). **Content** changes (lessons, articles) are picked up on the
next page refresh.

To develop with automatic reloading, start it with:
`.venv\Scripts\python -m streamlit run app.py --server.fileWatcherType auto --server.runOnSave true`

To try the app with a throw-away data folder (so your real progress is untouched), set the environment
variable `ACADEMY_DATA_DIR` first:
- Windows PowerShell: `$env:ACADEMY_DATA_DIR = "C:\temp\academy-test"` then start as usual.
- Mac/Linux: `ACADEMY_DATA_DIR=/tmp/academy-test bash start_mac_linux.sh`

## Adding or editing lessons

See `CONTENT_FORMAT.md`. Then run `pytest tests/test_content.py`. Keep lesson `id`s stable - progress is
stored by id. If you must rename one, progress for the old id is simply no longer shown (nothing breaks).

## Adding a sample SQL database

Either write a `.sql` file by hand in `content/sql/datasets/` (first lines: `-- title: ...` and
`-- description: ...`), or add a function to `tools/generate_datasets.py` and run it. **Do not change existing
datasets casually** - SQL exercises compare against results computed from them (the tests will tell you if
anything breaks).

## Changing the progress database structure (migrations)

1. Open `academy/db.py`.
2. **Append** a new SQL string to `MIGRATIONS` (for example `ALTER TABLE notes ADD COLUMN colour TEXT;`).
   Never edit or remove an existing entry.
3. Add the table name to `EXPECTED_TABLES` if you created a table.
4. Run the tests. On the next start, `db.migrate()` upgrades every existing database (and backups are upgraded
   when restored). Make changes **additive** (add tables/columns) so older backups stay restorable.

## Replacing or adding an AI provider

`academy/ai/providers.py`:

1. Write a class with a `name` attribute and a method
   `chat(self, system: str, messages: list[dict]) -> str` that returns the reply text and raises `AIError`
   (with a plain-English message) on failure.
2. Register it in `PROVIDERS`, and construct it in `get_provider()` from the settings
   (`ai_provider`, `ai_model`, `ai_base_url`) and secrets (`load_secrets()`).
3. Add an option for it on the AI Tutor page (`views/ai_tutor.py`).

Most services (OpenAI, Groq, Together, Mistral, local servers) already work through the
`OpenAICompatibleProvider` - no code needed, just settings. The Claude provider uses the official `anthropic`
package; Claude model names and prices change over time - check docs.anthropic.com and update
`CLAUDE_DEFAULT_MODEL` and the price note on the AI Tutor page.

## Updating Python packages

The tested versions are in `requirements.txt` (direct packages) and `constraints.txt` (everything). To upgrade:

1. Back up. Copy the whole app folder somewhere as a fallback.
2. Edit the version numbers in `requirements.txt` (for example `streamlit==1.70.0`).
3. Delete the `.venv` folder and run the installer with the constraints line temporarily removed
   (or run `.venv\Scripts\python -m pip install -r requirements.txt --upgrade`).
4. Run the tests and click through every page.
5. Re-create `constraints.txt` with `.venv\Scripts\python -m pip freeze > constraints.txt`.

Streamlit occasionally changes its API between versions; the pages use only common features (`st.navigation`,
`st.tabs`, `st.text_area`, `st.dataframe`, `st.page_link`...).

## Where to change common things

| Change | File |
|---|---|
| Menu items / page order | `app.py` |
| A page's layout | `views/<page>.py` |
| Completion/mastery rules, review intervals | `academy/progress.py` |
| Error explanations | `academy/error_explainer.py` |
| Python lab safety rules, limits | `academy/sandbox_bootstrap.py`, `academy/python_runner.py` |
| SQL lab safety rules, time limit | `academy/sql_engine.py` |
| Default settings | `academy/db.py` → `DEFAULT_SETTINGS` |
| What a backup contains | `academy/backup.py` |
| Colours / fonts | `.streamlit/config.toml` (`[theme]`), `academy/ui/common.py` (`CSS`) |
| Search ranking | `academy/search.py` |

## Getting help without Claude

- Python documentation: docs.python.org (also works as a reference for every lesson).
- Streamlit documentation: docs.streamlit.io.
- SQLite documentation: sqlite.org/docs.html.
- Error messages: paste the last line of the error into a search engine.
- Any other AI assistant can continue this project: give it `docs/PROJECT_STATUS.md`, `docs/ARCHITECTURE.md`
  and this file.
