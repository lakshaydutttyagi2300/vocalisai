"""Tiny Cloudflare R2 (S3-compatible) client: presigned PUT/GET URLs with AWS Signature V4.

Uses the same R2_* variables as the VocalisAi app. Media for Instagram is uploaded under
`social-autopilot/` and shared with Instagram through a short-lived signed GET URL, so the
bucket itself stays private.
"""
from __future__ import annotations

import hashlib
import hmac
import os
from datetime import datetime, timezone
from urllib.parse import quote

import requests

PREFIX = "social-autopilot/"


def configured() -> bool:
    return all(os.environ.get(k) for k in ("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME"))


def _sign(key: bytes, msg: str) -> bytes:
    return hmac.new(key, msg.encode(), hashlib.sha256).digest()


def presign(method: str, key: str, expires: int = 3600) -> str:
    bucket = os.environ["R2_BUCKET_NAME"]
    return sigv4_url(
        method, f"{os.environ['R2_ACCOUNT_ID']}.r2.cloudflarestorage.com", f"/{bucket}/{key}", "auto",
        os.environ["R2_ACCESS_KEY_ID"], os.environ["R2_SECRET_ACCESS_KEY"], datetime.now(timezone.utc), expires,
    )


def sigv4_url(method: str, host: str, raw_path: str, region: str, access: str, secret: str,
              now: datetime, expires: int) -> str:
    """Query-string-signed S3 URL (AWS SigV4). Checked against AWS's published example in tests."""
    amz_date, date = now.strftime("%Y%m%dT%H%M%SZ"), now.strftime("%Y%m%d")
    service = "s3"
    scope = f"{date}/{region}/{service}/aws4_request"
    path = quote(raw_path, safe="/-_.~")
    params = {
        "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
        "X-Amz-Credential": f"{access}/{scope}",
        "X-Amz-Date": amz_date,
        "X-Amz-Expires": str(expires),
        "X-Amz-SignedHeaders": "host",
    }
    query = "&".join(f"{quote(k, safe='-_.~')}={quote(v, safe='-_.~')}" for k, v in sorted(params.items()))
    canonical = "\n".join([method, path, query, f"host:{host}\n", "host", "UNSIGNED-PAYLOAD"])
    to_sign = "\n".join(["AWS4-HMAC-SHA256", amz_date, scope, hashlib.sha256(canonical.encode()).hexdigest()])
    k = _sign(("AWS4" + secret).encode(), date)
    for part in (region, service, "aws4_request"):
        k = _sign(k, part)
    signature = hmac.new(k, to_sign.encode(), hashlib.sha256).hexdigest()
    return f"https://{host}{path}?{query}&X-Amz-Signature={signature}"


def put_bytes(key: str, data: bytes, content_type: str) -> None:
    r = requests.put(presign("PUT", PREFIX + key, 600), data=data, headers={"Content-Type": content_type}, timeout=120)
    r.raise_for_status()


def get_bytes(key: str) -> bytes | None:
    r = requests.get(presign("GET", PREFIX + key, 600), timeout=60)
    if r.status_code == 404:
        return None
    r.raise_for_status()
    return r.content


def public_url(key: str, expires: int = 3600) -> str:
    """A signed link Instagram can download the file from (valid for `expires` seconds)."""
    return presign("GET", PREFIX + key, expires)
