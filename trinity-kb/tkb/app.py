"""Local web interface. Binds to 127.0.0.1 only."""
import json
import secrets
import tempfile
import threading
from pathlib import Path

from flask import Flask, abort, flash, jsonify, redirect, render_template, request, send_file, url_for
from werkzeug.utils import secure_filename

from . import backup, config, db, ingest, llm, ticket, web
from .config import CATEGORIES
from .extract import SUPPORTED
from .search import citation, search

app = Flask(__name__)
app.secret_key = secrets.token_hex(32)
app.config["MAX_CONTENT_LENGTH"] = 200 * 1024 * 1024
CSRF = secrets.token_urlsafe(24)
CRAWL = {"running": False, "message": "", "count": 0, "url": ""}


def conn():
    return db.connect()


@app.context_processor
def inject():
    return {"csrf": CSRF, "CATEGORIES": CATEGORIES, "citation": citation}


@app.template_filter("fromjson")
def fromjson(s):
    return json.loads(s or "[]")


@app.before_request
def guard():
    host = (request.host or "").split(":")[0]
    if host not in ("127.0.0.1", "localhost") and not app.config.get("TESTING"):
        abort(403)  # blocks DNS-rebinding and accidental network exposure
    if request.method == "POST" and request.form.get("csrf") != CSRF:
        abort(400, "This form has expired. Please reload the page and try again.")


@app.errorhandler(500)
def server_error(e):
    # never show stack traces or ticket content
    return render_template("message.html", title="Something went wrong",
                           text="The action could not be completed. Details were not shown to protect your data; "
                                "see the terminal window for a technical message."), 500


@app.route("/")
def home():
    c = conn()
    s = db.all_settings(c)
    count = lambda sql: c.execute(sql).fetchone()[0]
    stats = {
        "web": count("SELECT COUNT(*) FROM sources WHERE kind='web' AND active=1"),
        "docs": count("SELECT COUNT(*) FROM sources WHERE kind IN ('file','note') AND active=1"),
        "passages": count("SELECT COUNT(*) FROM passages"),
        "failed": count("SELECT COUNT(*) FROM sources WHERE status='failed'"),
        "coverage": web.coverage_report(c),
        "llm": llm.status(s),
        "last_backup": (s.get("last_backup_at") or "")[:16].replace("T", " "),
    }
    steps = [
        {"title": "Allow website collection", "done": bool(s["web_terms_reviewed"]), "href": "/settings#website", "button": "Open settings",
         "text": "Confirm you're happy for public Trinity pages to be stored privately on this computer."},
        {"title": "Collect the Trinity website", "done": stats["web"] > 0, "href": "/official", "button": "Start collecting",
         "text": "Downloads syllabuses and official pages. Run it a few times until nothing is waiting."},
        {"title": "Import your own documents", "done": stats["docs"] > 0, "href": "/documents", "button": "Import files",
         "text": "Training guides, Q&A sheets, the triage directory and procedures."},
        {"title": "Back up to Google Drive", "done": bool(s.get("backup_folder")) and bool(stats["last_backup"]), "href": "/settings#storage", "button": "Set up",
         "text": "Keeps a copy of everything in your Google Drive automatically."},
        {"title": "Try the Ticket Assistant", "done": count("SELECT COUNT(*) FROM drafts") > 0, "href": "/ticket", "button": "Try it",
         "text": "Paste a real ticket and save the draft you like."},
    ]
    next_step = next((i for i, x in enumerate(steps) if not x["done"]), None)
    recent = c.execute("SELECT query, at, result_count FROM search_history ORDER BY id DESC LIMIT 8").fetchall()
    drafts = c.execute("SELECT id,title,status,updated_at FROM drafts ORDER BY id DESC LIMIT 6").fetchall()
    return render_template("home.html", stats=stats, recent=recent, drafts=drafts, steps=steps, next_step=next_step)


