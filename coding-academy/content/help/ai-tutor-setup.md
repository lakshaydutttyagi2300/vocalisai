---
id: ai-tutor-setup
title: Setting up the optional AI tutor
category: Help
order: 7
---

# Setting up the optional AI tutor

The AI tutor answers questions in plain English and explains errors. It is **optional** - the rest of the app
works fully without it. Choose one of three options on the **AI Tutor** page.

## Option 1 - Free, on your own computer: Ollama

Best if you want no costs and full privacy, and your computer is reasonably modern (8 GB of memory or more).

1. Download and install **Ollama** from ollama.com (free).
2. Open a terminal and run: `ollama pull llama3.2` - a one-time download of about 2 GB.
3. In the app: AI Tutor → *Set up* → choose **Local model (Ollama / LM Studio)** → preset
   **Ollama** → Save → *Test the connection*.
4. Ollama must be running whenever you use the tutor (it usually starts automatically).

Small local models are helpful but make more mistakes than big cloud models. Always check their answers by
running the code.

**LM Studio** (lmstudio.ai) works the same way: download a model inside LM Studio, start its *local server*,
then choose the LM Studio preset and type the model name shown in LM Studio.

## Option 2 - Claude (Anthropic API, paid per use)

The Claude API is separate from a claude.ai subscription and is billed per use.

1. Create an account at **console.anthropic.com**, add billing (credit), and create an **API key**.
2. In the app: AI Tutor → *Set up* → **Claude** → paste the key → Save → *Test the connection*.
3. The default model is the most capable one; the page lists cheaper models and their prices if you prefer.

The key is stored only on your computer in `data/secrets.json`. It is never included in backups. Remove it any
time with *Forget saved API keys*.

## Option 3 - Another cloud AI service

Any service offering an "OpenAI-compatible chat completions API" works: choose **Local model (...) or another
OpenAI-style service** → preset *Other*, and enter its base URL, model name and API key from that provider's
documentation. Check the provider's prices first - most charge per use.

## Replacing the provider later

Just choose a different option on the AI Tutor page. Developers can add completely new providers in
`academy/ai/providers.py` (see `docs/MAINTENANCE.md`).
