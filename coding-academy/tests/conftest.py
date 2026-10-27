"""Shared test setup: every test gets its own empty data folder."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from academy import db, paths  # noqa: E402


@pytest.fixture(autouse=True)
def fresh_data_dir(tmp_path, monkeypatch):
    data = tmp_path / "data"
    monkeypatch.setenv("ACADEMY_DATA_DIR", str(data))
    paths.configure(data)
    paths.DEFAULT_BACKUP_DIR = tmp_path / "backups"
    my_content = tmp_path / "my_content"
    monkeypatch.setattr(paths, "MY_CONTENT_DIR", my_content)
    paths.ensure_dirs()
    db.migrate()
    yield data
    paths.configure()


@pytest.fixture(scope="session")
def library():
    from academy.content import load_library

    return load_library()
