"""Reel renderer: branded slides -> 1080x1920 MP4 with gentle motion and cross-fades (ffmpeg).

Music: drop royalty-free tracks you have the rights to into assets/music/ (mp3/m4a). One is
picked per post and mixed quietly under the video. With no tracks, the reel has a silent audio
track (Instagram accepts it; you can also add trending audio in the Instagram app).
"""
from __future__ import annotations

import hashlib
import shutil
import subprocess
import tempfile
from pathlib import Path

from .brand import ROOT
from .post import Post
from .render import REEL_SIZE, slides_for

FPS = 30
FADE = 0.45
MUSIC_DIR = ROOT / "assets" / "music"


def _durations(post: Post) -> list[float]:
    def read_time(text: str) -> float:
        return min(6.5, 2.0 + 0.30 * len(text.split()))

    durs = [max(2.6, read_time(post.hook) - 0.4)]
    durs += [read_time(f"{s.title} {s.body}") for s in post.slides]
    durs.append(3.4)
    return [round(d, 2) for d in durs]


def _pick_music(post_id: str) -> Path | None:
    if not MUSIC_DIR.exists():
        return None
    tracks = sorted(p for p in MUSIC_DIR.iterdir() if p.suffix.lower() in {".mp3", ".m4a", ".aac", ".wav"})
    if not tracks:
        return None
    idx = int(hashlib.sha1(post_id.encode()).hexdigest(), 16) % len(tracks)
    return tracks[idx]


def render_reel(post: Post, out_dir: Path) -> tuple[Path, Path]:
    """Returns (video.mp4, cover.jpg)."""
    if not shutil.which("ffmpeg"):
        raise RuntimeError("ffmpeg is not installed")
    out_dir.mkdir(parents=True, exist_ok=True)
    frames = slides_for(post, REEL_SIZE)
    durs = _durations(post)
    w, h = REEL_SIZE
    sw, sh = int(w * 1.06) // 2 * 2, int(h * 1.06) // 2 * 2

    with tempfile.TemporaryDirectory() as tmp:
        tmpd = Path(tmp)
        args = ["ffmpeg", "-y", "-loglevel", "error"]
        for i, (frame, d) in enumerate(zip(frames, durs)):
            p = tmpd / f"s{i}.png"
            frame.save(p)
            args += ["-loop", "1", "-framerate", str(FPS), "-t", str(d + FADE), "-i", str(p)]

        filters = []
        for i, d in enumerate(durs):
            # Slow drift from one corner toward the centre: subtle motion keeps viewers watching.
            dx = "(in_w-out_w)*(1-t/{0})".format(d + FADE) if i % 2 == 0 else "(in_w-out_w)*(t/{0})".format(d + FADE)
            filters.append(
                f"[{i}:v]scale={sw}:{sh},crop={w}:{h}:x='{dx}':y='(in_h-out_h)/2',"
                f"fps={FPS},format=yuv420p,setsar=1[v{i}]"
            )
        prev, offset = "v0", 0.0
        for i in range(1, len(durs)):
            offset += durs[i - 1]
            out = f"x{i}"
            filters.append(f"[{prev}][v{i}]xfade=transition=fade:duration={FADE}:offset={offset:.2f}[{out}]")
            prev = out
        total = sum(durs) + FADE

        music = _pick_music(post.id)
        n = len(frames)
        if music:
            args += ["-stream_loop", "-1", "-i", str(music)]
            filters.append(f"[{n}:a]volume=0.35,afade=t=out:st={total - 1.5:.2f}:d=1.5,atrim=0:{total:.2f}[a]")
        else:
            args += ["-f", "lavfi", "-t", f"{total:.2f}", "-i", "anullsrc=r=44100:cl=stereo"]
            filters.append(f"[{n}:a]anull[a]")

        video = out_dir / f"{post.id}.mp4"
        args += [
            "-filter_complex", ";".join(filters),
            "-map", f"[{prev}]", "-map", "[a]",
            "-c:v", "libx264", "-profile:v", "high", "-preset", "medium", "-crf", "20",
            "-pix_fmt", "yuv420p", "-r", str(FPS),
            "-c:a", "aac", "-b:a", "128k", "-ar", "44100",
            "-t", f"{total:.2f}", "-movflags", "+faststart", str(video),
        ]
        subprocess.run(args, check=True)

    cover = out_dir / f"{post.id}-cover.jpg"
    frames[0].save(cover, "JPEG", quality=92)
    return video, cover
