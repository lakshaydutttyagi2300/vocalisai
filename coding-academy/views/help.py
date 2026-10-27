"""Help and troubleshooting: how to use the app, common problems, FAQ."""

import streamlit as st

from academy.ui.common import PAGES, get_library, page_link

library = get_library()
help_articles = sorted((a for a in library.articles.values() if a.category == "Help"),
                       key=lambda a: (a.order, a.title))

st.title("❓ Help & Troubleshooting")
if not help_articles:
    st.warning("The help files are missing from content/help.")
    st.stop()

requested = st.query_params.get("article")
ids = [a.id for a in help_articles]
if "help_choice" not in st.session_state or (requested in ids and
                                              st.session_state.get("_help_query") != requested):
    st.session_state["help_choice"] = requested if requested in ids else ids[0]
    st.session_state["_help_query"] = requested

by_id = {a.id: a for a in help_articles}
choice = st.selectbox("Help topic", ids, format_func=lambda i: by_id[i].title, key="help_choice")
article = by_id[choice]
with st.container(border=True):
    st.markdown(article.body)

st.divider()
st.markdown("**Still stuck?** Search the Knowledge Base for the exact error message, or read "
            "`docs/TROUBLESHOOTING.md` in the app folder.")
page_link("knowledge", "Search the Knowledge Base", icon="🔎")
if PAGES.get("ai_tutor"):
    page_link("ai_tutor", "Ask the AI tutor (if you set one up)", icon="🤖")
