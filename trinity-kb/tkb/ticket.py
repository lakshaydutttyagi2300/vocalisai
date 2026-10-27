"""Ticket Assistant and Ticket Triage. Advisory only: nothing is sent, nothing is stored unless you save it."""
import re
from datetime import datetime, timezone

from . import db, llm
from .ingest import REF_RE, shape
from .search import EMAIL_RE, STOP, citation, coverage, parse_query, search, stem

OPENING = "Thank you for contacting Trinity College London."
INSUFFICIENT = "Insufficient verified information in the available knowledge base. Further verification is required."

ROLES = {
    "parent / guardian": r"\b(my (son|daughter|child|children)|parent|guardian|mum|mother|father|dad)\b",
    "teacher": r"\b(i am a teacher|i'm a teacher|my (students|pupils)|as a teacher|teacher)\b",
    "centre / school": r"\b(our centre|exam centre|centre representative|school|centre code|lar)\b",
    "candidate": r"\b(my exam|i (took|sat|booked|registered)|candidate)\b",
}
ACTIONS = {
    "booking / registration": r"\b(book|booking|register|registration|enter|entry|confirm)\w*",
    "cancellation / change": r"\b(cancel|reschedul|change (the )?date|transfer|withdraw)\w*",
    "refund / payment": r"\b(refund|payment|paid|charge|invoice|fee)\w*",
    "results": r"\b(result|marks?|grade awarded|mark sheet)\w*",
    "certificate": r"\b(certificate|replacement certificate)\w*",
    "recording / digital submission": r"\b(record(ing)?|upload|submit|submission|video|digital)\w*",
    "account / login": r"\b(log ?in|password|account|profile|portal)\w*",
    "syllabus / requirements": r"\b(syllabus|requirement|specification|repertoire|pieces|scales|criteria)\w*",
}
SYLLABUS_TOPIC = {"syllabus / requirements"}
DATE_RE = re.compile(r"\b(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\d{1,2}(st|nd|rd|th)? (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*( \d{4})?)\b", re.I)
NUM_UNIT = re.compile(r"(£\s?\d+(?:\.\d+)?|\d+(?:\.\d+)?)\s*(working days?|days?|weeks?|hours?|months?|minutes?|years?|%)?", re.I)


def analyse(conn, ticket: str, question: str = "") -> dict:
    text = f"{ticket}\n{question}"
    low = text.lower()
    qs = [s.strip() for s in re.split(r"(?<=[?])\s+|\n+", ticket) if s.strip().endswith("?")]
    main = question.strip() or (qs[0] if qs else _first_request(ticket))
    quals = [q for q in db.get_setting(conn, "qualifications") if re.search(rf"\b{re.escape(q.lower())}\b", low)]
    grade = re.findall(r"\bgrade\s*(\d{1,2}|initial)\b", low)
    return {
        "main_question": main,
        "role": [r for r, rx in ROLES.items() if re.search(rx, low)],
        "qualifications": quals + [f"Grade {g}" for g in dict.fromkeys(grade)],
        "references": list(dict.fromkeys(m for m in REF_RE.findall(text) if not m.isdigit() or len(m) >= 6)),
        "dates": list(dict.fromkeys(m[0] for m in DATE_RE.findall(text))),
        "email_count": len(set(EMAIL_RE.findall(text))),
        "actions": [a for a, rx in ACTIONS.items() if re.search(rx, low)],
    }


def _first_request(ticket):
    for s in re.split(r"(?<=[.!?])\s+|\n+", ticket):
        if re.search(r"\b(please|could you|can you|would like|need|want|help|how|when|why|what)\b", s, re.I):
            return s.strip()[:300]
    return ticket.strip()[:300]


def gather_evidence(conn, a: dict, limit=8) -> list[dict]:
    query = a["main_question"]
    for r in a["references"]:
        if r not in query:
            query += f" {r}"
    results = search(conn, query, limit=limit, record=False)
    if a["qualifications"] and len(results) < limit:
        seen = {r["id"] for r in results}
        extra = search(conn, f"{a['main_question']} {' '.join(a['qualifications'])}", limit=limit, record=False)
        results += [r for r in extra if r["id"] not in seen][: limit - len(results)]
    for i, r in enumerate(results, start=1):
        r["label"] = f"E{i}"
        r["cite"] = citation(r)
    return results


