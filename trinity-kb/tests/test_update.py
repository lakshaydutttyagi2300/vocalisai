import json

import pytest

from tkb import update


@pytest.fixture
def fake(tmp_path, monkeypatch):
    root = tmp_path / "app"; (root / "tkb").mkdir(parents=True); (root / "data").mkdir()
    (root / "tkb" / "a.py").write_text("old")
    (root / "same.txt").write_bytes(b"same")
    (root / "data" / "knowledge.db").write_text("MY DATA")
    (root / "gone.py").write_text("x")
    monkeypatch.setattr(update.config, "ROOT", root)
    monkeypatch.setattr(update, "MANIFEST", root / ".update-manifest.json")
    (root / ".update-manifest.json").write_text(json.dumps({"gone.py": "1"}))
    files = {"tkb/a.py": b"new", "same.txt": b"same", "start-windows.bat": b"@echo off\nrem hi\n", "data/knowledge.db": b"EVIL"}
    tree = {"tree": [{"type": "blob", "path": "trinity-kb/" + k, "sha": update.blob_sha(v)} for k, v in files.items()]}
    calls = []

    def get(url, timeout=20):
        calls.append(url)
        if "api.github.com" in url:
            return json.dumps(tree).encode()
        return files[url.split("/trinity-kb/")[1]]
    monkeypatch.setattr(update, "_get", get)
    return root, calls


def test_updates_only_changed_files_and_protects_data(fake):
    root, calls = fake
    r = update.check_and_update()
    assert r["status"] == "updated"
    assert (root / "tkb" / "a.py").read_text() == "new"
    assert (root / "data" / "knowledge.db").read_text() == "MY DATA"      # data is never touched
    assert not (root / "gone.py").exists()                                # removed upstream
    assert not any("same.txt" in c for c in calls)                         # unchanged files not downloaded
    assert (root / "start-windows.new.bat").read_bytes() == b"@echo off\r\nrem hi\r\n"  # CRLF, swapped on next start
    calls.clear()
    (root / "start-windows.bat").write_bytes(b"@echo off\r\nrem hi\r\n"); (root / "start-windows.new.bat").unlink()
    assert update.check_and_update()["status"] == "current"
    assert len(calls) == 1  # just the check


def test_offline_changes_nothing(fake, monkeypatch):
    root, _ = fake
    monkeypatch.setattr(update, "_get", lambda *a, **k: (_ for _ in ()).throw(OSError("offline")))
    assert update.check_and_update()["status"] == "offline"
    assert (root / "tkb" / "a.py").read_text() == "old"


def test_corrupt_download_changes_nothing(fake, monkeypatch):
    root, _ = fake
    real = update._get
    monkeypatch.setattr(update, "_get", lambda url, timeout=20: real(url) if "api.github" in url else b"garbage")
    assert update.check_and_update()["status"] == "error"
    assert (root / "tkb" / "a.py").read_text() == "old"
