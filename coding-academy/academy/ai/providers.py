"""Swappable AI providers for the optional AI tutor.

Every provider has the same small interface::

    provider.chat(system: str, messages: list[{"role": "user"|"assistant", "content": str}]) -> str

Built-in providers
------------------
* "claude"            Anthropic's Claude API, via the official ``anthropic``
                      package. Needs an API key from console.anthropic.com and
                      is PAID per use (separate from a claude.ai subscription).
* "openai_compatible" Any service that speaks the widely used "OpenAI-style"
                      chat API. This covers FREE local models (Ollama,
                      LM Studio, llama.cpp server) and paid cloud services.

To add another provider, write a class with a ``chat`` method and register it
in ``PROVIDERS`` below. See docs/MAINTENANCE.md ("Replacing the AI provider").
"""

from __future__ import annotations

import json
import urllib.error
import urllib.request
from dataclasses import dataclass

from academy import db, paths

CLAUDE_DEFAULT_MODEL = "claude-opus-5-5"
# Models that support Anthropic's server-side refusal fallback ("fallbacks": "default").
_CLAUDE_FALLBACK_MODELS = {"claude-opus-5-5", "claude-opus-5", "claude-fable-5-1", "claude-sonnet-5-5"}

OPENAI_COMPATIBLE_PRESETS = {
    "Ollama (free, runs on your computer)": ("http://localhost:11434/v1", "llama3.2"),
    "LM Studio (free, runs on your computer)": ("http://localhost:1234/v1", ""),
    "Other / cloud service (enter details)": ("", ""),
}


class AIError(Exception):
    """A problem talking to the AI service, already phrased for a beginner."""


# ---------------------------------------------------------------- secrets


def load_secrets() -> dict:
    try:
        return json.loads(paths.SECRETS_PATH.read_text(encoding="utf-8"))
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_secret(name: str, value: str) -> None:
    """Stored in data/secrets.json on YOUR computer only (never in backups or git)."""
    secrets = load_secrets()
    if value:
        secrets[name] = value
    else:
        secrets.pop(name, None)
    paths.SECRETS_PATH.parent.mkdir(parents=True, exist_ok=True)
    paths.SECRETS_PATH.write_text(json.dumps(secrets, indent=2), encoding="utf-8")


def has_secret(name: str) -> bool:
    return bool(load_secrets().get(name))


# ---------------------------------------------------------------- providers


class ClaudeProvider:
    name = "Claude (Anthropic API)"

    def __init__(self, api_key: str | None, model: str = CLAUDE_DEFAULT_MODEL, timeout: float = 120.0):
        self.api_key = api_key or None  # None lets the SDK use the ANTHROPIC_API_KEY variable
        self.model = model or CLAUDE_DEFAULT_MODEL
        self.timeout = timeout

    def chat(self, system: str, messages: list[dict]) -> str:
        try:
            import anthropic
        except ImportError as exc:
            raise AIError("The 'anthropic' package is not installed. Run the installer again "
                          "(see README, 'Installing').") from exc
        try:
            client = anthropic.Anthropic(api_key=self.api_key, timeout=self.timeout)
            request = dict(model=self.model, max_tokens=16000, system=system, messages=messages,
                           output_config={"effort": "medium"})
            if self.model in _CLAUDE_FALLBACK_MODELS:
                # If a safety classifier wrongly declines a harmless question, Anthropic
                # re-runs it on a recommended fallback model instead of failing.
                response = client.beta.messages.create(
                    betas=["server-side-fallback-2026-07-01"], fallbacks="default", **request)
            else:
                response = client.messages.create(**request)
        except anthropic.AuthenticationError as exc:
            raise AIError("Claude rejected the API key. Check it in AI Tutor > Settings.") from exc
        except anthropic.PermissionDeniedError as exc:
            raise AIError("This API key is not allowed to use that model.") from exc
        except anthropic.NotFoundError as exc:
            raise AIError(f"Claude does not recognise the model name '{self.model}'.") from exc
        except anthropic.RateLimitError as exc:
            raise AIError("Too many requests (or no credit left on the account). Wait a minute and try again, "
                          "and check your billing at console.anthropic.com.") from exc
        except anthropic.BadRequestError as exc:
            raise AIError(f"Claude could not accept the request: {exc.message}") from exc
        except anthropic.APIStatusError as exc:
            raise AIError(f"Claude's service returned an error ({exc.status_code}). Try again later.") from exc
        except anthropic.APIConnectionError as exc:
            raise AIError("Could not reach Claude. Are you connected to the internet?") from exc
        if response.stop_reason == "refusal":
            raise AIError("Claude declined to answer this request. Try rephrasing your question.")
        text = "".join(block.text for block in response.content if block.type == "text").strip()
        if not text:
            raise AIError("Claude returned an empty answer. Try again.")
        return text


class OpenAICompatibleProvider:
    name = "OpenAI-compatible service"

    def __init__(self, base_url: str, model: str, api_key: str | None = None, timeout: float = 180.0):
        self.base_url = (base_url or "").rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout = timeout

    def chat(self, system: str, messages: list[dict]) -> str:
        if not self.base_url or not self.model:
            raise AIError("Enter the service address (base URL) and model name in the AI Tutor settings.")
        body = json.dumps({
            "model": self.model,
            "messages": [{"role": "system", "content": system}] + messages,
        }).encode("utf-8")
        headers = {"Content-Type": "application/json"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"
        request = urllib.request.Request(f"{self.base_url}/chat/completions", data=body, headers=headers,
                                         method="POST")
        try:
            with urllib.request.urlopen(request, timeout=self.timeout) as response:
                data = json.loads(response.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")[:300]
            if exc.code in (401, 403):
                raise AIError("The service rejected the API key.") from exc
            if exc.code == 404:
                raise AIError(f"The service could not find model '{self.model}' (or the address is wrong). "
                              f"Details: {detail}") from exc
            raise AIError(f"The AI service returned an error ({exc.code}): {detail}") from exc
        except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
            raise AIError(
                f"Could not connect to {self.base_url}. If this is a local model (Ollama / LM Studio), "
                "make sure that program is running. If it is a cloud service, check your internet connection."
            ) from exc
        except json.JSONDecodeError as exc:
            raise AIError("The AI service sent back something that was not valid JSON.") from exc
        try:
            text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError) as exc:
            raise AIError("The AI service's answer was not in the expected format.") from exc
        return (text or "").strip()


PROVIDERS = {"claude": ClaudeProvider, "openai_compatible": OpenAICompatibleProvider}


@dataclass
class AIConfig:
    provider: str
    model: str
    base_url: str

    @property
    def enabled(self) -> bool:
        return self.provider in PROVIDERS


def current_config() -> AIConfig:
    settings = db.get_all_settings()
    return AIConfig(settings.get("ai_provider", "none"), settings.get("ai_model", ""),
                    settings.get("ai_base_url", ""))


def get_provider(config: AIConfig | None = None):
    """The configured provider, or None when the AI tutor is switched off."""
    config = config or current_config()
    secrets = load_secrets()
    if config.provider == "claude":
        return ClaudeProvider(secrets.get("anthropic_api_key"), config.model or CLAUDE_DEFAULT_MODEL)
    if config.provider == "openai_compatible":
        return OpenAICompatibleProvider(config.base_url, config.model, secrets.get("openai_compatible_api_key"))
    return None