def assess(conn, a: dict, evidence: list[dict]) -> dict:
    terms = parse_query(a["main_question"])["terms"]
    joined = " ".join(e["text"] + " " + (e["heading"] or "") for e in evidence[:5])
    cov = coverage(terms, joined)
    best = max((e["coverage"] for e in evidence), default=0)
    th = db.get_setting(conn, "sufficiency_threshold")
    missing_terms = [t for t in dict.fromkeys(terms) if stem(t) not in joined.lower()]
    if not evidence or cov < th / 2 or best < 0.3:
        verdict = "insufficient"
    elif cov < th or best < 0.4:
        verdict = "partial"
    else:
        verdict = "sufficient"
    missing = []
    if missing_terms:
        missing.append("Nothing in the knowledge base matched: " + ", ".join(missing_terms))
    if not a["role"]:
        missing.append("The customer's role (candidate, parent, teacher, centre) is not clear from the message.")
    if not a["qualifications"] and set(a["actions"]) & {"syllabus / requirements", "results", "booking / registration"}:
        missing.append("The qualification, subject or grade is not stated.")
    if set(a["actions"]) & {"booking / registration", "cancellation / change", "refund / payment", "results", "certificate"} and not a["references"]:
        missing.append("No booking or candidate reference was found in the ticket.")
    missing.append("Customer-specific status (booking, payment, account, result) cannot be checked here - "
                   "this tool has no live connection to Trinity systems.")
    official = [e for e in evidence if e["category"] == "A"]
    notes = []
    if evidence and not official:
        notes.append("No official public website evidence was found; the answer relies on internal or unverified material.")
    if any(e["category"] == "E" for e in evidence[:3]):
        notes.append("Some top evidence is from unverified notes (category E) - verify before use.")
    return {"verdict": verdict, "coverage": round(cov, 2), "missing": missing, "notes": notes}


def detect_conflicts(evidence: list[dict]) -> list[dict]:
    """Flag pairs of passages from different sources about the same topic that state different figures."""
    out = []

    def facts(t):
        f = {}
        for num, unit in NUM_UNIT.findall(t):
            if num.startswith("£"):
                f.setdefault("£", set()).add(num.replace(" ", ""))
            elif unit:
                f.setdefault(re.sub(r"s$", "", unit.lower()), set()).add(num)
        return f

    def terms(t):
        return {stem(w) for w in re.findall(r"[a-z]{4,}", t.lower()) if w not in STOP}

    for i, a in enumerate(evidence):
        for b in evidence[i + 1:]:
            if a["source_id"] == b["source_id"]:
                continue
            ta, tb = terms(a["text"]), terms(b["text"])
            if not ta or not tb or len(ta & tb) / len(ta | tb) < 0.2:
                continue
            fa, fb = facts(a["text"]), facts(b["text"])
            for unit in set(fa) & set(fb):
                if fa[unit].isdisjoint(fb[unit]):
                    out.append({"a": a, "b": b, "unit": unit, "va": sorted(fa[unit]), "vb": sorted(fb[unit]),
                                "why": f"Both passages discuss the same topic but give different values for '{unit}' "
                                       f"({', '.join(sorted(fa[unit]))} vs {', '.join(sorted(fb[unit]))}). "
                                       "Using the wrong one could give the customer incorrect information."})
                    break
    return out


def official_link(a: dict, evidence: list[dict]):
    """One official URL, only for syllabus/qualification questions and only if it was actually retrieved."""
    if not set(a["actions"]) & SYLLABUS_TOPIC and not a["qualifications"]:
        return None, "No syllabus link added: the question is not about qualification or syllabus content."
    if set(a["actions"]) & {"account / login", "refund / payment"} and not set(a["actions"]) & SYLLABUS_TOPIC:
        return None, "No syllabus link added: account/payment questions do not need one."
    for e in evidence:
        if e["category"] == "A" and e["kind"] == "web" and e["coverage"] >= 0.3:
            return e["location"], f"Link taken from evidence {e['label']} (official page, last verified {(e['verified_at'] or '')[:10]})."
    return None, "No relevant official page has been indexed, so no link was added. Find and check the link manually."


