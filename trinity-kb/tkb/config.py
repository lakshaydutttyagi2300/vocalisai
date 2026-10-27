"""Paths and default settings. Everything lives under one portable data directory."""
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CATEGORIES = {
    "A": "Official public Trinity information",
    "B": "Internal customer-support procedure",
    "C": "Internal training guide / worked example",
    "D": "Historical question-and-answer record",
    "E": "Unverified note",
}

DEFAULT_SETTINGS = {
    # source precedence used only as a gentle ranking tie-break, never to hide a conflict
    "precedence": ["A", "B", "C", "D", "E"],
    "search_limit": 20,
    "sufficiency_threshold": 0.5,
    "qualifications": ["ESOL", "SELT", "Graded Examinations", "Rock & Pop", "Theory", "Performance Arts",
                       "Drama", "Speech", "Music Theory", "Diploma", "Arts Award", "Digital", "Face-to-face",
                       "Piano", "Violin", "Singing", "Guitar", "Flute", "Clarinet", "Drums"],
    # website
    "web_base_url": "https://www.trinitycollege.com/",
    "web_allowed_hosts": ["www.trinitycollege.com"],
    "web_terms_reviewed": False,       # must be ticked by the user before any crawl
    "web_store_full_text": True,       # False => title, headings and a short excerpt only
    "web_respect_noindex": True,       # skip pages tagged noindex (a search-engine listing instruction)
    "web_delay_seconds": 3.0,
    "web_max_pages_per_run": 200,
    "web_max_depth": 3,
    "web_recheck_days": 30,
    "web_contact": "",                 # optional contact in the crawler's User-Agent
    # AI
    "llm_enabled": False,
    "llm_url": "http://127.0.0.1:11434",
    "llm_model": "qwen2.5:3b",
    "llm_timeout": 180,
    # tagging profiles (configurable, never merged into one universal rule)
    "tag_profiles": [{"name": "Default", "count": 2, "format": "", "note": "Edit to match your current workflow."}],
    "active_tag_profile": "Default",
    "privacy_log_ticket_text": False,
}


def data_dir() -> Path:
    d = Path(os.environ.get("TKB_DATA_DIR", ROOT / "data"))
    d.mkdir(parents=True, exist_ok=True)
    return d


def db_path() -> Path:
    return data_dir() / "knowledge.db"


def docs_dir() -> Path:
    d = data_dir() / "documents"
    d.mkdir(parents=True, exist_ok=True)
    return d


def backups_dir() -> Path:
    d = data_dir() / "backups"
    d.mkdir(parents=True, exist_ok=True)
    return d
