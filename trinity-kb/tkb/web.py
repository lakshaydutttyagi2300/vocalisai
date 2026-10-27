"""Controlled, resumable ingestion of the official Trinity College London website.

Rules enforced in code:
* Only hosts in `web_allowed_hosts` are fetched (default: www.trinitycollege.com).
* robots.txt is fetched first; if it cannot be checked, nothing is crawled.
* Disallowed URLs, `noindex` pages, login/account/portal paths are skipped and recorded.
* 401/403/CAPTCHA responses are recorded for manual review - never bypassed.
* At least `web_delay_seconds` (or the site's Crawl-delay, if larger) between requests.
* The queue lives in the database, so an interrupted run continues where it stopped.
"""
import json
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from urllib import robotparser
from urllib.parse import urldefrag, urljoin, urlparse

from . import db
from .extract import extract_pdf, html_to_extracted
from .ingest import norm_hash, write_passages

UA = "TrinitySupportKB/1.0 (personal support reference; polite crawler)"
SKIP_PATH = re.compile(r"(?i)/(login|log-in|signin|sign-in|account|my-account|portal|basket|cart|checkout|search|admin|wp-admin|user)(/|$)")
SKIP_EXT = re.compile(r"(?i)\.(jpg|jpeg|png|gif|svg|webp|mp3|mp4|mov|zip|css|js|ico|woff2?|ttf|xml|json)$")
MAX_BYTES = 25 * 1024 * 1024


class CrawlBlocked(Exception):
    pass


class RequestsFetcher:
    def __init__(self, contact=""):
        import requests
        self.s = requests.Session()
        self.s.headers["User-Agent"] = UA + (f" contact: {contact}" if contact else "")

    def get(self, url, headers=None):
        r = self.s.get(url, headers=headers or {}, timeout=30, allow_redirects=True, stream=True)
        content = r.raw.read(MAX_BYTES + 1, decode_content=True) if r.status_code == 200 else b""
        return r.status_code, {k.lower(): v for k, v in r.headers.items()}, content, r.url


def _allowed_host(url, hosts):
    return urlparse(url).scheme in ("http", "https") and urlparse(url).netloc.lower() in hosts


def normalise(url):
    url = urldefrag(url)[0]
    p = urlparse(url)
    path = p.path or "/"
    return f"{p.scheme}://{p.netloc.lower()}{path}" + (f"?{p.query}" if p.query else "")


def _add(conn, url, depth, via):
    conn.execute("INSERT OR IGNORE INTO web_pages(url,state,depth,via,discovered_at,kind) VALUES(?,?,?,?,?,?)",
                 (url, "pending", depth, via, db.now(), "pdf" if url.lower().endswith(".pdf") else "html"))


def _err(conn, job, target, msg):
    conn.execute("INSERT INTO job_errors(job_id,target,message,at) VALUES(?,?,?,?)", (job, target, msg, db.now()))


