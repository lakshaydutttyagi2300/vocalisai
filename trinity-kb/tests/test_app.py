import re

import pytest


@pytest.fixture
def client(conn, files):
    from tkb import app as appmod, ingest
    for f in files.iterdir():
        ingest.import_file(conn, f)
    appmod.app.config["TESTING"] = True
    return appmod.app.test_client(), appmod.CSRF


def test_pages_render(client):
    c, _ = client
    for url in ["/", "/search?q=replacement+certificate", "/ticket", "/triage", "/official", "/documents", "/drafts",
                "/coverage", "/settings", "/reports/imports", "/documents/1"]:
        r = c.get(url)
        assert r.status_code == 200, url


def test_ticket_flow_and_draft(client):
    c, tok = client
    r = c.post("/ticket", data={"csrf": tok, "ticket": "How is a digital booking confirmed? My son needs help.", "question": ""})
    html = r.get_data(as_text=True)
    assert "Thank you for contacting Trinity College London." in html and "Evidence panel" in html
    r = c.post("/drafts/save", data={"csrf": tok, "question": "q", "response": "Thank you for contacting Trinity College London.\nHi",
                                     "ticket": "secret ticket", "evidence": ["1"]}, follow_redirects=True)
    assert r.status_code == 200
    from tkb import db
    conn = db.connect()
    assert conn.execute("SELECT ticket_text FROM drafts").fetchone()[0] is None  # not kept unless ticked


def test_post_requires_token(client):
    c, _ = client
    assert c.post("/privacy/clear", data={"what": "all"}).status_code == 400


def test_non_local_host_rejected(client):
    from tkb import app as appmod
    appmod.app.config["TESTING"] = False
    try:
        assert client[0].get("/", headers={"Host": "evil.example"}).status_code == 403
    finally:
        appmod.app.config["TESTING"] = True
