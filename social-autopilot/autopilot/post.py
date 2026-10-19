"""The post format shared by the queue, the AI writer, the renderers and the platforms.

Everything here is validated before use: queue files are hand/AI written, and AI output is
untrusted, so a bad file is skipped with a plain message instead of crashing a scheduled run.
"""
from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from .brand import ROOT, brand

QUEUE_DIR = ROOT / "content" / "queue"
FORMATS = ("reel", "carousel")
KEYWORD_RE = re.compile(r"^[A-Z]{3,15}$")


class PostError(ValueError):
    """A queue file or AI draft that can't be used, with a plain-language reason."""


@dataclass
class Slide:
    title: str
    body: str = ""


@dataclass
class Post:
    id: str
    publish_after: datetime
    format: str
    pillar: str
    hook: str
    slides: list[Slide]
    cta: str
    caption: str
    hashtags: list[str] = field(default_factory=list)
    comment_keyword: str = ""
    keyword_reply: str = ""
    source: Path | None = None

    def full_caption(self) -> str:
        tags = self.hashtags or brand()["default_hashtags"]
        return f"{self.caption.strip()}\n.\n.\n{' '.join(tags)}"[:2200]


def _text(data: dict, key: str, max_len: int, required: bool = True) -> str:
    value = data.get(key, "")
    if not isinstance(value, str):
        raise PostError(f"'{key}' must be text")
    value = value.strip()
    if required and not value:
        raise PostError(f"'{key}' is missing")
    if len(value) > max_len:
        raise PostError(f"'{key}' is longer than {max_len} characters")
    return value


def parse_post(data: dict, source: Path | None = None) -> Post:
    if not isinstance(data, dict):
        raise PostError("the post is not a JSON object")
    post_id = _text(data, "id", 60)
    if not re.fullmatch(r"[a-z0-9][a-z0-9\-]*", post_id):
        raise PostError("'id' may only use lowercase letters, numbers and dashes")
    fmt = _text(data, "format", 10)
    if fmt not in FORMATS:
        raise PostError(f"'format' must be one of {', '.join(FORMATS)}")
    try:
        when = datetime.fromisoformat(_text(data, "publish_after", 40))
    except ValueError as exc:
        raise PostError("'publish_after' must look like 2026-10-21T10:00:00+05:30") from exc
    if when.tzinfo is None:
        raise PostError("'publish_after' needs a time zone, e.g. +05:30")

    raw_slides = data.get("slides")
    if not isinstance(raw_slides, list) or not 2 <= len(raw_slides) <= 8:
        raise PostError("'slides' must be a list of 2 to 8 slides")
    slides = [Slide(_text(s, "title", 90), _text(s, "body", 260, required=False)) for s in raw_slides]

    hashtags = data.get("hashtags", [])
    if not isinstance(hashtags, list) or not all(isinstance(t, str) and re.fullmatch(r"#\w{2,40}", t) for t in hashtags):
        raise PostError("'hashtags' must be a list like [\"#interviewtips\"]")
    if len(hashtags) > 15:
        raise PostError("use at most 15 hashtags")

    keyword = _text(data, "comment_keyword", 15, required=False).upper()
    if keyword and not KEYWORD_RE.fullmatch(keyword):
        raise PostError("'comment_keyword' must be one word of 3-15 letters")

    return Post(
        id=post_id,
        publish_after=when,
        format=fmt,
        pillar=_text(data, "pillar", 30),
        hook=_text(data, "hook", 110),
        slides=slides,
        cta=_text(data, "cta", 140),
        caption=_text(data, "caption", 1800),
        hashtags=hashtags,
        comment_keyword=keyword,
        keyword_reply=_text(data, "keyword_reply", 300, required=False),
        source=source,
    )


def load_queue() -> tuple[list[Post], list[str]]:
    """All valid queued posts (oldest first) plus a plain message for each broken file."""
    posts, problems = [], []
    for path in sorted(QUEUE_DIR.glob("*.json")):
        try:
            posts.append(parse_post(json.loads(path.read_text(encoding="utf-8")), path))
        except (PostError, json.JSONDecodeError) as exc:
            problems.append(f"{path.name}: {exc}")
    ids = [p.id for p in posts]
    for dup in {i for i in ids if ids.count(i) > 1}:
        problems.append(f"post id '{dup}' is used by more than one file")
    posts.sort(key=lambda p: p.publish_after)
    return posts, problems