def run_update(conn, fetcher=None, sleep=time.sleep, max_pages=None, refresh=False, progress=None) -> dict:
    s = db.all_settings(conn)
    if not s["web_terms_reviewed"]:
        raise CrawlBlocked("Website updating is switched off until you confirm in Settings that you have reviewed "
                           "the site's terms of use and are happy for pages to be stored for personal reference.")
    fetcher = fetcher or RequestsFetcher(s["web_contact"])
    hosts = [h.lower() for h in s["web_allowed_hosts"]]
    base = s["web_base_url"]
    job = conn.execute("INSERT INTO jobs(kind,started_at,status) VALUES('web',?,'running')", (db.now(),)).lastrowid
    conn.commit()
    stats = {"fetched": 0, "updated": 0, "unchanged": 0, "new": 0, "skipped": 0, "failed": 0, "manual": 0, "duplicate": 0}

    # 1. robots.txt
    robots_url = urljoin(base, "/robots.txt")
    try:
        status, headers, body, _ = fetcher.get(robots_url)
    except Exception as e:
        _finish(conn, job, "failed", f"Could not reach robots.txt ({type(e).__name__}); nothing was crawled.")
        _err(conn, job, robots_url, f"Network error: {type(e).__name__}")
        conn.commit()
        return {"status": "failed", "message": "Could not reach the website to check robots.txt. Nothing was crawled.", **stats}
    rp = robotparser.RobotFileParser()
    if status == 200:
        rp.parse(body.decode("utf-8", "replace").splitlines())
    elif status in (401, 403):
        rp.parse(["User-agent: *", "Disallow: /"])
    elif 400 <= status < 500:
        rp.parse([])  # no robots.txt: everything allowed (RFC 9309)
    else:
        _finish(conn, job, "failed", f"robots.txt returned HTTP {status}; nothing was crawled.")
        conn.commit()
        return {"status": "failed", "message": f"robots.txt returned HTTP {status}. Nothing was crawled.", **stats}
    delay = max(float(s["web_delay_seconds"]), float(rp.crawl_delay(UA) or 0))
    db.set_setting(conn, "web_robots_checked_at", db.now())
    db.set_setting(conn, "web_robots_status", status)

    # 2. sitemaps (only on first run or refresh)
    have_any = conn.execute("SELECT COUNT(*) FROM web_pages").fetchone()[0]
    if refresh or not have_any:
        sitemaps = list(rp.site_maps() or []) or [urljoin(base, "/sitemap.xml")]
        found = _read_sitemaps(conn, fetcher, sitemaps, hosts, rp, sleep, delay, job)
        db.set_setting(conn, "web_sitemap_urls", found)
        _add(conn, normalise(base), 0, "start")
    if refresh:
        cutoff = (datetime.now(timezone.utc) - timedelta(days=s["web_recheck_days"])).isoformat()
        conn.execute("UPDATE web_pages SET state='pending' WHERE state IN ('done','failed') AND COALESCE(verified_at,'') < ?", (cutoff,))
    conn.commit()

    # 3. process the queue
    limit = max_pages or s["web_max_pages_per_run"]
    while stats["fetched"] < limit:
        row = conn.execute("SELECT * FROM web_pages WHERE state='pending' ORDER BY depth, rowid LIMIT 1").fetchone()
        if not row:
            break
        url = row["url"]
        if not _allowed_host(url, hosts):
            _mark(conn, url, "skipped", note="Not on the official website host.")
            stats["skipped"] += 1; continue
        if not rp.can_fetch(UA, url):
            _mark(conn, url, "skipped", note="Disallowed by robots.txt.")
            stats["skipped"] += 1; continue
        if SKIP_PATH.search(urlparse(url).path) or SKIP_EXT.search(urlparse(url).path):
            _mark(conn, url, "skipped", note="Login/account/portal or non-document URL - not collected.")
            stats["skipped"] += 1; continue
        if stats["fetched"]:
            sleep(delay)
        stats["fetched"] += 1
        if progress:
            progress(stats["fetched"], url)
        try:
            _process(conn, fetcher, row, s, hosts, stats, job)
        except Exception as e:
            conn.execute("UPDATE web_pages SET state='failed', attempts=attempts+1, note=? WHERE url=?",
                         (f"Error: {type(e).__name__}", url))
            _err(conn, job, url, f"{type(e).__name__}: {str(e)[:200]}")
            stats["failed"] += 1
        conn.commit()
    pending = conn.execute("SELECT COUNT(*) FROM web_pages WHERE state='pending'").fetchone()[0]
    summary = ", ".join(f"{k}: {v}" for k, v in stats.items()) + f"; still pending: {pending}"
    _finish(conn, job, "completed" if not pending else "partial", summary)
    if stats["new"] or stats["updated"] or stats["unchanged"]:
        db.set_setting(conn, "web_last_success", db.now())
    conn.commit()
    return {"status": "completed" if not pending else "partial", "pending": pending, "message": summary, **stats}


def _finish(conn, job, status, summary):
    conn.execute("UPDATE jobs SET finished_at=?, status=?, summary=? WHERE id=?", (db.now(), status, summary, job))


def _mark(conn, url, state, note=None, http=None):
    conn.execute("UPDATE web_pages SET state=?, note=?, http_status=COALESCE(?,http_status), fetched_at=? WHERE url=?",
                 (state, note, http, db.now(), url))


def _read_sitemaps(conn, fetcher, urls, hosts, rp, sleep, delay, job, depth=0):
    count, seen = 0, set()
    queue = [(u, 0) for u in urls]
    while queue and len(seen) < 200:
        sm, d = queue.pop(0)
        if sm in seen or not _allowed_host(sm, hosts) or not rp.can_fetch(UA, sm):
            continue
        seen.add(sm)
        if len(seen) > 1:
            sleep(delay)
        try:
            status, headers, body, _ = fetcher.get(sm)
            if status != 200:
                _err(conn, job, sm, f"Sitemap returned HTTP {status}"); continue
            if sm.endswith(".gz"):
                import gzip
                body = gzip.decompress(body)
            root = ET.fromstring(body)
        except Exception as e:
            _err(conn, job, sm, f"Sitemap could not be read: {type(e).__name__}"); continue
        ns = re.match(r"\{.*\}", root.tag)
        ns = ns.group(0) if ns else ""
        locs = [e.text.strip() for e in root.iter(f"{ns}loc") if e.text]
        if root.tag.endswith("sitemapindex"):
            if d < 3:
                queue += [(l, d + 1) for l in locs]
        else:
            for l in locs:
                u = normalise(l)
                if _allowed_host(u, hosts):
                    _add(conn, u, 0, "sitemap"); count += 1
    return count