@app.route("/search")
def search_page():
    c = conn()
    q = request.args.get("q", "")
    cats = request.args.getlist("cat")
    doc = request.args.get("doc")
    results = []
    if q:
        results = search(c, q, categories=cats or None, source_ids=[doc] if doc else None,
                         qualification=request.args.get("qual") or None, heading=request.args.get("heading") or None,
                         date_from=request.args.get("since") or None)
    docs = c.execute("SELECT id, name, title, kind FROM sources WHERE active=1 ORDER BY kind, name").fetchall()
    return render_template("search.html", q=q, results=results, cats=cats, docs=docs, doc=doc,
                           quals=db.get_setting(c, "qualifications"), args=request.args)


@app.route("/ticket", methods=["GET", "POST"])
def ticket_page():
    if request.method == "GET":
        return render_template("ticket.html", res=None, form={})
    c = conn()
    form = {k: request.form.get(k, "") for k in ("ticket", "previous", "notes", "refs", "question")}
    combined = "\n\n".join(v for k, v in form.items() if k != "question" and v.strip())
    if not combined.strip() and not form["question"].strip():
        flash("Paste the ticket or type the question first.")
        return render_template("ticket.html", res=None, form=form)
    res = ticket.run_assistant(c, combined, form["question"], use_llm=request.form.get("mode") != "retrieval")
    return render_template("ticket.html", res=res, form=form)


@app.route("/triage", methods=["GET", "POST"])
def triage_page():
    res, form = None, {"ticket": "", "question": ""}
    c = conn()
    if request.method == "POST":
        form = {k: request.form.get(k, "") for k in form}
        res = ticket.triage(c, form["ticket"], form["question"])
    s = db.all_settings(c)
    return render_template("triage.html", res=res, form=form, profiles=s["tag_profiles"], active=s["active_tag_profile"])


@app.post("/triage/profiles")
def save_profiles():
    c = conn()
    try:
        profiles = json.loads(request.form["profiles"])
        assert isinstance(profiles, list) and all("name" in p and "count" in p for p in profiles)
    except Exception:
        flash("Tag profiles must be a JSON list like [{\"name\": \"Default\", \"count\": 2, \"format\": \"\", \"note\": \"\"}].")
        return redirect(url_for("triage_page"))
    db.set_setting(c, "tag_profiles", profiles)
    db.set_setting(c, "active_tag_profile", request.form.get("active") or profiles[0]["name"])
    flash("Tagging profiles saved.")
    return redirect(url_for("triage_page"))


# ------------------------------------------------------------------ drafts
@app.post("/drafts/save")
def save_draft():
    c = conn()
    keep_ticket = request.form.get("keep_ticket") == "on"
    cur = c.execute("INSERT INTO drafts(created_at,updated_at,title,question,response_text,ticket_text,status,warnings) VALUES(?,?,?,?,?,?,?,?)",
                    (db.now(), db.now(), request.form.get("question", "")[:120] or "Draft", request.form.get("question", ""),
                     request.form["response"], request.form.get("ticket") if keep_ticket else None,
                     "reviewed" if request.form.get("reviewed") else "draft", request.form.get("warnings", "[]")))
    for pid in request.form.getlist("evidence"):
        p = c.execute("SELECT p.*, s.name, s.title, s.category, s.kind, s.location, s.verified_at, s.imported_at, s.file_mtime FROM passages p JOIN sources s ON s.id=p.source_id WHERE p.id=?", (pid,)).fetchone()
        if p:
            c.execute("INSERT INTO evidence_refs(draft_id,passage_id,label,snapshot) VALUES(?,?,?,?)",
                      (cur.lastrowid, p["id"], citation(dict(p))["text"], p["text"]))
    c.commit()
    flash("Draft saved on this computer.")
    return redirect(url_for("draft_page", did=cur.lastrowid))


@app.route("/drafts")
def drafts_page():
    rows = conn().execute("SELECT id,title,status,created_at,updated_at FROM drafts ORDER BY id DESC").fetchall()
    return render_template("drafts.html", drafts=rows)


