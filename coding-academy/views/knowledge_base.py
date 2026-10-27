"""Knowledge base: search everything (lessons, articles, exercises, projects, your notes) and read articles."""

import streamlit as st

from academy import paths, personal
from academy.search import note_docs
from academy.ui.common import PAGES, get_library, get_search_index, page_link

library = get_library()
article_id = st.query_params.get("article")
article = library.articles.get(article_id) if article_id else None

if article is not None:
    st.page_link(PAGES["knowledge"], label="Knowledge Base", icon="⬅️")
    st.caption(article.category)
    st.title(article.title)
    bookmarked = personal.is_bookmarked("article", article.id)
    if st.button("★ Bookmarked" if bookmarked else "☆ Bookmark this article"):
        personal.toggle_bookmark("article", article.id, article.title)
        st.rerun()
    st.markdown(article.body)
    if article.source != "built-in":
        st.caption(f"Your own article: {article.path}")
    st.stop()

st.title("📚 Knowledge Base")
st.markdown("Search all lessons, reference articles, exercises, projects and **your own notes**. Search works "
            "offline on your computer - no AI or internet needed.")
query = st.text_input("Search", placeholder="e.g.  for loop,  NameError,  GROUP BY,  f-string,  backup",
                      key="kb_query")
kinds = st.pills("Include", ["Lessons", "Articles", "Exercises", "Projects", "My notes"],
                 selection_mode="multi", default=["Lessons", "Articles", "Exercises", "Projects", "My notes"],
                 key="kb_kinds")
kind_map = {"Lessons": "lesson", "Articles": "article", "Exercises": "exercise", "Projects": "project",
            "My notes": "note"}

if query.strip():
    selected = {kind_map[k] for k in (kinds or [])}
    hits = get_search_index().search(query, limit=40, kinds=selected or None,
                                     extra_docs=note_docs(personal.list_notes()) if "note" in selected else None)
    if not hits:
        st.info("No results. Try fewer or different words (for example the error name, like `TypeError`).")
    st.caption(f"{len(hits)} result(s)")
    shown = set()
    for hit in hits:
        doc = hit.doc
        ident = (doc.kind, doc.item_id, doc.section)
        if ident in shown:
            continue
        shown.add(ident)
        with st.container(border=True):
            if doc.kind == "lesson":
                lesson = library.lessons.get(doc.item_id)
                page = PAGES["python_academy" if doc.track == "python" else "sql_academy"]
                st.page_link(page, label=f"Lesson: {doc.title} › {doc.section}", icon="📖",
                             query_params={"lesson": doc.item_id})
            elif doc.kind == "article":
                section = f" › {doc.section}" if doc.section else ""
                st.page_link(PAGES["knowledge"], label=f"{doc.title}{section}", icon="📄",
                             query_params={"article": doc.item_id})
            elif doc.kind == "exercise":
                lesson_id = doc.item_id.split("/")[0]
                page = PAGES["python_academy" if doc.track == "python" else "sql_academy"]
                st.page_link(page, label=f"Exercise: {doc.title} (in {doc.section})", icon="✍️",
                             query_params={"lesson": lesson_id})
            elif doc.kind == "project":
                st.page_link(PAGES["projects"], label=f"Project: {doc.title}", icon="🛠️",
                             query_params={"project": doc.item_id})
            else:
                st.page_link(PAGES["notes"], label=f"My note: {doc.title}", icon="🗒️",
                             query_params={"note": doc.item_id})
            st.markdown(hit.snippet)
else:
    st.subheader("Browse")
    for category, articles in library.articles_by_category().items():
        with st.expander(f"{category} ({len(articles)})", expanded=category == "Reference"):
            for item in articles:
                st.page_link(PAGES["knowledge"], label=item.title, icon="📄", query_params={"article": item.id})
    st.caption(f"Add your own articles: put Markdown (.md) files in `{paths.MY_CONTENT_DIR / 'knowledge'}` and "
               "they appear here automatically (category 'My articles'). See the Help page for details.")
    page_link("help", "How to add your own learning material", icon="➕", article="adding-content")
