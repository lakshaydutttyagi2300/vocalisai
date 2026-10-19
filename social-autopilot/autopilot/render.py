"""Branded slide renderer (Pillow). Used for carousel images and as the frames of reels.

Text wrapped in *asterisks* is drawn in the accent colour, e.g. "Stop saying *I am hardworking*".
"""
from __future__ import annotations

import re
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

from .brand import brand, color, font
from .post import Post

CAROUSEL_SIZE = (1080, 1350)
REEL_SIZE = (1080, 1920)


# ---------- text layout ----------

def _tokens(text: str) -> list[tuple[str, bool]]:
    """Split into (word, highlighted) pairs; *...* marks a highlighted run."""
    out, hl = [], False
    for part in text.replace("\n", " \n ").split(" "):
        if not part:
            continue
        if part == "\n":
            out.append(("\n", False))
            continue
        if part.startswith("*"):
            hl, part = True, part[1:]
        end = re.match(r"^(.*?)\*(\W*)$", part)
        if end:
            part = end.group(1) + end.group(2)
        if part:
            out.append((part, hl))
        if end:
            hl = False
    return out


def _wrap(tokens, fnt, max_width: int) -> list[list[tuple[str, bool]]]:
    lines, line, width = [], [], 0
    space = fnt.getlength(" ")
    for word, hl in tokens:
        if word == "\n":
            lines.append(line)
            line, width = [], 0
            continue
        w = fnt.getlength(word)
        if line and width + space + w > max_width:
            lines.append(line)
            line, width = [], 0
        width += (space if line else 0) + w
        line.append((word, hl))
    if line:
        lines.append(line)
    return lines


def fit_text(text: str, weight: str, box_w: int, box_h: int, max_size: int, min_size: int, spacing: float = 1.18):
    """Largest font size (max..min) at which the text fits the box. Returns (font, lines, line_h)."""
    toks = _tokens(text)
    size = max_size
    while True:
        fnt = font(weight, size)
        lines = _wrap(toks, fnt, box_w)
        line_h = int(size * spacing)
        if (len(lines) * line_h <= box_h and all(fnt.getlength(" ".join(w for w, _ in ln)) <= box_w for ln in lines)) or size <= min_size:
            return fnt, lines, line_h
        size -= 2


def draw_text(draw: ImageDraw.ImageDraw, xy, text: str, weight: str, box_w: int, box_h: int,
              max_size: int, min_size: int, fill, highlight, align: str = "left", spacing: float = 1.18) -> int:
    """Draw wrapped rich text inside a box; returns the height actually used."""
    fnt, lines, line_h = fit_text(text, weight, box_w, box_h, max_size, min_size, spacing)
    x0, y = xy
    space = fnt.getlength(" ")
    for ln in lines:
        lw = sum(fnt.getlength(w) for w, _ in ln) + space * max(len(ln) - 1, 0)
        x = x0 + (box_w - lw) / 2 if align == "center" else x0
        for word, hl in ln:
            draw.text((x, y), word, font=fnt, fill=highlight if hl else fill)
            x += fnt.getlength(word) + space
        y += line_h
    return len(lines) * line_h


# ---------- backgrounds and chrome ----------