@app.route("/drafts/<int:did>", methods=["GET", "POST"])
def draft_page(did):
    c = conn()
    if request.method == "POST":
        action = request.form.get("action")
        if action == "delete":
            c.execute("DELETE FROM drafts WHERE id=?", (did,)); c.commit()
            flash("Draft deleted."); return redirect(url_for("drafts_page"))
        c.execute("UPDATE drafts SET response_text=?, status=?, updated_at=? WHERE id=?",
                  (request.form["response"], "reviewed" if action == "review" else "draft", db.now(), did))
        c.commit(); flash("Saved.")
    d = c.execute("SELECT * FROM drafts WHERE id=?", (did,)).fetchone() or abort(404)
    ev = c.execute("SELECT * FROM evidence_refs WHERE draft_id=?", (did,)).fetchall()
    return render_template("draft.html", d=d, ev=ev)


@app.post("/privacy/clear")
def clear_private():
    c = conn()
    what = request.form.get("what")
    if what in ("history", "all"):
        c.execute("DELETE FROM search_history")
    if what in ("drafts", "all"):
        c.execute("DELETE FROM evidence_refs"); c.execute("DELETE FROM drafts")
    c.commit()
    c.execute("VACUUM")
    flash("Deleted.")
    return redirect(request.referrer or url_for("home"))


@app.route("/knowledge/save", methods=["GET", "POST"])
def save_knowledge():
    """Explicit, user-approved saving of a redacted example to the knowledge base."""
    c = conn()
    if request.method == "POST" and request.form.get("confirm") == "on":
        sid = ingest.add_note(c, request.form["title"] or "Saved example", request.form["text"], request.form.get("category", "E"))
        flash("Saved to the knowledge base as an internal note.")
        return redirect(url_for("document_page", sid=sid))
    text = request.form.get("text", "")
    return render_template("save_knowledge.html", text=ticket.redact(text), title=request.form.get("title", ""))


# ------------------------------------------------------------------ documents
@app.route("/documents")
def documents_page():
    c = conn()
    f = request.args.get("filter", "")
    rows = c.execute("""SELECT s.*, (SELECT COUNT(*) FROM passages p WHERE p.source_id=s.id) passages FROM sources s
                        WHERE kind IN ('file','note') AND (name LIKE ? OR COALESCE(title,'') LIKE ?) ORDER BY name""",
                     (f"%{f}%", f"%{f}%")).fetchall()
    jobs = c.execute("SELECT * FROM jobs WHERE kind='import' ORDER BY id DESC LIMIT 15").fetchall()
    return render_template("documents.html", rows=rows, f=f, jobs=jobs, supported=", ".join(sorted(SUPPORTED)))


@app.post("/documents/import")
def import_docs():
    if request.form.get("confirm_sensitive") != "on":
        flash("Please confirm the documents contain no customer personal data, passwords or card details you don't want stored.")
        return redirect(url_for("documents_page"))
    c = conn()
    cat = request.form.get("category") or None
    results = []
    with tempfile.TemporaryDirectory() as tmp:
        for f in request.files.getlist("files"):
            if not f.filename:
                continue
            name = Path(f.filename).name
            p = Path(tmp) / (secure_filename(name) or "upload")
            f.save(p)
            results.append(ingest.import_file(c, p, cat, original_name=name))
    folder = request.form.get("folder", "").strip()
    if folder:
        if Path(folder).is_dir():
            results += ingest.import_folder(c, folder, cat)
        else:
            flash(f"Folder not found: {folder}")
    return render_template("import_result.html", results=results)