def _sentences(text):
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+|\n+", text) if len(s.strip()) > 25]


def draft_template(a, evidence, assessment, link) -> str:
    """Retrieval-only draft: sentences are copied from evidence, never invented."""
    lines = [OPENING, ""]
    if assessment["verdict"] == "insufficient":
        lines += [f"[INTERNAL - DO NOT SEND AS IS] {INSUFFICIENT}", "",
                  "[Write the answer once the missing information has been verified.]", ""]
    else:
        terms = parse_query(a["main_question"])["terms"]
        scored = []
        for e in evidence[:5]:
            if e["category"] == "E":
                continue
            for s in _sentences(e["text"]):
                scored.append((coverage(terms, s), s, e["label"]))
        scored.sort(key=lambda x: -x[0])
        picked, seen = [], set()
        for c, s, lab in scored:
            if c > 0 and s not in seen:
                picked.append((s, lab)); seen.add(s)
            if len(picked) == 4:
                break
        steps = [p for p in picked if re.search(r"\b(please|should|must|need to|select|click|log in|go to|contact|email|upload|submit)\b", p[0], re.I)]
        info = [p for p in picked if p not in steps]
        lines.append("[Review: the sentences below are copied from the evidence shown on the right. Rephrase for the customer, "
                     "and delete the [E#] markers before sending.]")
        lines.append("")
        lines += [f"{s} [{lab}]" for s, lab in info] or ["[Direct answer - write from the evidence.]"]
        if steps:
            lines += ["", "Next steps:"] + [f"- {s} [{lab}]" for s, lab in steps]
        if link:
            lines += ["", f"You can find further information here: {link}"]
    lines += ["", "If you have any further questions, please reply to this email.", "", "Kind regards,", "", "[Your name]",
              "Trinity College London"]
    return "\n".join(lines)


SYSTEM = (f"You draft customer-support emails for Trinity College London in UK English. Begin with exactly: '{OPENING}'. "
          "Use ONLY the numbered evidence provided. Do not add policies, timeframes, prices, refunds, exceptions, URLs or "
          "personal details that are not in the evidence. Never claim a booking, payment, account or result has been "
          "checked. If the evidence does not answer something, write [CHECK: what needs verifying]. Be warm, clear and "
          "concise: acknowledgement, direct answer, explanation, next steps, closing 'Kind regards,' then '[Your name]'.")


def draft_llm(settings, a, evidence, link) -> str:
    ev = "\n\n".join(f"[{e['label']}] ({e['cite']['category_label']}) {e['text'][:1500]}" for e in evidence[:6])
    prompt = (f"Customer question: {a['main_question']}\nCustomer role (if known): {', '.join(a['role']) or 'unknown'}\n\n"
              f"EVIDENCE:\n{ev}\n\n" + (f"The only link you may include is: {link}\n" if link else "Do not include any links.\n")
              + "Write the email now.")
    return llm.generate(settings, prompt, SYSTEM)


def check_generated(text, evidence, ticket, link) -> tuple[str, list[str]]:
    """Guard rails on model output: opening line, no unknown URLs, no unsupported figures."""
    warns = []
    if not text.strip().startswith(OPENING):
        text = OPENING + "\n\n" + text.strip()
    allowed = {link} if link else set()
    for u in re.findall(r"https?://\S+", text):
        u2 = u.rstrip(".,)")
        if u2 not in allowed:
            text = text.replace(u2, "[link removed - not verified]")
            warns.append(f"Removed a link that was not in the verified evidence: {u2}")
    pool = " ".join(e["text"] for e in evidence) + " " + ticket
    for n in set(re.findall(r"£?\d+(?:\.\d+)?", text)):
        if n not in pool:
            warns.append(f"The figure '{n}' does not appear in the evidence - check or remove it.")
    return text, warns


