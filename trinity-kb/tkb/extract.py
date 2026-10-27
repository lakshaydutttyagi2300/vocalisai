"""Local text extraction for PDF, DOCX, XLSX, CSV, TXT, Markdown and HTML.

Every extractor returns an Extracted object whose passages keep their location
(page, worksheet + cell range, or section heading). Nothing is silently dropped:
anything that could not be read is reported in `warnings`.
"""
import csv
import io
import re
import zipfile
from dataclasses import dataclass, field
from pathlib import Path

SUPPORTED = {".pdf", ".docx", ".xlsx", ".xlsm", ".csv", ".txt", ".md", ".markdown", ".html", ".htm"}
MAX_CHARS = 1200


@dataclass
class Extracted:
    title: str | None = None
    passages: list = field(default_factory=list)   # dicts: text, heading, page, sheet, cell_ref
    warnings: list = field(default_factory=list)
    page_count: int | None = None
    unit_count: int = 0                              # pages / sheets / sections processed


class ExtractionError(Exception):
    pass


def clean(text: str) -> str:
    text = text.replace(" ", " ").replace("\r", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def chunk(text: str, max_chars: int = MAX_CHARS) -> list[str]:
    """Split long text on paragraph, then sentence boundaries."""
    text = clean(text)
    if len(text) <= max_chars:
        return [text] if text else []
    out, cur = [], ""
    pieces = []
    for para in re.split(r"\n\s*\n", text):
        if len(para) > max_chars:
            pieces.extend(re.split(r"(?<=[.!?])\s+", para))
        else:
            pieces.append(para)
    for p in pieces:
        while len(p) > max_chars:  # extremely long sentence
            out.append(p[:max_chars]); p = p[max_chars:]
        if cur and len(cur) + len(p) + 2 > max_chars:
            out.append(cur); cur = p
        else:
            cur = f"{cur}\n\n{p}" if cur else p
    if cur:
        out.append(cur)
    return [c.strip() for c in out if c.strip()]


def _p(text, heading=None, page=None, sheet=None, cell_ref=None):
    return {"text": text, "heading": heading, "page": page, "sheet": sheet, "cell_ref": cell_ref}


def extract(path: Path) -> Extracted:
    ext = path.suffix.lower()
    if ext not in SUPPORTED:
        raise ExtractionError(f"Unsupported file type '{ext}'.")
    data = path.read_bytes()
    if not data:
        raise ExtractionError("The file is empty.")
    fn = {".pdf": extract_pdf, ".docx": extract_docx, ".xlsx": extract_xlsx, ".xlsm": extract_xlsx,
          ".csv": extract_csv, ".txt": extract_text, ".md": extract_markdown, ".markdown": extract_markdown,
          ".html": extract_html, ".htm": extract_html}[ext]
    try:
        return fn(data, path.name)
    except ExtractionError:
        raise
    except Exception as e:  # corrupted file, wrong format, etc.
        raise ExtractionError(f"Could not read the file ({type(e).__name__}). It may be damaged or not a real {ext} file.")


# ---------------------------------------------------------------- PDF
def extract_pdf(data: bytes, name: str = "") -> Extracted:
    import pymupdf as fitz
    doc = fitz.open(stream=data, filetype="pdf")
    if doc.needs_pass:
        raise ExtractionError("The PDF is password-protected.")
    ex = Extracted(title=(doc.metadata or {}).get("title") or None, page_count=doc.page_count)
    toc = {p: t for _, t, p in doc.get_toc()}  # page -> outline heading
    heading = None
    scanned, ocr_failed = [], []
    for i, page in enumerate(doc, start=1):
        heading = toc.get(i, heading)
        text = page.get_text("text")
        if len(text.strip()) < 20 and page.get_images():
            try:
                tp = page.get_textpage_ocr(full=True)
                text = page.get_text("text", textpage=tp)
                scanned.append(i)
            except Exception:
                ocr_failed.append(i)
                continue
        # use the largest-font line on the page as heading when no outline exists
        if i not in toc:
            h = _pdf_page_heading(page)
            if h:
                heading = h
        for c in chunk(text):
            ex.passages.append(_p(c, heading, page=i))
        ex.unit_count += 1
    if scanned:
        ex.warnings.append(f"Pages read with OCR (check accuracy): {_ranges(scanned)}")
    if ocr_failed:
        ex.warnings.append(f"Scanned pages with no selectable text; OCR not available (install Tesseract): {_ranges(ocr_failed)}")
    return ex


def _pdf_page_heading(page):
    best, size = None, 0
    try:
        for b in page.get_text("dict")["blocks"]:
            for line in b.get("lines", []):
                for s in line["spans"]:
                    t = s["text"].strip()
                    if 3 <= len(t) <= 120 and s["size"] > size + 0.5:
                        best, size = t, s["size"]
    except Exception:
        return None
    return best if size >= 13 else None


def _ranges(nums):
    return ", ".join(str(n) for n in nums[:50]) + (" ..." if len(nums) > 50 else "")


# ---------------------------------------------------------------- DOCX
def extract_docx(data: bytes, name: str = "") -> Extracted:
    import docx
    from docx.table import Table
    from docx.text.paragraph import Paragraph
    d = docx.Document(io.BytesIO(data))
    ex = Extracted(title=d.core_properties.title or None)
    heading, buf = None, []

    def flush():
        if buf:
            for c in chunk("\n".join(buf)):
                ex.passages.append(_p(c, heading))
            buf.clear()

    for el in d.element.body.iterchildren():
        tag = el.tag.split("}")[-1]
        if tag == "p":
            para = Paragraph(el, d)
            t = para.text.strip()
            style = (para.style.name if para.style is not None else "") or ""
            if t and (style.lower().startswith("heading") or style.lower() == "title"):
                flush(); heading = t; ex.unit_count += 1
                if style.lower() == "title" and not ex.title:
                    ex.title = t
            elif t:
                buf.append(t)
        elif tag == "tbl":
            flush()
            for row_text in _table_rows([[c.text for c in r.cells] for r in Table(el, d).rows]):
                ex.passages.append(_p(row_text, heading))
    flush()
    # headers/footers and footnotes are not part of the body - read them too
    seen = set()
    for s in d.sections:
        for part in (s.header, s.footer):
            t = "\n".join(p.text for p in part.paragraphs if p.text.strip()).strip()
            if t and t not in seen:
                seen.add(t); ex.passages.append(_p(t, "Header/footer"))
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        names = z.namelist()
        if "word/footnotes.xml" in names:
            notes = re.findall(r"<w:footnote [^>]*w:id=\"(\d+)\"[^>]*>(.*?)</w:footnote>", z.read("word/footnotes.xml").decode("utf8", "ignore"), re.S)
            for fid, body in notes:
                t = "".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", body)).strip()
                if t and int(fid) > 0:
                    ex.passages.append(_p(t, f"Footnote {fid}"))
        media = [n for n in names if n.startswith("word/media/")]
        if media:
            ex.warnings.append(f"Contains {len(media)} image(s); any text inside images was not extracted.")
        if any("textbox" in z.read(n).decode("utf8", "ignore") for n in names if n == "word/document.xml"):
            ex.warnings.append("Contains text boxes; their text may not have been extracted.")
    return ex


def _table_rows(rows: list[list[str]]) -> list[str]:
    """Serialise a table as 'Header: value; ...' per row so values keep their meaning."""
    rows = [[clean(c) for c in r] for r in rows if any(c.strip() for c in r)]
    if not rows:
        return []
    header = rows[0]
    has_header = len(rows) > 1 and all(h and not re.fullmatch(r"[\d.,£$%-]+", h) for h in header)
    out = []
    for r in rows[1:] if has_header else rows:
        # de-duplicate merged cells repeated across a row
        cells, prev = [], None
        for i, v in enumerate(r):
            if not v or v == prev:
                continue
            prev = v
            h = header[i] if has_header and i < len(header) else ""
            cells.append(f"{h}: {v}" if h and h != v else v)
        if cells:
            out.append("; ".join(cells))
    return out


# ---------------------------------------------------------------- XLSX / CSV
def extract_xlsx(data: bytes, name: str = "") -> Extracted:
    import openpyxl
    from openpyxl.utils import get_column_letter
    wb = openpyxl.load_workbook(io.BytesIO(data), data_only=True)
    ex = Extracted(title=wb.properties.title or None, page_count=len(wb.worksheets))
    for ws in wb.worksheets:
        ex.unit_count += 1
        if ws.sheet_state != "visible":
            ex.warnings.append(f"Worksheet '{ws.title}' is {ws.sheet_state}; it was read and included.")
        rows = []
        for r in ws.iter_rows():
            vals = ["" if c.value is None else str(c.value).strip() for c in r]
            if any(vals):
                rows.append((r[0].row, vals))
        if not rows:
            ex.warnings.append(f"Worksheet '{ws.title}' is empty.")
            continue
        header_row, header = rows[0]
        has_header = len(rows) > 1 and sum(1 for h in header if h) >= max(1, len([v for v in header if v]) * 0.6) \
            and all(not re.fullmatch(r"[\d.,]+", h) for h in header if h)
        body = rows[1:] if has_header else rows
        for rownum, vals in body:
            parts = []
            for i, v in enumerate(vals):
                if v:
                    h = header[i] if has_header and i < len(header) and header[i] else ""
                    parts.append(f"{h}: {v}" if h else v)
            if not parts:
                continue
            last = max(i for i, v in enumerate(vals) if v) + 1
            ref = f"A{rownum}:{get_column_letter(last)}{rownum}"
            text = "; ".join(parts)
            for c in chunk(text):
                ex.passages.append(_p(c, f"{ws.title} (row {rownum})", sheet=ws.title, cell_ref=ref))
    if not ex.passages:
        ex.warnings.append("No cell values found (formulas without cached values cannot be read; open and save the file in Excel first).")
    return ex


def extract_csv(data: bytes, name: str = "") -> Extracted:
    text = _decode(data)
    rows = list(csv.reader(io.StringIO(text)))
    ex = Extracted(unit_count=1)
    if not rows:
        return ex
    header = rows[0]
    for n, r in enumerate(rows[1:], start=2):
        parts = [f"{header[i]}: {v}" if i < len(header) and header[i] else v for i, v in enumerate(r) if v.strip()]
        if parts:
            ex.passages.append(_p("; ".join(parts), f"Row {n}", sheet=name, cell_ref=f"row {n}"))
    return ex


# ---------------------------------------------------------------- text, markdown, html
def _decode(data: bytes) -> str:
    for enc in ("utf-8-sig", "cp1252", "latin-1"):
        try:
            return data.decode(enc)
        except UnicodeDecodeError:
            continue
    return data.decode("utf-8", "replace")


def extract_text(data: bytes, name: str = "") -> Extracted:
    ex = Extracted(unit_count=1)
    for c in chunk(_decode(data)):
        ex.passages.append(_p(c))
    return ex


def extract_markdown(data: bytes, name: str = "") -> Extracted:
    ex = Extracted()
    heading, buf = None, []

    def flush():
        for c in chunk("\n".join(buf)):
            ex.passages.append(_p(c, heading))
        buf.clear()

    for line in _decode(data).splitlines():
        m = re.match(r"^(#{1,6})\s+(.*)", line)
        if m:
            flush(); heading = m.group(2).strip(); ex.unit_count += 1
            if m.group(1) == "#" and not ex.title:
                ex.title = heading
        else:
            buf.append(line)
    flush()
    return ex


def extract_html(data: bytes, name: str = "") -> Extracted:
    return html_to_extracted(_decode(data))


def html_to_extracted(html: str, full_text: bool = True) -> Extracted:
    from bs4 import BeautifulSoup
    soup = BeautifulSoup(html, "html.parser")
    ex = Extracted()
    if soup.title and soup.title.string:
        ex.title = clean(soup.title.string)
    for t in soup(["script", "style", "noscript", "nav", "footer", "header", "form", "svg", "iframe"]):
        t.decompose()
    main = soup.find("main") or soup.find(attrs={"role": "main"}) or soup.body or soup
    heading, buf = None, []

    def flush():
        for c in chunk("\n\n".join(buf)):
            ex.passages.append(_p(c, heading))
        buf.clear()

    for el in main.find_all(["h1", "h2", "h3", "h4", "p", "li", "td", "th", "dt", "dd", "blockquote"]):
        if el.find(["p", "li", "td"]):  # avoid double-counting containers
            continue
        t = clean(el.get_text(" "))
        if not t:
            continue
        if el.name in ("h1", "h2", "h3", "h4"):
            flush(); heading = t; ex.unit_count += 1
            if el.name == "h1" and not ex.title:
                ex.title = t
        else:
            buf.append(t)
    flush()
    if not full_text:  # metadata-only mode: headings and a short excerpt
        excerpt = ex.passages[0]["text"][:300] if ex.passages else ""
        heads = sorted({p["heading"] for p in ex.passages if p["heading"]})
        ex.passages = [_p(excerpt + ("..." if excerpt else ""), "Excerpt")] if excerpt else []
        if heads:
            ex.passages.append(_p("Headings on this page: " + "; ".join(heads), "Page outline"))
        ex.warnings.append("Stored as excerpt and headings only (full-text storage is switched off).")
    return ex