def _process(conn, fetcher, row, s, hosts, stats, job):
    url = row["url"]
    headers = {}
    if row["etag"]:
        headers["If-None-Match"] = row["etag"]
    if row["last_modified"]:
        headers["If-Modified-Since"] = row["last_modified"]
    status, h, body, final = fetcher.get(url, headers)
    if status == 304:
        conn.execute("UPDATE web_pages SET state='done', verified_at=?, http_status=304 WHERE url=?", (db.now(), url))
        if row["source_id"]:
            conn.execute("UPDATE sources SET verified_at=? WHERE id=?", (db.now(), row["source_id"]))
        stats["unchanged"] += 1; return
    if status in (401, 403, 407) or (status == 200 and _looks_like_challenge(body)):
        _mark(conn, url, "manual", "Access restricted or challenge page (e.g. CAPTCHA). Not bypassed - check manually.", status)
        _err(conn, job, url, f"Restricted (HTTP {status})")
        stats["manual"] += 1; return
    if status in (404, 410):
        _mark(conn, url, "failed", "Page not found on the website.", status)
        if row["source_id"]:
            conn.execute("UPDATE sources SET active=0, status='failed', warnings=? WHERE id=?",
                         (json.dumps([f"Page returned HTTP {status} on {db.now()[:10]}; hidden from search."]), row["source_id"]))
        stats["failed"] += 1; return
    if status != 200:
        conn.execute("UPDATE web_pages SET state='failed', attempts=attempts+1, http_status=?, note=?, fetched_at=? WHERE url=?",
                     (status, f"HTTP {status}", db.now(), url))
        _err(conn, job, url, f"HTTP {status}")
        stats["failed"] += 1; return
    if len(body) > MAX_BYTES:
        _mark(conn, url, "manual", "File larger than 25 MB - not downloaded.", status); stats["manual"] += 1; return
    final = normalise(final or url)
    if final != url and not _allowed_host(final, hosts):
        _mark(conn, url, "skipped", f"Redirects off the official site to {urlparse(final).netloc}.", status)
        stats["skipped"] += 1; return
    ctype = h.get("content-type", "").lower()
    xrobots = h.get("x-robots-tag", "").lower()
    if "pdf" in ctype or url.lower().endswith(".pdf"):
        ex = extract_pdf(body)
        kind, links = "pdf", []
    elif "html" in ctype or not ctype:
        html = body.decode(_charset(ctype), "replace")
        meta = re.search(r"<meta[^>]+name=[\"']robots[\"'][^>]*content=[\"']([^\"']+)", html, re.I)
        robots_meta = (meta.group(1).lower() if meta else "") + " " + xrobots
        links = [] if "nofollow" in robots_meta else _links(html, final, hosts)
        if row["depth"] < s["web_max_depth"]:
            for l in links:
                _add(conn, l, row["depth"] + 1, url)
        if "noindex" in robots_meta:
            _mark(conn, url, "skipped", "Page asks not to be indexed (noindex).", status)
            stats["skipped"] += 1; return
        ex = html_to_extracted(html, full_text=s["web_store_full_text"])
        kind = "html"
    else:
        _mark(conn, url, "skipped", f"Unsupported content type '{ctype[:40]}'.", status)
        stats["skipped"] += 1; return
    if not ex.passages:
        _mark(conn, url, "manual", "No readable text extracted (page may rely on scripts or images).", status)
        stats["manual"] += 1; return
    chash = norm_hash(" ".join(p["text"] for p in ex.passages))
    dup = conn.execute("SELECT url FROM web_pages WHERE content_hash=? AND url!=? AND state='done'", (chash, url)).fetchone()
    if dup:
        conn.execute("UPDATE web_pages SET state='duplicate', duplicate_of=?, content_hash=?, http_status=?, fetched_at=?, note=? WHERE url=?",
                     (dup["url"], chash, status, db.now(), "Same content as another indexed page.", url))
        stats["duplicate"] += 1; return
    now = db.now()
    src = conn.execute("SELECT * FROM sources WHERE kind='web' AND name=?", (url,)).fetchone()
    title = ex.title or (ex.passages[0]["heading"] if ex.passages else None)
    warnings = json.dumps(ex.warnings)
    if src and src["checksum"] == chash:
        conn.execute("UPDATE sources SET verified_at=?, active=1 WHERE id=?", (now, src["id"]))
        sid = src["id"]; stats["unchanged"] += 1
    else:
        if src:
            sid = src["id"]
            conn.execute("UPDATE sources SET title=?, checksum=?, verified_at=?, imported_at=?, status=?, warnings=?, version=version+1, active=1 WHERE id=?",
                         (title, chash, now, now, "ok_with_warnings" if ex.warnings else "ok", warnings, sid))
            db.delete_source_passages(conn, sid); stats["updated"] += 1
        else:
            sid = conn.execute("""INSERT INTO sources(kind,category,name,title,location,checksum,imported_at,verified_at,status,warnings,page_count,unit_count)
                                  VALUES('web','A',?,?,?,?,?,?,?,?,?,?)""",
                               (url, title, url, chash, now, now, "ok_with_warnings" if ex.warnings else "ok", warnings,
                                ex.page_count, ex.unit_count)).lastrowid
            stats["new"] += 1
        write_passages(conn, sid, title or url, ex.passages)
        ver = conn.execute("SELECT version FROM sources WHERE id=?", (sid,)).fetchone()[0]
        conn.execute("INSERT INTO source_versions(source_id,version,checksum,recorded_at,note) VALUES(?,?,?,?,?)",
                     (sid, ver, chash, now, "web change detected" if src else "first retrieval"))
    conn.execute("""UPDATE web_pages SET state='done', source_id=?, kind=?, http_status=?, fetched_at=?, verified_at=?,
                    content_hash=?, etag=?, last_modified=?, note=NULL WHERE url=?""",
                 (sid, kind, status, now, now, chash, h.get("etag"), h.get("last-modified"), url))