def background(size: tuple[int, int]) -> Image.Image:
    w, h = size
    top, bottom = color("bg"), color("bg2")
    grad = Image.new("RGB", (1, h))
    for y in range(h):
        t = y / (h - 1)
        grad.putpixel((0, y), tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    img = grad.resize((w, h))
    # Soft accent glow in the corner for depth.
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    g = ImageDraw.Draw(glow)
    r = int(w * 0.55)
    g.ellipse((w - r // 1.4, -r // 2.2, w + r // 1.4, r // 1.6), fill=(*color("accent"), 70))
    glow = glow.filter(ImageFilter.GaussianBlur(120))
    img = Image.alpha_composite(img.convert("RGBA"), glow)
    return img.convert("RGB")


def pill(draw: ImageDraw.ImageDraw, xy, text: str, size: int = 30, fill=None, text_fill=None, pad=(26, 12)) -> tuple[int, int]:
    fnt = font("heavy", size)
    tw = fnt.getlength(text)
    x, y = xy
    h = size + pad[1] * 2 + 6
    w = int(tw + pad[0] * 2)
    draw.rounded_rectangle((x, y, x + w, y + h), radius=h // 2, fill=fill or color("accent"))
    draw.text((x + pad[0], y + pad[1] - 1), text, font=fnt, fill=text_fill or color("text"))
    return w, h


def footer(draw: ImageDraw.ImageDraw, size, margin: int, bottom_pad: int, index: int, total: int, label: str = ""):
    w, h = size
    y = h - bottom_pad
    draw.text((margin, y), brand()["handle"], font=font("medium", 30), fill=color("muted"))
    # progress dots
    dot, gap = 12, 14
    x = w - margin - total * (dot + gap) + gap
    for i in range(total):
        fill = color("accent") if i == index else (*color("muted"), )
        r = dot if i == index else dot - 4
        cx = x + i * (dot + gap) + dot / 2
        draw.ellipse((cx - r / 2, y + 22 - r / 2, cx + r / 2, y + 22 + r / 2), fill=fill)
    if label:
        lw = font("medium", 30).getlength(label)
        draw.text(((w - lw) / 2, y), label, font=font("medium", 30), fill=color("accent"))


# ---------- slides ----------

def _layout(size):
    """Margins and safe area. Reels keep text clear of Instagram's top bar and caption area."""
    w, h = size
    if h > 1500:
        return {"margin": 90, "top": 260, "bottom": 420, "footer": 330}
    return {"margin": 90, "top": 110, "bottom": 170, "footer": 110}


def cover_slide(post: Post, size, total: int) -> Image.Image:
    img = background(size)
    d = ImageDraw.Draw(img)
    L = _layout(size)
    w, h = size
    box_w = w - 2 * L["margin"]
    pill(d, (L["margin"], L["top"]), post.pillar.upper(), size=30)
    area_top = L["top"] + 120
    area_h = h - area_top - L["bottom"] - 60
    fnt, lines, line_h = fit_text(post.hook, "heavy", box_w, area_h, 134 if h > 1500 else 124, 54, 1.1)
    used = len(lines) * line_h
    y = area_top + (area_h - used) // 2 - 30
    draw_text(d, (L["margin"], y), post.hook, "heavy", box_w, area_h, fnt.size, fnt.size, color("text"), color("accent"), spacing=1.1)
    # accent underline bar
    d.rounded_rectangle((L["margin"], y + used + 36, L["margin"] + 140, y + used + 48), radius=6, fill=color("accent"))
    footer(d, size, L["margin"], L["footer"], 0, total, "Swipe  >" if h < 1500 else "")
    return img


def content_slide(post: Post, idx: int, size, total: int) -> Image.Image:
    slide = post.slides[idx]
    img = background(size)
    d = ImageDraw.Draw(img)
    L = _layout(size)
    w, h = size
    m = L["margin"]
    box_w = w - 2 * m
    # number badge
    n = str(idx + 1)
    bs = 96
    nf = font("heavy", 52)
    # card: sized to its text and centred in the free area, so short tips don't float in white space
    area_top = L["top"] + bs + 50
    area_bottom = h - L["bottom"]
    inner = 60
    cw = box_w + 20 - 2 * inner
    ch = area_bottom - area_top - 2 * inner
    has_body = bool(slide.body)
    big = h > 1500
    t_font, t_lines, t_lh = fit_text(slide.title, "heavy", cw, int(ch * (0.45 if has_body else 1.0)), 92 if big else 82, 40, 1.14)
    title_h = len(t_lines) * t_lh
    gap = 34 + 8 + 44
    body_h, b_size = 0, 0
    if has_body:
        b_font, b_lines, b_lh = fit_text(slide.body, "regular", cw, ch - title_h - gap, 58 if big else 52, 28, 1.42)
        body_h, b_size = len(b_lines) * b_lh, b_font.size
    card_h = 2 * inner + title_h + (gap + body_h if has_body else 0)
    card_top = area_top + max(0, (area_bottom - area_top - card_h) // 2 - 40)
    card_bottom = card_top + card_h
    d.rounded_rectangle((m - 10, card_top, w - m + 10, card_bottom), radius=36, fill=color("card"))
    draw_text(d, (m - 10 + inner, card_top + inner), slide.title, "heavy", cw, title_h + 1,
              t_font.size, t_font.size, color("card_text"), color("accent"), spacing=1.14)
    if has_body:
        y = card_top + inner + title_h + 34
        d.rounded_rectangle((m - 10 + inner, y, m - 10 + inner + 90, y + 8), radius=4, fill=color("accent"))
        y += 52
        draw_text(d, (m - 10 + inner, y), slide.body, "regular", cw, body_h + 1,
                  b_size, b_size, color("card_text"), color("accent"), spacing=1.42)
    # number badge sits just above the card
    d.ellipse((m, card_top - bs - 30, m + bs, card_top - 30), fill=color("accent"))
    d.text((m + (bs - nf.getlength(n)) / 2, card_top - bs - 18), n, font=nf, fill=color("text"))
    footer(d, size, m, L["footer"], idx + 1, total)
    return img


def cta_slide(post: Post, size, total: int) -> Image.Image:
    img = background(size)
    d = ImageDraw.Draw(img)
    L = _layout(size)
    w, h = size
    m = L["margin"]
    box_w = w - 2 * m
    big = h > 1500
    head = "Save this for your *next interview*"
    hf, hl, hlh = fit_text(head, "heavy", box_w, 420, 104 if big else 92, 48, 1.1)
    cf, cl, clh = fit_text(post.cta, "medium", box_w, 380, 56 if big else 50, 30, 1.35)
    block = len(hl) * hlh + 70 + len(cl) * clh + 80 + 90 + 60 + 40
    y = L["top"] + max(0, (h - L["top"] - L["bottom"] - block) // 2)
    used = draw_text(d, (m, y), head, "heavy", box_w, len(hl) * hlh + 1, hf.size, hf.size,
                     color("text"), color("accent"), spacing=1.1)
    y += used + 70
    used = draw_text(d, (m, y), post.cta, "medium", box_w, len(cl) * clh + 1, cf.size, cf.size,
                     color("muted"), color("accent"), spacing=1.35)
    y += used + 80
    pill(d, (m, y), brand()["website"], size=42, fill=color("accent"), pad=(38, 20))
    d.text((m, y + 130), f"Follow {brand()['handle']} for a new tip every day", font=font("medium", 34 if big else 30), fill=color("text"))
    footer(d, size, m, L["footer"], total - 1, total)
    return img


def slides_for(post: Post, size) -> list[Image.Image]:
    total = len(post.slides) + 2
    frames = [cover_slide(post, size, total)]
    frames += [content_slide(post, i, size, total) for i in range(len(post.slides))]
    frames.append(cta_slide(post, size, total))
    return frames


def render_carousel(post: Post, out_dir: Path) -> list[Path]:
    """1080x1350 JPEG slides (Instagram accepts only JPEG images)."""
    out_dir.mkdir(parents=True, exist_ok=True)
    paths = []
    for i, frame in enumerate(slides_for(post, CAROUSEL_SIZE)):
        p = out_dir / f"{post.id}-{i + 1:02d}.jpg"
        frame.save(p, "JPEG", quality=92, optimize=True)
        paths.append(p)
    return paths