def run_assistant(conn, ticket: str, question: str = "", use_llm=True) -> dict:
    a = analyse(conn, ticket, question)
    evidence = gather_evidence(conn, a)
    assessment = assess(conn, a, evidence)
    conflicts = detect_conflicts(evidence)
    link, link_note = official_link(a, evidence)
    settings = db.all_settings(conn)
    warnings, mode = [], "retrieval-only"
    if conflicts:
        warnings.append("Conflicting information found - this answer requires verification before sending.")
    llm_state = llm.status(settings)
    draft = None
    if use_llm and llm_state["available"] and assessment["verdict"] != "insufficient" and evidence:
        try:
            draft, w = check_generated(draft_llm(settings, a, evidence, link), evidence, ticket, link)
            warnings += w; mode = f"local AI ({settings['llm_model']})"
        except Exception:
            warnings.append("The local AI model did not respond; a retrieval-only draft is shown instead.")
    if draft is None:
        draft = draft_template(a, evidence, assessment, link)
    if assessment["verdict"] != "sufficient":
        warnings.insert(0, INSUFFICIENT if assessment["verdict"] == "insufficient"
                        else "Evidence only partly covers the question - check the missing points before sending.")
    return {"analysis": a, "evidence": evidence, "assessment": assessment, "conflicts": conflicts, "draft": draft,
            "link": link, "link_note": link_note, "warnings": warnings, "mode": mode, "llm": llm_state,
            "triage": triage(conn, ticket, question, a)}


ROUTE_FIELDS = re.compile(r"(?i)(group|team|queue|route|routing|escalat|priority|tag|category|owner|department|contact|email|assign)")


def triage(conn, ticket: str, question: str = "", a: dict | None = None) -> dict:
    a = a or analyse(conn, ticket, question)
    q = a["main_question"] + " " + " ".join(a["actions"]) + " " + " ".join(a["qualifications"])
    rows = search(conn, q, categories=["B", "C", "D"], limit=8, record=False)
    recs = []
    for r in rows:
        fields = [(k.strip(), v.strip()) for k, v in re.findall(r"([^:;]{2,40}):\s*([^;]+)", r["text"]) if ROUTE_FIELDS.search(k)]
        flags = []
        if EMAIL_RE.search(r["text"]) or re.search(r"\b(contact|ask|speak to)\s+[A-Z][a-z]+\b", r["text"]):
            flags.append("Contains contact details or a named person - confirm they are still current.")
        when = r.get("file_mtime") or r.get("imported_at")
        if when and (datetime.now(timezone.utc) - datetime.fromisoformat(when)).days > 365:
            flags.append("Source is more than a year old - it may be outdated.")
        if r["category"] in ("D", "E"):
            flags.append("Historical/unverified source - not a confirmed procedure.")
        recs.append({"row": r, "cite": citation(r), "fields": fields, "flags": flags, "coverage": r["coverage"]})
    ref_formats = []
    for ref in a["references"]:
        hits = search(conn, f"format:{ref}", categories=["B", "C", "D", "A"], limit=3, record=False)
        ref_formats.append({"ref": ref, "shape": shape(ref), "hits": [{"cite": citation(h), "preview": h["text"][:300]} for h in hits]})
    tag_rows = search(conn, "tag tags tagging", categories=["B", "C"], limit=10, record=False)
    counts = {}
    words = {"one": 1, "two": 2, "three": 3, "four": 4, "five": 5}
    for t in tag_rows:
        for n in re.findall(r"\b(\d|one|two|three|four|five)\s+tags?\b", t["text"], re.I):
            counts.setdefault(words.get(n.lower(), n if not n.isdigit() else int(n)), []).append(citation(t)["text"])
    settings = db.all_settings(conn)
    profile = next((p for p in settings["tag_profiles"] if p["name"] == settings["active_tag_profile"]), None)
    confident = bool(recs) and recs[0]["coverage"] >= 0.5 and any(r["fields"] for r in recs[:3])
    return {"analysis": a, "recommendations": recs, "certainty": "supported" if confident else "uncertain",
            "ref_formats": ref_formats, "tag_counts": counts, "tag_discrepancy": len(counts) > 1, "tag_profile": profile}


def redact(text: str) -> str:
    text = EMAIL_RE.sub("[email]", text)
    text = re.sub(r"\+?\d[\d ()-]{8,}\d", "[phone]", text)
    text = REF_RE.sub("[reference]", text)
    text = re.sub(r"(?im)^(dear|hi|hello)\s+[^\n,]+", r"\1 [name]", text)
    text = re.sub(r"(?im)^(kind regards|regards|thanks|many thanks|best wishes),?\s*\n+\s*[^\n]+", r"\1,\n[name]", text)
    return text
