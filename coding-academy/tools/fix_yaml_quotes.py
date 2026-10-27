"""Developer tool: quote YAML values in lesson exercise/quiz blocks that would confuse the YAML parser.

A plain YAML value containing ": " (colon + space) or " #" is misread, and single words such as NULL, Yes or
False become None/True/False instead of text. This tool wraps such values in single quotes inside ```exercise
and ```quiz blocks. It only touches simple one-line entries.

Run from the coding-academy folder:   python tools/fix_yaml_quotes.py [files...]
(no arguments = all lesson files under content/ and my_content/)
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BLOCK = re.compile(r"^```(exercise|quiz)[ \t]*\n(.*?)^```[ \t]*$", re.S | re.M)
LINE = re.compile(r"^(\s*(?:- )?)(question|explanation|title|name|text|summary): (.+)$")
# Single words that YAML would turn into None/True/False instead of text (quiz options and answers).
SPECIAL_WORD = re.compile(r"^(\s*(?:- |answer: |- answer: ))(null|Null|NULL|~|true|True|TRUE|false|False|FALSE|"
                          r"yes|Yes|YES|no|No|NO|on|On|ON|off|Off|OFF)[ \t]*$")
SAFE_START = ("'", '"', "[", "{", "|", ">")


def fix_value(value: str) -> str:
    if value.startswith(SAFE_START):
        return value
    if ": " in value or " #" in value or value.endswith(":"):
        return "'" + value.replace("'", "''") + "'"
    return value


def fix_block(block: str) -> str:
    lines = []
    for line in block.split("\n"):
        special = SPECIAL_WORD.match(line)
        if special:
            line = f"{special.group(1)}'{special.group(2)}'"
        match = LINE.match(line)
        if match:
            prefix, key, value = match.groups()
            line = f"{prefix}{key}: {fix_value(value)}"
        lines.append(line)
    return "\n".join(lines)


def fix_file(path: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    new = BLOCK.sub(lambda m: f"```{m.group(1)}\n{fix_block(m.group(2))}```", text)
    if new != text:
        path.write_text(new, encoding="utf-8")
        return True
    return False


def main(args: list[str]) -> None:
    files = [Path(a) for a in args] or sorted(
        list((ROOT / "content").glob("*/level-*/*.md")) + list((ROOT / "my_content" / "lessons").glob("**/*.md")))
    for path in files:
        if fix_file(path):
            print("fixed", path.relative_to(ROOT) if path.is_absolute() else path)


if __name__ == "__main__":
    main(sys.argv[1:])
