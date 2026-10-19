"""Command line entry point (used by GitHub Actions and by Claude).

    python -m autopilot.run check                 # validate the queue and show what's next
    python -m autopilot.run render <post-id|next> # render media into ./out to look at
    python -m autopilot.run post [--dry-run]      # publish the next due post
    python -m autopilot.run engage [--dry-run]    # reply to new comments
    python -m autopilot.run refresh-token         # renew the Instagram token (weekly)
"""
from __future__ import annotations

import argparse
import hashlib
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from . import r2, state as st, writer
from .brand import ROOT
from .platforms import PlatformError
from .platforms.instagram import Instagram
from .post import Post, load_queue
from .reel import render_reel
from .render import render_carousel

IST = timezone(timedelta(hours=5, minutes=30))
OUT = ROOT / "out"
MAX_REPLIES_PER_RUN = 25


def now() -> datetime:
    return datetime.now(IST)


def say(msg: str) -> None:
    print(msg, flush=True)


# ---------- token handling ----------

def _token(state: dict) -> str | None:
    """The env token seeds the state; a newer env token (owner reconnected) always wins."""
    env = os.environ.get("IG_ACCESS_TOKEN", "").strip()
    rec = state["tokens"].get("instagram", {})
    env_hash = hashlib.sha256(env.encode()).hexdigest()[:16] if env else ""
    if env and rec.get("seed") != env_hash:
        state["tokens"]["instagram"] = {"value": env, "seed": env_hash, "refreshed_at": now().isoformat()}
        return env
    return rec.get("value") or env or None


# ---------- choosing what to post ----------

def next_due(state: dict, at: datetime) -> Post | None:
    posts, problems = load_queue()
    for p in problems:
        say(f"! skipped broken queue file - {p}")
    for p in posts:
        if p.id not in state["posted"] and p.publish_after <= at:
            return p
    return None


def recent_hooks(state: dict) -> list[str]:
    posts, _ = load_queue()
    return [v.get("hook", "") for v in state["posted"].values()] + [p.hook for p in posts]


def last_post_time(state: dict) -> datetime | None:
    times = [datetime.fromisoformat(v["at"]) for v in state["posted"].values() if v.get("at")]
    return max(times) if times else None


def choose_post(state: dict) -> Post | None:
    at = now()
    last = last_post_time(state)
    if last and at - last < timedelta(hours=5):
        say("Posted less than 5 hours ago - skipping so the page never double-posts.")
        return None
    # Due posts first; otherwise pull the next queued post forward (up to 3 days early) so the
    # page posts every slot with hand-written content before falling back to the AI writer.
    post = next_due(state, at) or next_due(state, at + timedelta(days=3))
    if post:
        return post
    if not writer.available():
        say("Queue is empty and GEMINI_API_KEY is not set - nothing to post.")
        return None
    fmt = "reel" if at.hour < 15 else "carousel"
    say(f"Queue is empty - asking Gemini for a new {fmt}.")
    return writer.write_post(fmt, at, recent_hooks(state))


# ---------- commands ----------

def cmd_check(_args) -> int:
    posts, problems = load_queue()
    state = st.load()
    upcoming = [p for p in posts if p.id not in state["posted"]]
    say(f"Queue: {len(posts)} valid file(s), {len(upcoming)} not yet posted, {len(problems)} problem(s).")
    for p in problems:
        say(f"  ! {p}")
    for p in upcoming[:6]:
        say(f"  next: {p.publish_after:%a %d %b %H:%M} IST  {p.format:8} {p.id}")
    if upcoming:
        days_left = (upcoming[-1].publish_after - now()).days
        say(f"Queue covers about {max(days_left, 0)} more day(s).")
    say("Config: " + ", ".join(f"{k}={'yes' if v else 'NO'}" for k, v in {
        "Instagram token": bool(os.environ.get("IG_ACCESS_TOKEN")),
        "R2 storage": r2.configured(),
        "Gemini": writer.available(),
    }.items()))
    return 1 if problems else 0


def render(post: Post, out: Path) -> dict:
    if post.format == "reel":
        video, cover = render_reel(post, out)
        return {"video": video, "cover": cover}
    return {"images": render_carousel(post, out)}


def cmd_render(args) -> int:
    posts, problems = load_queue()
    if args.post_id == "next":
        post = next_due(st.load(), now() + timedelta(days=365))
    else:
        post = next((p for p in posts if p.id == args.post_id), None)
    if not post:
        say("No such post." + (f" Problems: {problems}" if problems else ""))
        return 1
    media = render(post, OUT / post.id)
    say(f"Rendered {post.id}: {media}")
    return 0


