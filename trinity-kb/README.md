# Trinity Support Knowledge Base

A private, local knowledge base and **advisory** customer-support assistant for Trinity College London tickets.
It runs on your computer and needs no paid services. Once your documents and the website are indexed, it works offline.
Nothing is ever sent or uploaded automatically.

## What it does
- **Search** your internal documents and the collected official website pages. Results show the matching passage
  with its exact citation (page, worksheet and cells, section, or URL with last-verified date).
- **Ticket Assistant**: paste a ticket and it will:
  - pick out the question, the customer's role, the qualification, any references and dates;
  - retrieve the evidence and judge whether it is sufficient;
  - flag conflicting sources and missing information;
  - draft a UK-English reply that starts with *"Thank you for contacting Trinity College London."*

  The draft is editable, and you can copy it, regenerate it or save it locally.
- **Ticket Triage**: suggests routing from your internal procedures only, explains booking-reference formats, and flags
  tag rules that differ between documents. If the procedures don't cover a ticket, it marks the routing **uncertain**.
- **Library**: import, replace, re-index or remove documents; duplicates are detected and every version is recorded.
- **Website collection**: polite and resumable. It obeys robots.txt and keeps a full coverage report.
- **Backup / restore / export** with one click.

## Source types (always shown as coloured labels)
| | Type | Typical source |
|---|---|---|
| A | Official public Trinity information | Pages and PDFs collected from trinitycollege.com |
| B | Internal customer-support procedure | Triage directory, process documents |
| C | Internal training guide / worked example | Booking and registration guides |
| D | Historical question-and-answer record | Q&A spreadsheets |
| E | Unverified note | Anything not yet classified (the default for unknown files) |

The type is guessed from the filename when you import a file. Check it on the document's page and change it if needed.
A local copy of an official PDF (for example Syllabus.pdf) is **not** marked A automatically, because a local copy is not a verified web page.
Conflicting sources are always shown side by side and never resolved automatically.

## Install and start (Windows)
1. Install Python 3.11 or newer from https://www.python.org/downloads/ and tick **"Add python.exe to PATH"**.
2. Copy the `trinity-kb` folder somewhere permanent, e.g. `C:\TrinityKB`.
3. Double-click **`start-windows.bat`**. The first start downloads the free libraries (internet needed once, a few minutes).
4. Your browser opens **http://127.0.0.1:8765**. Keep the black window open while you use the app; close it to stop.

After restarting your computer, double-click `start-windows.bat` again. To start it automatically, press Win+R, type
`shell:startup`, and put a shortcut to `start-windows.bat` in the folder that opens.

macOS/Linux: run `./start.sh`.

## First steps
1. **Internal documents** → choose your files (or type a folder path), tick the confirmation and click Import.
   Then open **Full import report** to see each file's pages and worksheets, its status and any warnings.
2. **Settings**:
   - Read trinitycollege.com's terms of use and robots.txt yourself.
   - If you are satisfied that storing public pages for personal reference is allowed, tick the confirmation.
     Untick "store full page text" if you prefer to keep only titles, headings and short excerpts.
3. **Official sources** → *Continue / incremental update*. Each run collects up to 200 pages, at least 3 seconds apart.
   Run it again to continue; interrupted runs pick up where they stopped. See **Coverage** for what is and isn't indexed.
4. Use **Search**, **Ticket Assistant** and **Ticket Triage**.

## Local AI (optional, free)
By default the app runs in **retrieval-only mode**. Its drafts are built only from sentences copied out of the
evidence, marked `[E1]`, `[E2]` and so on; **Copy response** removes those markers.

For smoother wording you can use a free local model:
1. Install Ollama from https://ollama.com.
2. Open **Settings**. It inspects your computer and recommends a model size, for example `qwen2.5:3b`.
3. In a terminal run `ollama pull qwen2.5:3b`.
4. Tick "Use a local Ollama model" in Settings.

The app refuses any model address that is not on your own computer. Before you see a model's draft, the app checks it:
- it adds the required opening line if missing;
- it removes links that were not in the evidence;
- it warns about any figure that does not appear in the evidence.

