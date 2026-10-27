"""Loads lessons, exercises, quizzes, projects and articles from text files.

Nothing here knows about the user interface. The content lives in:

    content/python/level-XX/*.md     Python lessons
    content/sql/level-XX/*.md        SQL lessons
    content/<track>/levels.yaml      level titles and descriptions
    content/sql/datasets/*.sql       sample databases for SQL practice
    content/projects/<track>/*.md    practical projects
    content/knowledge/*.md           knowledge-base articles
    content/help/*.md                help pages
    my_content/lessons/**/*.md       YOUR extra lessons (same format)
    my_content/knowledge/**/*.md     YOUR extra articles

See docs/CONTENT_FORMAT.md for the exact file format.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import yaml

from academy import paths

TRACKS = ("python", "sql")
TRACK_NAMES = {"python": "Python", "sql": "SQL"}
DIFFICULTIES = ("beginner", "intermediate", "challenge")
STANDARD_SECTIONS = (
    "Simple explanation",
    "Real-world analogy",
    "Technical definition",
    "Step-by-step examples",
    "Common mistakes",
    "Practical application",
    "Revision notes",
)

_FRONT_MATTER = re.compile(r"\A---[ \t]*\r?\n(.*?)\r?\n---[ \t]*\r?\n", re.S)
_SPECIAL_BLOCK = re.compile(r"^```(exercise|quiz)[ \t]*\r?\n(.*?)^```[ \t]*$", re.S | re.M)
_SECTION = re.compile(r"^## +(.+?)[ \t]*$", re.M)


@dataclass
class Exercise:
    id: str
    lesson_id: str
    kind: str  # "python" or "sql"
    title: str
    difficulty: str
    instructions: str
    starter: str = ""
    hints: list[str] = field(default_factory=list)
    solution: str = ""
    explanation: str = ""
    check: dict = field(default_factory=dict)
    stdin: str = ""  # suggested input for programs that use input()
    dataset: str = ""  # SQL exercises: which sample database

    @property
    def key(self) -> str:
        return f"{self.lesson_id}/{self.id}"

    @property
    def is_manual(self) -> bool:
        return self.check.get("type") == "manual"


@dataclass
class QuizQuestion:
    id: str
    lesson_id: str
    type: str  # "choice" or "text"
    question: str
    answer: object
    options: list[str] = field(default_factory=list)
    explanation: str = ""
    code: str = ""
    code_language: str = ""

    @property
    def key(self) -> str:
        return f"{self.lesson_id}/{self.id}"

    def is_correct(self, given: object) -> bool:
        if given is None:
            return False
        if self.type == "choice":
            return str(given) == str(self.answer)
        accepted = self.answer if isinstance(self.answer, list) else [self.answer]
        return normalise_answer(str(given)) in {normalise_answer(str(a)) for a in accepted}

    @property
    def correct_text(self) -> str:
        if isinstance(self.answer, list):
            return str(self.answer[0])
        return str(self.answer)


def normalise_answer(text: str) -> str:
    text = text.strip().strip(";").strip()
    text = re.sub(r"\s+", " ", text)
    return text.lower()


@dataclass
class Lesson:
    id: str
    track: str
    level: int
    order: int
    title: str
    path: Path
    minutes: int = 20
    summary: str = ""
    objectives: list[str] = field(default_factory=list)
    prerequisites: list[str] = field(default_factory=list)
    next: str = ""
    tags: list[str] = field(default_factory=list)
    sections: list[tuple[str, str]] = field(default_factory=list)
    intro: str = ""
    exercises: list[Exercise] = field(default_factory=list)
    quiz: list[QuizQuestion] = field(default_factory=list)
    source: str = "built-in"  # or "my_content"

    def section(self, name: str) -> str:
        for heading, body in self.sections:
            if heading.lower() == name.lower():
                return body
        return ""

    @property
    def full_text(self) -> str:
        return "\n\n".join([self.title, self.summary, self.intro] + [f"{h}\n{b}" for h, b in self.sections])


@dataclass
class Level:
    track: str
    number: int
    title: str
    description: str = ""
    lessons: list[Lesson] = field(default_factory=list)


@dataclass
class ProjectTask:
    id: str
    text: str


@dataclass
class ProjectStage:
    name: str
    description: str
    tasks: list[ProjectTask]
    required: bool = True


@dataclass
class Project:
    id: str
    track: str
    title: str
    order: int
    difficulty: str
    summary: str
    body: str
    path: Path
    stages: list[ProjectStage] = field(default_factory=list)
    starter: str = ""
    dataset: str = ""
    internet: bool = False
    skills: list[str] = field(default_factory=list)

    @property
    def required_task_ids(self) -> list[str]:
        return [t.id for s in self.stages if s.required for t in s.tasks]


@dataclass
class Article:
    id: str
    title: str
    category: str
    body: str
    path: Path
    order: int = 100
    tags: list[str] = field(default_factory=list)
    source: str = "built-in"

    def sections(self) -> list[tuple[str, str]]:
        """Split into (heading, text) pairs at '## ' headings (used by search)."""
        parts = _SECTION.split(self.body)
        result = []
        if parts[0].strip():
            result.append(("", parts[0].strip()))
        for i in range(1, len(parts), 2):
            result.append((parts[i].strip(), parts[i + 1].strip()))
        return result


@dataclass
class Library:
    lessons: dict[str, Lesson] = field(default_factory=dict)
    levels: dict[str, list[Level]] = field(default_factory=dict)
    projects: dict[str, Project] = field(default_factory=dict)
    articles: dict[str, Article] = field(default_factory=dict)
    problems: list[str] = field(default_factory=list)

    def track_lessons(self, track: str) -> list[Lesson]:
        return [lesson for level in self.levels.get(track, []) for lesson in level.lessons]

    def all_lessons(self) -> list[Lesson]:
        return [lesson for track in TRACKS for lesson in self.track_lessons(track)]

    def exercises(self, kind: str | None = None) -> list[Exercise]:
        return [ex for lesson in self.all_lessons() for ex in lesson.exercises if kind in (None, ex.kind)]

    def find_exercise(self, key: str) -> Exercise | None:
        lesson_id, _, exercise_id = key.partition("/")
        lesson = self.lessons.get(lesson_id)
        if not lesson:
            return None
        return next((ex for ex in lesson.exercises if ex.id == exercise_id), None)

    def next_lesson(self, lesson: Lesson) -> Lesson | None:
        if lesson.next and lesson.next in self.lessons:
            return self.lessons[lesson.next]
        ordered = self.track_lessons(lesson.track)
        for index, item in enumerate(ordered):
            if item.id == lesson.id and index + 1 < len(ordered):
                return ordered[index + 1]
        return None

    def previous_lesson(self, lesson: Lesson) -> Lesson | None:
        ordered = self.track_lessons(lesson.track)
        for index, item in enumerate(ordered):
            if item.id == lesson.id and index > 0:
                return ordered[index - 1]
        return None

    def level_of(self, lesson: Lesson) -> Level | None:
        return next((lv for lv in self.levels.get(lesson.track, []) if lv.number == lesson.level), None)

    def articles_by_category(self) -> dict[str, list[Article]]:
        grouped: dict[str, list[Article]] = {}
        for article in sorted(self.articles.values(), key=lambda a: (a.order, a.title)):
            grouped.setdefault(article.category, []).append(article)
        return grouped


# ---------------------------------------------------------------- parsing


def split_front_matter(text: str) -> tuple[dict, str]:
    match = _FRONT_MATTER.match(text)
    if not match:
        return {}, text
    data = yaml.safe_load(match.group(1)) or {}
    if not isinstance(data, dict):
        raise ValueError("the block between the --- lines must be 'name: value' pairs")
    return data, text[match.end():]


def _as_list(value) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _text(value) -> str:
    return "" if value is None else str(value)


def _parse_exercise(data: dict, lesson_id: str, track: str, number: int) -> Exercise:
    if not isinstance(data, dict):
        raise ValueError(f"exercise block {number} is not a list of 'name: value' pairs")
    exercise_id = _text(data.get("id") or f"ex{number}")
    difficulty = _text(data.get("difficulty") or "beginner").lower()
    if difficulty not in DIFFICULTIES:
        raise ValueError(f"exercise '{exercise_id}': difficulty must be one of {', '.join(DIFFICULTIES)}")
    kind = _text(data.get("kind") or track)
    check = data.get("check") or {}
    if not isinstance(check, dict):
        raise ValueError(f"exercise '{exercise_id}': 'check' must be name: value pairs")
    if not data.get("instructions"):
        raise ValueError(f"exercise '{exercise_id}' has no instructions")
    if check.get("type") != "manual" and not data.get("solution"):
        raise ValueError(f"exercise '{exercise_id}' has no solution")
    if kind == "sql" and check.get("type") != "manual" and not data.get("dataset"):
        raise ValueError(f"SQL exercise '{exercise_id}' needs a dataset")
    return Exercise(
        id=exercise_id,
        lesson_id=lesson_id,
        kind=kind,
        title=_text(data.get("title") or exercise_id),
        difficulty=difficulty,
        instructions=_text(data.get("instructions")).strip(),
        starter=_text(data.get("starter")),
        hints=[_text(h).strip() for h in _as_list(data.get("hints"))],
        solution=_text(data.get("solution")),
        explanation=_text(data.get("explanation")).strip(),
        check=check,
        stdin=_text(data.get("stdin")),
        dataset=_text(data.get("dataset")),
    )


def _parse_quiz(data, lesson_id: str) -> list[QuizQuestion]:
    if not isinstance(data, list):
        raise ValueError("a quiz block must be a list of questions (each starting with '- id:')")
    questions = []
    for number, item in enumerate(data, 1):
        if not isinstance(item, dict):
            raise ValueError(f"quiz question {number} is not 'name: value' pairs")
        qtype = _text(item.get("type") or ("choice" if item.get("options") else "text"))
        question = QuizQuestion(
            id=_text(item.get("id") or f"q{number}"),
            lesson_id=lesson_id,
            type=qtype,
            question=_text(item.get("question")).strip(),
            answer=item.get("answer"),
            options=[_text(o) for o in _as_list(item.get("options"))],
            explanation=_text(item.get("explanation")).strip(),
            code=_text(item.get("code")),
            code_language=_text(item.get("language")),
        )
        if not question.question:
            raise ValueError(f"quiz question '{question.id}' has no question text")
        if question.answer is None:
            raise ValueError(f"quiz question '{question.id}' has no answer")
        if qtype == "choice" and str(question.answer) not in question.options:
            raise ValueError(f"quiz question '{question.id}': the answer must be exactly one of the options")
        questions.append(question)
    return questions


def parse_lesson(path: Path, source: str = "built-in") -> Lesson:
    text = path.read_text(encoding="utf-8")
    meta, body = split_front_matter(text)
    for required in ("id", "title", "track", "level"):
        if required not in meta:
            raise ValueError(f"the front matter is missing '{required}'")
    track = _text(meta["track"]).lower()
    if track not in TRACKS:
        raise ValueError(f"track must be one of {', '.join(TRACKS)}")
    lesson_id = _text(meta["id"])

    exercises: list[Exercise] = []
    quiz: list[QuizQuestion] = []
    for match in _SPECIAL_BLOCK.finditer(body):
        kind, block = match.group(1), match.group(2)
        try:
            data = yaml.safe_load(block)
        except yaml.YAMLError as exc:
            raise ValueError(f"a ```{kind} block is not valid YAML: {exc}") from exc
        if kind == "exercise":
            exercises.append(_parse_exercise(data, lesson_id, track, len(exercises) + 1))
        else:
            quiz.extend(_parse_quiz(data, lesson_id))
    body = _SPECIAL_BLOCK.sub("", body)

    parts = _SECTION.split(body)
    intro = parts[0].strip()
    sections = [(parts[i].strip(), parts[i + 1].strip()) for i in range(1, len(parts), 2)]
    sections = [(h, b) for h, b in sections if b or h]

    ids = [e.id for e in exercises]
    if len(ids) != len(set(ids)):
        raise ValueError("two exercises share the same id")
    qids = [q.id for q in quiz]
    if len(qids) != len(set(qids)):
        raise ValueError("two quiz questions share the same id")

    return Lesson(
        id=lesson_id,
        track=track,
        level=int(meta["level"]),
        order=int(meta.get("order", 999)),
        title=_text(meta["title"]),
        path=path,
        minutes=int(meta.get("minutes", 20)),
        summary=_text(meta.get("summary")),
        objectives=[_text(o) for o in _as_list(meta.get("objectives"))],
        prerequisites=[_text(p) for p in _as_list(meta.get("prerequisites"))],
        next=_text(meta.get("next")),
        tags=[_text(t) for t in _as_list(meta.get("tags"))],
        sections=sections,
        intro=intro,
        exercises=exercises,
        quiz=quiz,
        source=source,
    )


def parse_project(path: Path) -> Project:
    meta, body = split_front_matter(path.read_text(encoding="utf-8"))
    for required in ("id", "title", "track"):
        if required not in meta:
            raise ValueError(f"the front matter is missing '{required}'")
    stages = []
    for number, stage in enumerate(_as_list(meta.get("stages")), 1):
        tasks = [
            ProjectTask(id=_text(t.get("id") or f"s{number}t{i}"), text=_text(t.get("text")))
            if isinstance(t, dict) else ProjectTask(id=f"s{number}t{i}", text=_text(t))
            for i, t in enumerate(_as_list(stage.get("tasks")), 1)
        ]
        stages.append(ProjectStage(
            name=_text(stage.get("name") or f"Stage {number}"),
            description=_text(stage.get("description")),
            tasks=tasks,
            required=bool(stage.get("required", True)),
        ))
    return Project(
        id=_text(meta["id"]),
        track=_text(meta["track"]).lower(),
        title=_text(meta["title"]),
        order=int(meta.get("order", 999)),
        difficulty=_text(meta.get("difficulty") or "beginner"),
        summary=_text(meta.get("summary")),
        body=body.strip(),
        path=path,
        stages=stages,
        starter=_text(meta.get("starter")),
        dataset=_text(meta.get("dataset")),
        internet=bool(meta.get("internet", False)),
        skills=[_text(s) for s in _as_list(meta.get("skills"))],
    )


def parse_article(path: Path, default_category: str, source: str = "built-in") -> Article:
    meta, body = split_front_matter(path.read_text(encoding="utf-8"))
    title = _text(meta.get("title"))
    if not title:
        heading = re.search(r"^# +(.+)$", body, re.M)
        title = heading.group(1).strip() if heading else path.stem.replace("-", " ").replace("_", " ").title()
    prefix = "my-" if source != "built-in" else ""
    return Article(
        id=_text(meta.get("id") or f"{prefix}{path.stem}"),
        title=title,
        category=_text(meta.get("category") or default_category),
        body=body.strip(),
        path=path,
        order=int(meta.get("order", 100)),
        tags=[_text(t) for t in _as_list(meta.get("tags"))],
        source=source,
    )


def _load_levels(content_dir: Path, track: str) -> dict[int, tuple[str, str]]:
    path = content_dir / track / "levels.yaml"
    if not path.exists():
        return {}
    data = yaml.safe_load(path.read_text(encoding="utf-8")) or []
    return {int(item["level"]): (_text(item.get("title")), _text(item.get("description"))) for item in data}


def load_library(content_dir: Path | None = None, my_content_dir: Path | None = None) -> Library:
    """Read every content file. Broken files are reported in ``problems`` instead of crashing."""
    content_dir = Path(content_dir or paths.CONTENT_DIR)
    my_content_dir = Path(my_content_dir or paths.MY_CONTENT_DIR)
    library = Library()

    lesson_files: list[tuple[Path, str]] = []
    for track in TRACKS:
        lesson_files += [(p, "built-in") for p in sorted((content_dir / track).glob("level-*/*.md"))]
    lesson_files += [(p, "my_content") for p in sorted((my_content_dir / "lessons").glob("**/*.md"))]

    for path, source in lesson_files:
        try:
            lesson = parse_lesson(path, source)
        except Exception as exc:  # noqa: BLE001 - report, never crash the app
            library.problems.append(f"Lesson file {path.name}: {exc}")
            continue
        if lesson.id in library.lessons:
            library.problems.append(f"Lesson file {path.name}: the id '{lesson.id}' is already used")
            continue
        library.lessons[lesson.id] = lesson

    for track in TRACKS:
        level_info = _load_levels(content_dir, track)
        numbers = sorted({lesson.level for lesson in library.lessons.values() if lesson.track == track})
        levels = []
        for number in numbers:
            title, description = level_info.get(number, (f"Level {number}", ""))
            members = sorted(
                (ls for ls in library.lessons.values() if ls.track == track and ls.level == number),
                key=lambda ls: (ls.order, ls.title),
            )
            levels.append(Level(track, number, title or f"Level {number}", description, members))
        library.levels[track] = levels

    for path in sorted((content_dir / "projects").glob("*/*.md")):
        try:
            project = parse_project(path)
            library.projects[project.id] = project
        except Exception as exc:  # noqa: BLE001
            library.problems.append(f"Project file {path.name}: {exc}")

    article_sources = [
        (content_dir / "knowledge", "Reference", "built-in"),
        (content_dir / "help", "Help", "built-in"),
        (my_content_dir / "knowledge", "My articles", "my_content"),
    ]
    for folder, category, source in article_sources:
        for path in sorted(folder.glob("**/*.md")):
            if path.name.lower() == "readme.md" and source == "my_content":
                continue
            try:
                article = parse_article(path, category, source)
            except Exception as exc:  # noqa: BLE001
                library.problems.append(f"Article file {path.name}: {exc}")
                continue
            if article.id in library.articles:
                library.problems.append(f"Article file {path.name}: the id '{article.id}' is already used")
                continue
            library.articles[article.id] = article

    for lesson in library.lessons.values():
        for prerequisite in lesson.prerequisites:
            if prerequisite not in library.lessons:
                library.problems.append(f"Lesson '{lesson.id}' lists an unknown prerequisite '{prerequisite}'")
    return library


def content_signature(content_dir: Path | None = None, my_content_dir: Path | None = None) -> tuple:
    """A cheap fingerprint of all content files; changes when any file changes."""
    items = []
    for folder in (Path(content_dir or paths.CONTENT_DIR), Path(my_content_dir or paths.MY_CONTENT_DIR)):
        if folder.exists():
            for path in folder.rglob("*"):
                if path.suffix in {".md", ".yaml", ".sql"}:
                    stat = path.stat()
                    items.append((str(path), stat.st_mtime_ns, stat.st_size))
    return tuple(sorted(items))
