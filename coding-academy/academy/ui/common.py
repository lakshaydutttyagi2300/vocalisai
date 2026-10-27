"""Shared UI pieces: start-up, cached content, navigation links, badges and styling."""

from __future__ import annotations

import streamlit as st

from academy import backup, db, paths
from academy.content import Lesson, Library, content_signature, load_library
from academy.search import SearchIndex, build_index

# Filled in by app.py: short name -> st.Page object, used for links between pages.
PAGES: dict = {}

STATE_ICONS = {
    "not started": "⚪",
    "started": "🔵",
    "practising": "🟡",
    "completed": "🟢",
    "mastered": "🏆",
}
STATE_COLORS = {"not started": "gray", "started": "blue", "practising": "orange", "completed": "green",
                "mastered": "violet"}

CSS = """
<style>
/* Code editors: monospace text, comfortable line height */
[class*="st-key-code_"] textarea {
    font-family: "Source Code Pro", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
    font-size: 0.92rem !important;
    line-height: 1.5 !important;
    tab-size: 4;
}
.block-container { max-width: 1150px; }
/* Slightly larger body text for long reading */
[data-testid="stMarkdownContainer"] p, [data-testid="stMarkdownContainer"] li { font-size: 1.02rem; line-height: 1.6; }
</style>
"""

# Makes the Tab key indent (4 spaces) inside code editors, and Enter keep the
# indentation (adding 4 spaces after a line ending with ":" in Python editors).
# Press Esc, then Tab, to move keyboard focus out of an editor.
EDITOR_HELPER_JS = """
<script>
(function () {
  if (window.__academyEditorHelper) { return; }
  window.__academyEditorHelper = true;
  function insert(text) { document.execCommand('insertText', false, text); }
  document.addEventListener('keydown', function (e) {
    var ta = e.target;
    if (!ta || ta.tagName !== 'TEXTAREA') { return; }
    var box = ta.closest('[class*="st-key-code_"]');
    if (!box) { return; }
    var isPython = (box.className || '').indexOf('st-key-code_py_') !== -1;
    if (e.key === 'Escape') { ta.dataset.leave = '1'; return; }
    if (e.key === 'Tab') {
      if (ta.dataset.leave === '1') { ta.dataset.leave = ''; return; }
      e.preventDefault();
      var start = ta.selectionStart, end = ta.selectionEnd, value = ta.value;
      var lineStart = value.lastIndexOf('\\n', start - 1) + 1;
      if (start !== end && value.slice(start, end).indexOf('\\n') !== -1) {
        var block = value.slice(lineStart, end);
        var changed = e.shiftKey ? block.replace(/^ {1,4}/gm, '') : block.replace(/^/gm, '    ');
        ta.setSelectionRange(lineStart, end);
        insert(changed);
        ta.setSelectionRange(lineStart, lineStart + changed.length);
      } else if (e.shiftKey) {
        var match = value.slice(lineStart).match(/^ {1,4}/);
        if (match) {
          ta.setSelectionRange(lineStart, lineStart + match[0].length);
          insert('');
          var pos = Math.max(lineStart, start - match[0].length);
          ta.setSelectionRange(pos, pos);
        }
      } else {
        insert('    ');
      }
      return;
    }
    ta.dataset.leave = '';
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
      var s = ta.selectionStart, v = ta.value;
      var ls = v.lastIndexOf('\\n', s - 1) + 1;
      var line = v.slice(ls, s);
      var indent = (line.match(/^ */) || [''])[0];
      if (isPython && /:\\s*(#.*)?$/.test(line)) { indent += '    '; }
      e.preventDefault();
      insert('\\n' + indent);
    }
  }, true);
})();
</script>
"""


@st.cache_resource(show_spinner=False)
def _startup_once(data_dir: str) -> dict:
    """Runs once per app start: folders, database structure, automatic backup."""
    paths.ensure_dirs()
    db.migrate()
    info = {"auto_backup": None, "auto_backup_error": None}
    try:
        info["auto_backup"] = backup.maybe_auto_backup()
    except Exception as exc:  # noqa: BLE001 - a failed backup must never stop the app
        info["auto_backup_error"] = str(exc)
    return info


def startup() -> dict:
    return _startup_once(str(paths.DATA_DIR))


@st.cache_resource(show_spinner="Loading lessons...", max_entries=2)
def _library(signature: tuple) -> Library:
    return load_library()


def get_library() -> Library:
    """All content, reloaded automatically whenever a content file changes."""
    return _library(content_signature())


@st.cache_resource(show_spinner=False, max_entries=2)
def _index(signature: tuple) -> SearchIndex:
    return build_index(_library(signature))


def get_search_index() -> SearchIndex:
    return _index(content_signature())


def inject_styles() -> None:
    st.markdown(CSS, unsafe_allow_html=True)
    st.html(EDITOR_HELPER_JS, unsafe_allow_javascript=True)


def safe_key(text: str) -> str:
    return "".join(ch if ch.isalnum() else "_" for ch in text)


def track_page(track: str):
    return PAGES.get("python_academy" if track == "python" else "sql_academy")


def lesson_link(lesson: Lesson, label: str | None = None, icon: str | None = None, key_suffix: str = "") -> None:
    page = track_page(lesson.track)
    if page is None:
        st.write(label or lesson.title)
        return
    st.page_link(page, label=label or lesson.title, icon=icon, query_params={"lesson": lesson.id})


def page_link(name: str, label: str, icon: str | None = None, **query) -> None:
    page = PAGES.get(name)
    if page is not None:
        st.page_link(page, label=label, icon=icon, query_params=query or None)


def state_badge(state: str) -> str:
    """Markdown for a coloured status badge."""
    return f":{STATE_COLORS.get(state, 'gray')}-badge[{STATE_ICONS.get(state, '')} {state.capitalize()}]"


def percent(value: float | None) -> str:
    return "-" if value is None else f"{value:.0%}"


def show_content_problems(library: Library) -> None:
    if library.problems:
        with st.expander(f"⚠️ {len(library.problems)} content file problem(s) - click for details"):
            st.caption("These files could not be loaded. The rest of the app works normally. "
                       "See docs/CONTENT_FORMAT.md for the correct format.")
            for problem in library.problems:
                st.write(f"- {problem}")


def learner_name() -> str:
    return db.get_setting("learner_name").strip()


def python_timeout() -> float:
    try:
        return max(2.0, min(120.0, float(db.get_setting("python_timeout"))))
    except ValueError:
        return 10.0
