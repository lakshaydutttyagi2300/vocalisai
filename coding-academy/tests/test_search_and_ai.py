"""Local search and the optional AI provider plumbing (no real AI service is contacted)."""

import json
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from academy import db
from academy.ai.providers import AIError, OpenAICompatibleProvider, get_provider, save_secret, load_secrets
from academy.search import build_index, make_snippet, note_docs, stem, tokenize


def test_stemming_and_tokens():
    assert stem("loops") == "loop" and stem("queries") == "query" and stem("running") == "runn"
    assert "the" not in tokenize("the loop")


def test_search_finds_lessons_and_notes(library):
    index = build_index(library)
    hits = index.search("print output")
    assert hits and hits[0].doc.kind in {"lesson", "exercise", "article"}
    notes = note_docs([{"id": 1, "title": "Banana idea", "tags": "", "body": "remember bananas"}])
    hits = index.search("banana", extra_docs=notes)
    assert hits[0].doc.kind == "note"
    assert index.search("") == []


def test_snippet_highlights():
    snippet = make_snippet("A long text about the print function and more.", "print")
    assert "**print**" in snippet


class _FakeAI(BaseHTTPRequestHandler):
    def do_POST(self):  # noqa: N802 - required name
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        assert body["messages"][0]["role"] == "system"
        reply = {"choices": [{"message": {"content": f"echo: {body['messages'][-1]['content']}"}}]}
        data = json.dumps(reply).encode()
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


def test_openai_compatible_provider_with_fake_local_server():
    server = HTTPServer(("127.0.0.1", 0), _FakeAI)
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        provider = OpenAICompatibleProvider(f"http://127.0.0.1:{server.server_port}/v1", "test-model")
        assert provider.chat("system", [{"role": "user", "content": "hi"}]) == "echo: hi"
    finally:
        server.shutdown()


def test_unreachable_local_model_gives_friendly_error():
    provider = OpenAICompatibleProvider("http://127.0.0.1:9/v1", "m", timeout=2)
    with pytest.raises(AIError, match="Could not connect"):
        provider.chat("s", [{"role": "user", "content": "hi"}])


def test_provider_off_by_default_and_secrets_stored_locally():
    assert get_provider() is None
    save_secret("anthropic_api_key", "abc")
    assert load_secrets()["anthropic_api_key"] == "abc"
    db.set_setting("ai_provider", "claude")
    assert get_provider().api_key == "abc"
    save_secret("anthropic_api_key", "")
    assert "anthropic_api_key" not in load_secrets()
