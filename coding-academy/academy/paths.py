"""Every folder and file location the app uses, defined in one place.

Folder layout (relative to the main "coding-academy" folder):

    content/      lessons, projects and articles that ship with the app
    my_content/   your own extra lessons and articles (kept during updates)
    data/         YOUR progress database, practice files and settings
    backups/      backup .zip files (unless you choose another folder)

Set the environment variable ACADEMY_DATA_DIR to keep your data somewhere
else (the automated tests use this to work in a temporary folder).
"""

from __future__ import annotations

import os
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
CONTENT_DIR = APP_DIR / "content"
MY_CONTENT_DIR = APP_DIR / "my_content"

# The values below are (re)computed by configure() so tests can redirect them.
DATA_DIR: Path
DB_PATH: Path
PRACTICE_DB_DIR: Path
SANDBOX_DIR: Path
SECRETS_PATH: Path
DEFAULT_BACKUP_DIR: Path


def configure(data_dir: str | os.PathLike[str] | None = None) -> None:
    """Point every data path at ``data_dir`` (default: <app>/data)."""
    global DATA_DIR, DB_PATH, PRACTICE_DB_DIR, SANDBOX_DIR, SECRETS_PATH, DEFAULT_BACKUP_DIR
    if data_dir is None:
        data_dir = os.environ.get("ACADEMY_DATA_DIR") or (APP_DIR / "data")
    DATA_DIR = Path(data_dir).resolve()
    DB_PATH = DATA_DIR / "academy.db"
    PRACTICE_DB_DIR = DATA_DIR / "practice_databases"
    SANDBOX_DIR = DATA_DIR / "python_sandbox"
    SECRETS_PATH = DATA_DIR / "secrets.json"
    DEFAULT_BACKUP_DIR = (
        DATA_DIR.parent / "backups" if os.environ.get("ACADEMY_DATA_DIR") else APP_DIR / "backups"
    )


def ensure_dirs() -> None:
    """Create the data folders if they do not exist yet (safe to call often)."""
    for folder in (DATA_DIR, PRACTICE_DB_DIR, SANDBOX_DIR, MY_CONTENT_DIR):
        folder.mkdir(parents=True, exist_ok=True)


configure()