@app.route("/documents/<int:sid>", methods=["GET", "POST"])
def document_page(sid):
    c = conn()
    if request.method == "POST":
        action = request.form.get("action")
        if action == "delete":
            ingest.remove_source(c, sid); flash("Removed from the knowledge base.")
            return redirect(url_for("documents_page"))
        if action == "category" and request.form.get("category") in CATEGORIES:
            c.execute("UPDATE sources SET category=? WHERE id=?", (request.form["category"], sid)); c.commit()
        if action == "reindex":
            s = c.execute("SELECT * FROM sources WHERE id=?", (sid,)).fetchone()
            if s["stored_path"] and Path(s["stored_path"]).exists():
                c.execute("UPDATE sources SET checksum=NULL WHERE id=?", (sid,)); c.commit()
                r = ingest.import_file(c, s["stored_path"], s["category"], original_name=s["name"])
                flash(f"Re-indexed: {r['message']}")
        if action == "replace" and request.files.get("file"):
            s = c.execute("SELECT * FROM sources WHERE id=?", (sid,)).fetchone()
            with tempfile.TemporaryDirectory() as tmp:
                p = Path(tmp) / secure_filename(request.files["file"].filename or "upload")
                request.files["file"].save(p)
                if p.suffix.lower() != Path(s["name"]).suffix.lower():
                    flash("The replacement must be the same file type.")
                else:
                    r = ingest.import_file(c, p, s["category"], original_name=s["name"])
                    flash(f"Replace: {r['message']}")
    s = c.execute("SELECT * FROM sources WHERE id=?", (sid,)).fetchone() or abort(404)
    passages = c.execute("SELECT * FROM passages WHERE source_id=? ORDER BY ord LIMIT 2000", (sid,)).fetchall()
    versions = c.execute("SELECT * FROM source_versions WHERE source_id=? ORDER BY id DESC", (sid,)).fetchall()
    focus = request.args.get("p", type=int)
    return render_template("document.html", s=s, passages=passages, versions=versions, focus=focus)


@app.route("/documents/<int:sid>/file")
def document_file(sid):
    s = conn().execute("SELECT stored_path, name FROM sources WHERE id=?", (sid,)).fetchone()
    if not s or not s["stored_path"] or not Path(s["stored_path"]).exists():
        abort(404)
    return send_file(s["stored_path"], download_name=s["name"])


@app.route("/reports/imports")
def import_report():
    return render_template("import_report.html", rows=ingest.import_report(conn()))


# ------------------------------------------------------------------ website
@app.route("/official")
def official_page():
    c = conn()
    f = request.args.get("filter", "")
    rows = c.execute("""SELECT s.*, (SELECT COUNT(*) FROM passages p WHERE p.source_id=s.id) passages FROM sources s
                        WHERE kind='web' AND (name LIKE ? OR COALESCE(title,'') LIKE ?) ORDER BY title LIMIT 2000""",
                     (f"%{f}%", f"%{f}%")).fetchall()
    return render_template("official.html", rows=rows, f=f, crawl=CRAWL, settings=db.all_settings(c))


@app.post("/web/update")
def web_update():
    if CRAWL["running"]:
        flash("An update is already running.")
        return redirect(url_for("official_page"))
    refresh = request.form.get("mode") == "refresh"

    def work():
        c = db.connect()
        CRAWL.update(running=True, message="Starting...", count=0)
        try:
            r = web.run_update(c, refresh=refresh, progress=lambda n, u: CRAWL.update(count=n, url=u))
            CRAWL["message"] = r["message"]
        except web.CrawlBlocked as e:
            CRAWL["message"] = str(e)
        except Exception as e:
            CRAWL["message"] = f"Update stopped: {type(e).__name__}. Run it again to continue where it stopped."
        finally:
            try:
                backup.auto_backup(c)
            except Exception:
                pass
            CRAWL["running"] = False
            c.close()
    threading.Thread(target=work, daemon=True).start()
    flash("Website update started. This page shows progress; you can keep working meanwhile.")
    return redirect(url_for("official_page"))


@app.route("/web/status")
def web_status():
    return jsonify(CRAWL)


@app.route("/coverage")
def coverage_page():
    c = conn()
    jobs = c.execute("SELECT * FROM jobs WHERE kind='web' ORDER BY id DESC LIMIT 10").fetchall()
    errors = c.execute("SELECT * FROM job_errors ORDER BY id DESC LIMIT 200").fetchall()
    return render_template("coverage.html", r=web.coverage_report(c), jobs=jobs, errors=errors)


