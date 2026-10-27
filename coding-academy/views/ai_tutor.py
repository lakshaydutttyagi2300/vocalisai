"""Optional AI tutor. The rest of the app works fully without it."""

import streamlit as st

from academy import db
from academy.ai.providers import (CLAUDE_DEFAULT_MODEL, OPENAI_COMPATIBLE_PRESETS, AIError, current_config,
                                  get_provider, has_secret, save_secret)
from academy.ai.tutor import build_system_prompt, explain_error_prompt
from academy.ui.common import get_library

library = get_library()
config = current_config()

st.title("🤖 AI Tutor (optional)")
st.markdown("Ask questions in plain English and get explanations, hints and feedback. **Everything else in this "
            "app works without it** - lessons, labs, checks, hints, explanations and progress tracking are all "
            "built in and offline.")

with st.expander("⚙️ Set up or change the AI tutor", expanded=not config.enabled):
    st.markdown("""
**Choose one of these options:**

| Option | Cost | Internet | Privacy |
|---|---|---|---|
| **Off** | Free | - | - |
| **Local model with Ollama or LM Studio** | Free (uses your computer's power; needs a reasonably modern computer, 8 GB+ memory recommended) | Only to download the model once | Everything stays on your computer |
| **Claude (Anthropic API)** | Paid per use - a separate pay-as-you-go account at console.anthropic.com, **not** included in a claude.ai subscription | Required | Your questions are sent to Anthropic |
| **Another cloud service** with an OpenAI-style API | Usually paid per use - check the provider's prices | Required | Your questions are sent to that provider |
""")
    labels = {"none": "Off", "claude": "Claude (Anthropic API - paid)",
              "openai_compatible": "Local model (Ollama / LM Studio) or another OpenAI-style service"}
    provider = st.radio("AI provider", list(labels), format_func=labels.get,
                        index=list(labels).index(config.provider) if config.provider in labels else 0)
    model, base_url = config.model, config.base_url
    if provider == "claude":
        st.markdown(f"""
1. Create an account at **console.anthropic.com**, add a payment method or credit, and create an **API key**.
2. Paste the key below. It is saved only on this computer in `data/secrets.json` (never in backups).

Prices change - check anthropic.com/pricing. As of October 2026, per million tokens (roughly 750,000 words):
`claude-opus-5-5` (default, most capable) **$4 input / $20 output**; `claude-sonnet-5-5` $2 / $10;
`claude-haiku-5-5` **$0.10 / $0.50** (cheapest). A typical tutor question uses a few thousand tokens.
""")
        key = st.text_input("Anthropic API key", type="password",
                            placeholder="already saved - leave empty to keep it" if has_secret("anthropic_api_key")
                            else "sk-ant-...")
        model = st.text_input("Model name", value=config.model if config.provider == "claude" and config.model
                              else CLAUDE_DEFAULT_MODEL,
                              help="Change this to a cheaper model (for example claude-haiku-5-5) if you prefer.")
    elif provider == "openai_compatible":
        preset = st.selectbox("Preset", list(OPENAI_COMPATIBLE_PRESETS))
        preset_url, preset_model = OPENAI_COMPATIBLE_PRESETS[preset]
        st.markdown("""
**Free local option - Ollama:** install it from ollama.com, then in a terminal run `ollama pull llama3.2`
(one-time download of about 2 GB). Keep Ollama running while you use the tutor. Small local models are
helpful but make more mistakes than large cloud models - double-check their answers by running the code.
""")
        base_url = st.text_input("Service address (base URL)",
                                 value=config.base_url if config.provider == "openai_compatible" and config.base_url
                                 else preset_url)
        model = st.text_input("Model name", value=config.model if config.provider == "openai_compatible" and
                              config.model else preset_model)
        key = st.text_input("API key (leave empty for local models)", type="password",
                            placeholder="already saved" if has_secret("openai_compatible_api_key") else "")
    else:
        key = ""
    if st.button("💾 Save AI settings", type="primary"):
        db.set_setting("ai_provider", provider)
        db.set_setting("ai_model", model or "")
        db.set_setting("ai_base_url", base_url or "")
        if provider == "claude" and key:
            save_secret("anthropic_api_key", key.strip())
        if provider == "openai_compatible" and key:
            save_secret("openai_compatible_api_key", key.strip())
        st.success("Saved.")
        st.rerun()
    if config.enabled and st.button("🔌 Test the connection"):
        try:
            with st.spinner("Contacting the AI service..."):
                reply = get_provider(config).chat("Reply with the single word OK.",
                                                  [{"role": "user", "content": "Connection test"}])
            st.success(f"It works! The AI replied: {reply[:200]}")
        except AIError as exc:
            st.error(str(exc))
    if has_secret("anthropic_api_key") or has_secret("openai_compatible_api_key"):
        if st.button("Forget saved API keys"):
            save_secret("anthropic_api_key", "")
            save_secret("openai_compatible_api_key", "")
            st.success("Keys removed from this computer.")

if not config.enabled:
    st.info("The AI tutor is switched off. Set it up above, or use the built-in help: every exercise has hints "
            "and explanations, errors are explained automatically, and the Knowledge Base has a glossary, "
            "common-errors guide and FAQ.", icon="ℹ️")
    st.stop()

# ---------------------------------------------------------------- chat
lessons = library.all_lessons()
current = db.get_setting("current_lesson")
ids = [""] + [ls.id for ls in lessons]
context_id = st.selectbox("What are you studying? (gives the tutor context)", ids,
                          index=ids.index(current) if current in ids else 0,
                          format_func=lambda i: "(general question)" if not i else
                          f"{library.lessons[i].track.upper()} · {library.lessons[i].title}")
lesson = library.lessons.get(context_id) if context_id else None

history = st.session_state.setdefault("tutor_history", [])
lab_result = st.session_state.get("lab_result")
if st.query_params.get("explain") == "python_lab" and lab_result and (lab_result.error or lab_result.timed_out):
    if st.button("Explain the error from my last Python Lab run", type="primary"):
        error_text = (lab_result.error or {}).get("traceback") or "The program did not finish in time."
        history.append({"role": "user", "content": explain_error_prompt(st.session_state.get("code_py_lab", ""),
                                                                         error_text)})
        st.session_state["tutor_pending"] = True

for message in history:
    with st.chat_message(message["role"]):
        st.markdown(message["content"])

question = st.chat_input("Ask a question, or paste your code and the error message")
if question:
    history.append({"role": "user", "content": question})
    with st.chat_message("user"):
        st.markdown(question)
    st.session_state["tutor_pending"] = True

if st.session_state.pop("tutor_pending", False):
    with st.chat_message("assistant"):
        try:
            with st.spinner("Thinking..."):
                answer = get_provider(config).chat(build_system_prompt(lesson), history[-20:])
            st.markdown(answer)
            history.append({"role": "assistant", "content": answer})
        except AIError as exc:
            st.error(str(exc))
            history.pop()  # let the learner try the same question again

if history and st.button("🧹 Start a new conversation"):
    st.session_state["tutor_history"] = []
    st.rerun()
st.caption("AI answers can be wrong. Check them by running the code in the labs. Conversations are not saved "
           "after you close the app.")
