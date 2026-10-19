"""Brand settings (colours, fonts, handle) loaded once from brand.json."""
import json
from functools import lru_cache
from pathlib import Path

from PIL import ImageFont

ROOT = Path(__file__).resolve().parent.parent  # social-autopilot/


@lru_cache(maxsize=1)
def brand() -> dict:
    return json.loads((ROOT / "brand.json").read_text(encoding="utf-8"))


def color(name: str) -> tuple[int, int, int]:
    value = brand()["colors"][name].lstrip("#")
    return tuple(int(value[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


@lru_cache(maxsize=64)
def font(weight: str, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(ROOT / brand()["fonts"][weight]), size)