# ------------------------------------------------------------------ settings & backup
@app.route("/settings", methods=["GET", "POST"])
def settings_page():
    c = conn()
    if request.method == "POST":
        f = request.form
        db.set_setting(c, "llm_enabled", f.get("llm_enabled") == "on")
        db.set_setting(c, "llm_model", f.get("llm_model", "").strip() or config.DEFAULT_SETTINGS["llm_model"])
        db.set_setting(c, "web_terms_reviewed", f.get("web_terms_reviewed") == "on")
        db.set_setting(c, "web_store_full_text", f.get("web_store_full_text") == "on")
        db.set_setting(c, "web_respect_noindex", f.get("web_respect_noindex") == "on")
        db.set_setting(c, "web_delay_seconds", max(1.0, float(f.get("web_delay_seconds") or 3)))
        db.set_setting(c, "web_max_pages_per_run", max(1, int(f.get("web_max_pages_per_run") or 200)))
        db.set_setting(c, "web_max_depth", max(0, int(f.get("web_max_depth") or 3)))
        db.set_setting(c, "web_recheck_days", max(1, int(f.get("web_recheck_days") or 30)))
        db.set_setting(c, "web_contact", f.get("web_contact", "").strip()[:100])
        prec = [x.strip().upper() for x in f.get("precedence", "").split(",") if x.strip().upper() in CATEGORIES]
        if sorted(prec) == sorted(CATEGORIES):
            db.set_setting(c, "precedence", prec)
        db.set_setting(c, "search_limit", max(5, min(100, int(f.get("search_limit") or 20))))
        db.set_setting(c, "sufficiency_threshold", max(0.1, min(1.0, float(f.get("sufficiency_threshold") or 0.5))))
        db.set_setting(c, "qualifications", [q.strip() for q in f.get("qualifications", "").split(",") if q.strip()])
        flash("Settings saved.")
        return redirect(url_for("settings_page"))
    s = db.all_settings(c)
    return render_template("settings.html", s=s, data_dir=config.data_dir(), hw=llm.hardware(), llm=llm.status(s),
                           backups=backup.list_backups(c), target=backup.backup_target(c), drives=backup.find_google_drive())


@app.post("/storage")
def save_storage():
    c = conn()
    folder = request.form.get("backup_folder", "").strip().strip('"')
    if folder and not Path(folder).is_dir():
        flash(f"That folder doesn't exist on this computer: {folder}. Check Google Drive for desktop is running.")
        return redirect(url_for("settings_page") + "#storage")
    db.set_setting(c, "backup_folder", folder)
    db.set_setting(c, "backup_keep", max(1, min(365, int(request.form.get("backup_keep") or 10))))
    if folder:
        p = backup.create_backup(c)
        flash(f"Saved. A first backup was written to {p.parent}. From now on a backup is made there automatically once a day.")
    else:
        flash("Backups will be kept in the app's own data folder.")
    return redirect(url_for("settings_page") + "#storage")


@app.post("/backup")
def make_backup():
    p = backup.create_backup(conn(), include_drafts=request.form.get("drafts") == "on")
    flash(f"Backup created: {p}")
    return redirect(url_for("settings_page"))


@app.route("/backup/<name>")
def download_backup(name):
    p = next((b for b in backup.list_backups(conn()) if b.name == secure_filename(name)), None)
    if not p:
        abort(404)
    return send_file(p, as_attachment=True)


@app.post("/restore")
def restore():
    f = request.files.get("file")
    if not f or not f.filename:
        flash("Choose a backup .zip file."); return redirect(url_for("settings_page"))
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / "restore.zip"
        f.save(p)
        try:
            safety = backup.restore_backup(p)
            flash(f"Restored. Your previous data was kept as {safety.name}.")
        except Exception as e:
            flash(f"Restore failed: {e}")
    return redirect(url_for("settings_page"))


@app.post("/export")
def export():
    out = config.backups_dir() / f"export-{db.now()[:10]}.jsonl"
    backup.export_jsonl(conn(), out)
    return send_file(out, as_attachment=True)


def main(port=8765):
    c = db.connect()
    try:
        made = backup.auto_backup(c)
        if made:
            print(f"  Daily backup saved: {made}")
    except Exception as e:
        print(f"  Automatic backup skipped ({type(e).__name__}).")
    c.close()
    print(f"\n  Trinity Support Knowledge Base is running.\n  Open http://127.0.0.1:{port} in your browser.\n"
          f"  Data folder: {config.data_dir()}\n  Close this window (or press Ctrl+C) to stop.\n")
    app.run(host="127.0.0.1", port=port, debug=False, threaded=True)