def _charset(ctype):
    m = re.search(r"charset=([\w-]+)", ctype)
    return m.group(1) if m else "utf-8"


def _looks_like_challenge(body: bytes) -> bool:
    head = body[:4000].lower()
    return any(k in head for k in (b"captcha", b"cf-challenge", b"are you a robot", b"verify you are human"))


def _links(html, base, hosts):
    out = set()
    for href in re.findall(r"""<a\s[^>]*href=["']([^"'#]+)""", html, re.I):
        if href.startswith(("mailto:", "tel:", "javascript:")):
            continue
        u = normalise(urljoin(base, href.strip()))
        if _allowed_host(u, hosts) and not SKIP_EXT.search(urlparse(u).path) and "?" not in u:
            out.add(u)
    return sorted(out)


def coverage_report(conn) -> dict:
    counts = {r["state"]: r["n"] for r in conn.execute("SELECT state, COUNT(*) n FROM web_pages GROUP BY state")}
    total = sum(counts.values())
    s = db.all_settings(conn)
    limits = [
        "Only pages discoverable from the site's sitemap and from links on collected pages can be found; "
        "pages that are not linked anywhere public cannot be known.",
        "Pages behind logins, portals, CAPTCHAs or robots.txt restrictions are never collected.",
        "Content loaded only by JavaScript, or text inside images/video, may be missing.",
        "Collected text is a snapshot; check the live page (link shown with every result) before relying on it.",
    ]
    if not s.get("web_terms_reviewed"):
        limits.insert(0, "Website collection has not been enabled yet (terms-of-use confirmation pending in Settings).")
    if not s.get("web_store_full_text"):
        limits.insert(0, "Full-text storage is OFF: only titles, headings and short excerpts are stored.")
    if not total:
        limits.insert(0, "No website pages have been collected yet. Official information is NOT available offline.")
    pending = counts.get("pending", 0)
    verdict = ("Not started" if not total else
               "Incomplete - pages are still awaiting indexing" if pending else
               "All discovered pages have been attempted (this does not prove every page on the website was discovered)")
    return {
        "discovered": total, "processed": counts.get("done", 0), "skipped": counts.get("skipped", 0),
        "failed": counts.get("failed", 0), "manual": counts.get("manual", 0), "duplicate": counts.get("duplicate", 0),
        "pending": pending, "last_success": s.get("web_last_success"), "sitemap_urls": s.get("web_sitemap_urls"),
        "robots_checked": s.get("web_robots_checked_at"), "verdict": verdict, "limitations": limits,
        "problems": [dict(r) for r in conn.execute(
            "SELECT url,state,http_status,note,duplicate_of FROM web_pages WHERE state IN ('failed','manual','skipped','duplicate') ORDER BY state,url LIMIT 1000")],
    }
