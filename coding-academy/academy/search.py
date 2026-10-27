"""Local full-text search over lessons, articles, exercises, projects and notes.

Uses the classic "BM25" ranking formula (the same idea that powers many
search engines) implemented in plain Python: no internet, no AI, no extra
packages. Words are simplified ("loops" -> "loop") so different forms match.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from dataclasses import dataclass, field

from academy.content import Library

_WORD = re.compile(r"[a-z0-9_]+")
STOP_WORDS = {
    "a", "an", "the", "and", "or", "of", "to", "in", "is", "it", "for", "on", "with", "as", "be", "this", "that",
    "are", "at", "by", "you", "your", "can", "how", "what", "do", "does", "i", "if", "we", "will", "from",
    "use", "using", "used", "when", "which", "there", "these", "they", "their", "has", "have", "was", "but",
}


def stem(word: str) -> str:
    if len(word) > 4 and word.endswith("ies"):
        return word[:-3] + "y"
    if len(word) > 5 and word.endswith("ing"):
        return word[:-3]
    if len(word) > 4 and word.endswith("ed") and not word.endswith("eed"):
        return word[:-2]
    if len(word) > 4 and word.endswith(("ches", "shes", "sses", "xes")):
        return word[:-2]
    if len(word) > 3 and word.endswith("s") and not word.endswith(("ss", "us", "is")):
        return word[:-1]
    return word


def tokenize(text: str) -> list[str]:
    return [stem(w) for w in _WORD.findall(text.lower()) if w not in STOP_WORDS]


@dataclass
class SearchDoc:
    kind: str  # lesson | article | exercise | project | note
    item_id: str  # lesson id, article id, exercise key, project id, note id
    title: str
    section: str
    text: str
    track: str = ""
    tokens: Counter = field(default_factory=Counter)
    length: int = 0


@dataclass
class SearchHit:
    doc: SearchDoc
    score: float
    snippet: str


class SearchIndex:
    def __init__(self, docs: list[SearchDoc]):
        self.docs = docs
        for doc in docs:
            tokens = tokenize(doc.title) * 3 + tokenize(doc.section) * 2 + tokenize(doc.text)
            doc.tokens = Counter(tokens)
            doc.length = len(tokens)
        self.avg_length = (sum(d.length for d in docs) / len(docs)) if docs else 1.0
        self.doc_freq: Counter = Counter()
        for doc in docs:
            self.doc_freq.update(doc.tokens.keys())

    def search(self, query: str, limit: int = 30, kinds: set[str] | None = None,
               extra_docs: list[SearchDoc] | None = None) -> list[SearchHit]:
        terms = tokenize(query)
        if not terms:
            return []
        docs = list(self.docs)
        if extra_docs:
            extra = SearchIndex(extra_docs)
            docs += extra.docs
            doc_freq = self.doc_freq + extra.doc_freq
        else:
            doc_freq = self.doc_freq
        n = len(docs)
        k1, b = 1.5, 0.75
        phrase = query.strip().lower()
        hits = []
        for doc in docs:
            if kinds and doc.kind not in kinds:
                continue
            score = 0.0
            matched = 0
            for term in set(terms):
                tf = doc.tokens.get(term, 0)
                if not tf:
                    continue
                matched += 1
                df = doc_freq.get(term, 0)
                idf = math.log(1 + (n - df + 0.5) / (df + 0.5))
                score += idf * tf * (k1 + 1) / (tf + k1 * (1 - b + b * doc.length / max(self.avg_length, 1)))
            if not score:
                continue
            score *= matched / len(set(terms))  # prefer documents matching every word
            if len(phrase) > 3 and phrase in f"{doc.title} {doc.section} {doc.text}".lower():
                score *= 1.5
            hits.append(SearchHit(doc, score, make_snippet(doc.text, query)))
        hits.sort(key=lambda h: -h.score)
        return hits[:limit]


def _plain(text: str) -> str:
    text = re.sub(r"```[a-z]*", " ", text)
    text = re.sub(r"[`#*|>_]{1,}", " ", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    return re.sub(r"\s+", " ", text).strip()


def make_snippet(text: str, query: str, width: int = 220) -> str:
    plain = _plain(text)
    words = [w for w in _WORD.findall(query.lower()) if w not in STOP_WORDS]
    lower = plain.lower()
    position = -1
    for word in words:
        for form in (word, stem(word)):
            position = lower.find(form)
            if position >= 0:
                break
        if position >= 0:
            break
    if position < 0:
        snippet = plain[:width]
        return snippet + ("..." if len(plain) > width else "")
    start = max(0, position - width // 3)
    end = min(len(plain), start + width)
    if start > 0:
        space = plain.find(" ", start)
        start = space + 1 if 0 <= space < position else start
    snippet = ("..." if start > 0 else "") + plain[start:end] + ("..." if end < len(plain) else "")
    for word in sorted(set(words), key=len, reverse=True):
        snippet = re.sub(rf"(?i)\b({re.escape(stem(word))}\w*)", r"**\1**", snippet)
    return snippet.replace("****", "")


def build_index(library: Library) -> SearchIndex:
    docs: list[SearchDoc] = []
    for lesson in library.all_lessons():
        head = "\n".join([lesson.summary, lesson.intro, " ".join(lesson.objectives), " ".join(lesson.tags)])
        docs.append(SearchDoc("lesson", lesson.id, lesson.title, "Overview", head, lesson.track))
        for heading, body in lesson.sections:
            docs.append(SearchDoc("lesson", lesson.id, lesson.title, heading, body, lesson.track))
        for exercise in lesson.exercises:
            docs.append(SearchDoc("exercise", exercise.key, exercise.title, lesson.title,
                                  exercise.instructions, lesson.track))
    for article in library.articles.values():
        for heading, body in article.sections():
            docs.append(SearchDoc("article", article.id, article.title, heading, body))
    for project in library.projects.values():
        tasks = " ".join(t.text for s in project.stages for t in s.tasks)
        docs.append(SearchDoc("project", project.id, project.title, "Project",
                              f"{project.summary}\n{project.body}\n{tasks}", project.track))
    return SearchIndex(docs)


def note_docs(notes: list[dict]) -> list[SearchDoc]:
    return [SearchDoc("note", str(n["id"]), n["title"], n["tags"], n["body"]) for n in notes]
