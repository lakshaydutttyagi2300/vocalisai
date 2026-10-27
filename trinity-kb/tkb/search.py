"""Local full-text search (SQLite FTS5 / BM25) with filters, citations and previews."""
import html
import re

from . import db
from .config import CATEGORIES
from .ingest import REF_RE, shape

STOP = set("""a an and are as at be been but by can could did do does for from had has have how i if in into is it its
me my no not of on or our please should so than that the their them then there these they this to was we were what
when where which who why will with would you your hi hello dear thanks thank regards kind""".split())
EMAIL_RE = re.compile(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+")
WORD_RE = re.compile(r"[A-Za-z0-9][A-Za-z0-9'&]*")


def parse_query(q: str) -> dict:
    """Split a query into phrases, emails, reference-like tokens and plain words."""
    phrases = re.findall(r'"([^"]+)"', q)
    rest = re.sub(r'"[^"]*"', " ", q)
    emails = EMAIL_RE.findall(rest)
    rest = EMAIL_RE.sub(" ", rest)
    refs = REF_RE.findall(rest)
    rest = REF_RE.sub(" ", rest)
    words = [w.lower().strip("'") for w in WORD_RE.findall(rest)]
    words = [w for w in words if w]
    return {"phrases": phrases, "emails": emails, "refs": refs, "words": words,
            "terms": [w for w in words if w not in STOP and len(w) > 1]}


def _q(s: str) -> str:
    return '"' + s.replace('"', '""') + '"'


def fts_expression(parsed: dict, mode: str = "and") -> str | None:
    must = [_q(p) for p in parsed["phrases"]] + [_q(e) for e in parsed["emails"]]
    refs = [f"({_q(r)} OR shapes:{_q(shape(r))})" for r in parsed["refs"]]
    words = [_q(w) + "*" if len(w) > 3 else _q(w) for w in parsed["terms"]]
    if mode == "and":
        parts = must + refs + words
        return " AND ".join(parts) if parts else None
    optional = refs + words
    if must:
        return " AND ".join(must) + (" AND (" + " OR ".join(optional) + ")" if optional else "")
    return " OR ".join(optional) if optional else None


def search(conn, q: str, categories=None, source_ids=None, qualification=None, heading=None,
           date_from=None, kind=None, limit=None, record=True) -> list[dict]:
    q = (q or "").strip()
    limit = limit or db.get_setting(conn, "search_limit")
    parsed = parse_query(q)
    shape_only = re.fullmatch(r"(?i)format:\s*(\S+)", q)
    results = []
    for mode in ("and", "or"):
        if shape_only:
            expr = f"shapes:{_q(shape(shape_only.group(1)))}"
        else:
            expr = fts_expression(parsed, mode)
        if not expr:
            break
        results = _run(conn, expr, categories, source_ids, qualification, heading, date_from, kind, limit)
        if len(results) >= 3 or shape_only:
            break
    terms = parsed["terms"] + parsed["phrases"] + parsed["emails"] + parsed["refs"]
    for r in results:
        r["preview"] = preview(r["text"], terms)
        r["coverage"] = coverage(parsed["terms"], r["text"] + " " + (r["heading"] or "") + " " + (r["title"] or ""))
    if record and q:
        conn.execute("INSERT INTO search_history(query,at,result_count) VALUES(?,?,?)", (q[:300], db.now(), len(results)))
        conn.commit()
    return results


def _run(conn, expr, categories, source_ids, qualification, heading, date_from, kind, limit):
    prec = db.get_setting(conn, "precedence") or list(CATEGORIES)
    sql = ["""SELECT p.*, s.name, s.title, s.category, s.kind, s.location, s.verified_at, s.imported_at, s.file_mtime,
                     s.stored_path, s.version, bm25(passages_fts, 1.0, 2.0, 1.5, 3.0) AS score
              FROM passages_fts JOIN passages p ON p.id = passages_fts.rowid JOIN sources s ON s.id = p.source_id
              WHERE passages_fts MATCH ? AND s.active=1"""]
    args = [expr]
    if categories:
        sql.append(f"AND s.category IN ({','.join('?' * len(categories))})"); args += list(categories)
    if source_ids:
        sql.append(f"AND s.id IN ({','.join('?' * len(source_ids))})"); args += [int(i) for i in source_ids]
    if qualification:
        sql.append("AND (p.text LIKE ? OR p.heading LIKE ? OR s.name LIKE ? OR s.title LIKE ?)"); args += [f"%{qualification}%"] * 4
    if heading:
        sql.append("AND p.heading LIKE ?"); args.append(f"%{heading}%")
    if date_from:
        sql.append("AND COALESCE(s.verified_at, s.imported_at) >= ?"); args.append(date_from)
    if kind:
        sql.append("AND s.kind = ?"); args.append(kind)
    sql.append("ORDER BY score LIMIT ?"); args.append(limit * 3)
    try:
        rows = [dict(r) for r in conn.execute(" ".join(sql), args)]
    except Exception:
        return []
    # gentle precedence tie-break: at most 10% of the relevance score
    for r in rows:
        rank = prec.index(r["category"]) if r["category"] in prec else len(prec)
        r["rank_score"] = r["score"] * (1 - 0.1 * (len(prec) - rank) / len(prec))
    rows.sort(key=lambda r: r["rank_score"])
    return rows[:limit]


def stem(w: str) -> str:
    for suf in ("ing", "ed", "es", "s"):
        if len(w) > len(suf) + 3 and w.endswith(suf):
            return w[: -len(suf)]
    return w


def coverage(terms, text) -> float:
    if not terms:
        return 0.0
    low = text.lower()
    return sum(1 for t in set(terms) if stem(t) in low) / len(set(terms))


def preview(text: str, terms, width: int = 420) -> str:
    """HTML-escaped preview centred on the first match, with matches highlighted."""
    low = text.lower()
    pos = min([low.find(stem(t.lower())) for t in terms if low.find(stem(t.lower())) >= 0] or [0])
    start = max(0, pos - width // 3)
    frag = text[start:start + width]
    out = html.escape(frag)
    for t in sorted({stem(t.lower()) for t in terms if len(t) > 1}, key=len, reverse=True):
        out = re.sub(f"(?i)({re.escape(html.escape(t))}\\w*)", r"<mark>\1</mark>", out)
    return ("&hellip;" if start else "") + out + ("&hellip;" if start + width < len(text) else "")


def citation(r: dict) -> dict:
    """Build a citation using only the fields that actually exist. Never invents locations."""
    c = {"category": r["category"], "category_label": CATEGORIES.get(r["category"], r["category"])}
    if r["kind"] == "web":
        c["label"] = r.get("title") or "(page title not available)"
        c["url"] = r["location"]
        c["heading"] = r.get("heading")
        c["verified"] = (r.get("verified_at") or "")[:10] or "not recorded"
        c["text"] = f"{c['label']} - {c['url']}" + (f" - section '{c['heading']}'" if c["heading"] else "") + f" (last verified {c['verified']})"
        return c
    parts = [r["name"]]
    if r.get("page"):
        parts.append(f"page {r['page']}")
    if r.get("sheet"):
        parts.append(f"worksheet '{r['sheet']}'")
    if r.get("cell_ref"):
        parts.append(f"cells {r['cell_ref']}")
    if r.get("heading") and not r.get("sheet"):
        parts.append(f"section '{r['heading']}'")
    if len(parts) == 1:
        parts.append("(no page or section reference available)")
    c["label"] = r["name"]
    c["text"] = ", ".join(parts) + f" [{c['category_label']}]"
    c["date"] = (r.get("file_mtime") or r.get("imported_at") or "")[:10]
    return c