If the model is unavailable, the app falls back to retrieval-only mode automatically.

## Where your data is
Everything is in the `data` folder next to the app:
- `knowledge.db`: the SQLite database with full-text search;
- `documents/`: copies of imported files;
- `backups/`: backup zips.

To move to another computer, copy the whole `trinity-kb` folder, or make a backup and restore it there.

## Backup and restore
- **Google Drive (free):** install *Google Drive for desktop*. Your Drive then appears as a folder such as `G:\My Drive`.
  In **Settings & backup → Storage and Google Drive**, click **Use G:\My Drive** and save.
  - A full backup is then written to `My Drive\TrinityKB-backups` once a day when the app starts, and after each website update. The newest 10 are kept.
  - The live database stays on your PC, because syncing a database while it's being written can corrupt it. Drive holds the complete backup copies.
- **Settings → Back up now** creates `data/backups/tkb-backup-<date>.zip`. It contains the database, your documents and
  `settings.json`; nothing secret is stored. You can leave saved drafts out.
- **Restore from backup** first checks that the zip is valid and makes a safety backup of your current data.
- **Export** writes a JSON-lines file (format below).
- Command line: `python -m tkb backup`, `python -m tkb restore <zip>`, `python -m tkb export out.jsonl`.

**Export format**: one JSON object per line.
- A source line looks like `{"type":"source", id, kind, category, name, title, location, checksum, imported_at, verified_at, status, warnings, version, ...}`.
- Its passages follow it, each as `{"type":"passage", id, source_id, page, sheet, cell_ref, heading, text, content_hash}`.

## Privacy
- The app listens on 127.0.0.1 only. It rejects requests addressed to any other host name, and forms need a per-session token.
- There is no telemetry. Tickets are analysed in memory and are **not** stored, logged or added to the knowledge base.
- Drafts are saved only when you click Save, and the ticket text is kept only if you tick that box.
- Search history and drafts can be deleted in Settings.
- **Save a redacted example** masks emails, phone numbers, references and names first. It is saved only after you check it and confirm.

## Honest limits
- Evidence sufficiency, conflict detection and role/topic detection are rule-based and conservative.
  - A conflict is flagged when two sources discuss the same topic but give different figures (days, hours, £, %).
  - Contradictions in wording ("can" vs "cannot") are **not** detected automatically, so always read the evidence panel.
- Routing comes only from table rows and passages in your procedures. The app never invents group names or contacts,
  and it flags contact details and sources more than a year old.
- OCR for scanned PDFs needs Tesseract installed (free). Without it, scanned pages are listed as warnings and not silently skipped.
- Text inside images and Word text boxes is not extracted. The app warns you when a file contains these.
- The app has no connection to Trinity's live systems. It can't check bookings, payments, accounts or results.

## Troubleshooting
| Problem | Fix |
|---|---|
| `py`/`python` not found | Reinstall Python with "Add to PATH" ticked |
| Page won't open | Make sure the black window is still open; go to http://127.0.0.1:8765 |
| "Address already in use" | The app is already running in another window; or use `python -m tkb serve --port 8766` |
| A document shows **failed** | Open it in Word/Excel and re-save it; password-protected files can't be read |
| Excel values missing | Formulas without saved results: open the file in Excel, save, re-import |
| Website update does nothing | Tick the terms confirmation in Settings; check the Coverage page's errors |
| AI says "not running" | Start Ollama, then `ollama pull <model>` |
| Start fresh | Make a backup, close the app, delete the `data` folder |

## Command line
`python -m tkb serve | import <file|folder> [--category B] | search <words> | web-update [--refresh] [--max N] | report | backup | restore <zip> | export <file> | hardware`

## Tests
`python -m pytest -q` runs 26 automated tests: importing, duplicates, updates, search, citations, missing evidence and
conflicts, offline use, backup and restore, website failures and robots.txt, and keeping tickets out of the knowledge base.
