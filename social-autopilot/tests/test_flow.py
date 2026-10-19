"""End-to-end post + engage flow against a fake Instagram API (no network)."""
import os
import tempfile
import unittest
from pathlib import Path
from unittest import mock

from autopilot import run, state as st


class FakeResp:
    def __init__(self, body, code=200):
        self._b, self.status_code, self.text = body, code, str(body)

    def json(self):
        return self._b


def fake_ig(method, url, params=None, data=None, timeout=None):
    p = params or data or {}
    if url.endswith("/me"):
        return FakeResp({"id": "1", "user_id": "178", "username": "jobreadyindia2026"})
    if url.endswith("/content_publishing_limit"):
        return FakeResp({"data": [{"quota_usage": 1, "config": {"quota_total": 100}}]})
    if url.endswith("/178/media") and method == "POST":
        fake_ig.n += 1
        return FakeResp({"id": f"c{fake_ig.n}"})
    if url.endswith("/media_publish"):
        return FakeResp({"id": "M1"})
    if url.rsplit("/", 1)[-1].startswith("c") and url.rsplit("/", 1)[-1][1:].isdigit() and method == "GET":
        return FakeResp({"status_code": "FINISHED"})
    if url.endswith("/178/media") and method == "GET":
        return FakeResp({"data": [{"id": "M1"}]})
    if url.endswith("/M1/comments"):
        return FakeResp({"data": [
            {"id": "k1", "text": "INTERVIEW please", "username": "riya"},
            {"id": "k2", "text": "check my page www.spam.com", "username": "bot"},
        ]})
    if url.endswith("/replies"):
        fake_ig.replies.append(p["message"])
        return FakeResp({"id": "r"})
    return FakeResp({"error": {"message": f"unexpected {method} {url}"}}, 400)


class Flow(unittest.TestCase):
    def test_post_then_reply(self):
        fake_ig.n, fake_ig.replies = 0, []
        tmp = Path(tempfile.mkdtemp())
        env = {"IG_ACCESS_TOKEN": "tok", "R2_ACCOUNT_ID": "a", "R2_ACCESS_KEY_ID": "b",
               "R2_SECRET_ACCESS_KEY": "c", "R2_BUCKET_NAME": "d"}
        store = {}
        with mock.patch.dict(os.environ, env, clear=False), \
             mock.patch("autopilot.platforms.instagram.requests.request", side_effect=fake_ig), \
             mock.patch("autopilot.platforms.instagram.time.sleep"), \
             mock.patch("autopilot.r2.put_bytes", side_effect=lambda k, d, c: store.__setitem__(k, d)), \
             mock.patch("autopilot.r2.get_bytes", side_effect=lambda k: store.get("social-autopilot/" + k) or store.get(k)), \
             mock.patch("autopilot.run.OUT", tmp), \
             mock.patch("autopilot.run.now", return_value=run.datetime(2026, 10, 21, 10, 5, tzinfo=run.IST)), \
             mock.patch("autopilot.writer.available", return_value=False):
            self.assertEqual(run.main(["post"]), 0)
            state = st.load()
            self.assertEqual(len(state["posted"]), 1)
            # second run in the same slot must not double-post
            self.assertEqual(run.main(["post"]), 0)
            self.assertEqual(len(st.load()["posted"]), 1)
            self.assertEqual(run.main(["engage"]), 0)
        self.assertEqual(len(fake_ig.replies), 1)
        self.assertIn("@riya", fake_ig.replies[0])


if __name__ == "__main__":
    unittest.main()
