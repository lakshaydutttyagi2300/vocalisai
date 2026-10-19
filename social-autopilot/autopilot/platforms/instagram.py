"""Instagram via the official "Instagram API with Instagram Login" (graph.instagram.com).

Needs a Business or Creator account and a long-lived Instagram user token with the
permissions instagram_business_basic, instagram_business_content_publish and
instagram_business_manage_comments. Tokens last 60 days; refresh_token() renews them.
Docs: https://developers.facebook.com/docs/instagram-platform/content-publishing
"""
from __future__ import annotations

import time

import requests

from . import PlatformError

API = "https://graph.instagram.com/v25.0"


class Instagram:
    def __init__(self, token: str):
        self.token = token
        self._user_id: str | None = None
        self.username = ""

    # ---------- low level ----------
    def _call(self, method: str, path: str, **params) -> dict:
        params["access_token"] = self.token
        url = path if path.startswith("http") else f"{API}/{path.lstrip('/')}"
        r = requests.request(method, url, params=params if method == "GET" else None,
                             data=params if method != "GET" else None, timeout=60)
        try:
            body = r.json()
        except ValueError:
            body = {}
        if r.status_code >= 400 or "error" in body:
            err = body.get("error", {}) if isinstance(body, dict) else {}
            raise PlatformError(f"Instagram said: {err.get('message') or r.text[:200]} (code {err.get('code', r.status_code)})")
        return body

    @property
    def user_id(self) -> str:
        if not self._user_id:
            me = self._call("GET", "me", fields="user_id,username")
            self._user_id, self.username = str(me.get("user_id") or me["id"]), me.get("username", "")
        return self._user_id

    def _wait(self, container_id: str, timeout_s: int = 600) -> None:
        deadline = time.time() + timeout_s
        while True:
            status = self._call("GET", container_id, fields="status_code,status").get("status_code")
            if status in ("FINISHED", "PUBLISHED"):
                return
            if status in ("ERROR", "EXPIRED"):
                info = self._call("GET", container_id, fields="status").get("status", "")
                raise PlatformError(f"Instagram could not process the media ({status}: {info})")
            if time.time() > deadline:
                raise PlatformError("Instagram took too long to process the media")
            time.sleep(15)

    # ---------- publishing ----------
    def publish_carousel(self, image_urls: list[str], caption: str) -> str:
        children = []
        for url in image_urls[:10]:
            c = self._call("POST", f"{self.user_id}/media", image_url=url, is_carousel_item="true")
            children.append(c["id"])
        for cid in children:
            self._wait(cid, 180)
        parent = self._call("POST", f"{self.user_id}/media", media_type="CAROUSEL",
                            children=",".join(children), caption=caption)
        self._wait(parent["id"], 180)
        return self._call("POST", f"{self.user_id}/media_publish", creation_id=parent["id"])["id"]

    def publish_reel(self, video_url: str, cover_url: str, caption: str) -> str:
        c = self._call("POST", f"{self.user_id}/media", media_type="REELS", video_url=video_url,
                       cover_url=cover_url, caption=caption, share_to_feed="true")
        self._wait(c["id"], 600)
        return self._call("POST", f"{self.user_id}/media_publish", creation_id=c["id"])["id"]

    def publishing_quota_left(self) -> int | None:
        try:
            data = self._call("GET", f"{self.user_id}/content_publishing_limit", fields="quota_usage,config")
            item = data["data"][0]
            return int(item["config"]["quota_total"]) - int(item["quota_usage"])
        except (PlatformError, KeyError, IndexError, ValueError):
            return None

    # ---------- engagement ----------
    def recent_comments(self, limit_posts: int = 8) -> list[dict]:
        out = []
        media = self._call("GET", f"{self.user_id}/media", fields="id,timestamp", limit=limit_posts).get("data", [])
        for m in media:
            data = self._call("GET", f"{m['id']}/comments", fields="id,text,username,timestamp,replies{username}", limit=50)
            for c in data.get("data", []):
                already = any(r.get("username") == self.username for r in c.get("replies", {}).get("data", []))
                out.append({"id": c["id"], "text": c.get("text", ""), "username": c.get("username", ""),
                            "media_id": m["id"], "answered": already})
        return out

    def reply(self, comment_id: str, text: str) -> None:
        self._call("POST", f"{comment_id}/replies", message=text[:2000])

    # ---------- token ----------
    def refresh_token(self) -> str:
        """Returns a fresh 60-day token (the current one must be at least 24 hours old)."""
        data = self._call("GET", "https://graph.instagram.com/refresh_access_token", grant_type="ig_refresh_token")
        return data["access_token"]