def upload(post: Post, media: dict) -> dict:
    stamp = now().strftime("%Y%m%d%H%M%S")
    urls = {}
    if "video" in media:
        for name, ctype in (("video", "video/mp4"), ("cover", "image/jpeg")):
            key = f"media/{post.id}/{stamp}-{media[name].name}"
            r2.put_bytes(key, media[name].read_bytes(), ctype)
            urls[name] = r2.public_url(key, 6 * 3600)
    else:
        urls["images"] = []
        for path in media["images"]:
            key = f"media/{post.id}/{stamp}-{path.name}"
            r2.put_bytes(key, path.read_bytes(), "image/jpeg")
            urls["images"].append(r2.public_url(key, 6 * 3600))
    return urls


def cmd_post(args) -> int:
    state = st.load()
    token = _token(state)
    dry = args.dry_run or not token or not r2.configured()
    post = choose_post(state)
    if not post:
        st.save(state)
        return 0
    say(f"Post: {post.id} ({post.format}) - {post.hook}")
    media = render(post, OUT / post.id)
    say(f"Rendered: {', '.join(str(p) for p in (media.get('images') or [media.get('video')]))}")
    if dry:
        say("DRY RUN - not publishing" + ("" if args.dry_run else " (Instagram token or R2 storage not set up yet)."))
        return 0
    ig = Instagram(token)
    left = ig.publishing_quota_left()
    if left is not None and left <= 0:
        say("Instagram's daily publishing limit is used up - will try next run.")
        return 0
    urls = upload(post, media)
    try:
        if post.format == "reel":
            media_id = ig.publish_reel(urls["video"], urls["cover"], post.full_caption())
        else:
            media_id = ig.publish_carousel(urls["images"], post.full_caption())
    except PlatformError as exc:
        state["log"].append({"at": now().isoformat(), "post": post.id, "error": str(exc)})
        st.save(state)
        say(f"FAILED: {exc}")
        return 1
    state["posted"][post.id] = {
        "at": now().isoformat(), "platform": "instagram", "media_id": media_id, "hook": post.hook,
        "format": post.format, "pillar": post.pillar, "keyword": post.comment_keyword,
        "keyword_reply": post.keyword_reply, "ai_written": post.source is None,
    }
    state["log"].append({"at": now().isoformat(), "post": post.id, "published": media_id})
    st.save(state)
    say(f"Published to Instagram: media id {media_id}")
    return 0


def cmd_engage(args) -> int:
    state = st.load()
    token = _token(state)
    if not token:
        say("Instagram token not set up yet - nothing to do.")
        return 0
    ig = Instagram(token)
    by_media = {v["media_id"]: v for v in state["posted"].values() if v.get("media_id")}
    replied = set(state["replied"])
    count = 0
    try:
        comments = ig.recent_comments()
    except PlatformError as exc:
        say(f"Could not read comments: {exc}")
        return 1
    for c in comments:
        if count >= MAX_REPLIES_PER_RUN:
            break
        if c["id"] in replied or c["answered"] or c["username"] == ig.username:
            continue
        info = by_media.get(c["media_id"], {})
        keyword = info.get("keyword", "")
        if keyword and keyword.lower() in c["text"].lower():
            text = info.get("keyword_reply") or "Here you go! 🎯 Try it free at vocalisai.vercel.app (link in bio)."
        elif writer.available():
            text = writer.write_reply(c["text"], info.get("hook", "job interview tips"))
        else:
            text = None
        state["replied"].append(c["id"])
        replied.add(c["id"])
        if not text:
            continue
        if args.dry_run:
            say(f"[dry run] would reply to @{c['username']}: {text}")
        else:
            try:
                ig.reply(c["id"], f"@{c['username']} {text}")
                count += 1
            except PlatformError as exc:
                say(f"Reply failed: {exc}")
    if not args.dry_run:
        st.save(state)
    say(f"Replied to {count} comment(s).")
    return 0


def cmd_refresh(_args) -> int:
    state = st.load()
    token = _token(state)
    if not token:
        say("Instagram token not set up yet.")
        return 0
    rec = state["tokens"]["instagram"]
    last = datetime.fromisoformat(rec.get("refreshed_at", "2000-01-01T00:00:00+05:30"))
    if now() - last < timedelta(days=6):
        say("Token refreshed recently - nothing to do.")
        st.save(state)
        return 0
    try:
        rec["value"] = Instagram(token).refresh_token()
        rec["refreshed_at"] = now().isoformat()
        say("Instagram token renewed for another 60 days.")
    except PlatformError as exc:
        say(f"Token refresh failed: {exc}")
        st.save(state)
        return 1
    st.save(state)
    return 0


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="autopilot")
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("check").set_defaults(fn=cmd_check)
    r = sub.add_parser("render")
    r.add_argument("post_id")
    r.set_defaults(fn=cmd_render)
    for name, fn in (("post", cmd_post), ("engage", cmd_engage)):
        p = sub.add_parser(name)
        p.add_argument("--dry-run", action="store_true")
        p.set_defaults(fn=fn)
    sub.add_parser("refresh-token").set_defaults(fn=cmd_refresh)
    args = ap.parse_args(argv)
    return args.fn(args)


if __name__ == "__main__":
    sys.exit(main())
