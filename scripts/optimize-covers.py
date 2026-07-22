#!/usr/bin/env python3
"""Generate card-sized WebP thumbs for post cover images (max width 720)."""

from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # Cloudflare Pages / CI may not ship Pillow
    Image = None  # type: ignore[misc, assignment]

ROOT = Path(__file__).resolve().parents[1]
CONTENT = ROOT / "src" / "content"
PUBLIC = ROOT / "public"
MAX_WIDTH = 720
QUALITY = 76


def collect_covers() -> set[str]:
    covers: set[str] = set()
    for path in CONTENT.rglob("*.md"):
        text = path.read_text(encoding="utf-8", errors="ignore")
        match = re.search(r'^cover_image:\s*["\']?([^"\'\n]+)', text, re.M)
        if match:
            covers.add(match.group(1).strip())
    return covers


def card_path(src: str) -> Path:
    relative = src.lstrip("/")
    if relative.startswith("images/"):
        relative = "images/cards/" + relative[len("images/") :]
    else:
        relative = "images/cards/" + relative
    return PUBLIC / Path(relative).with_suffix(".webp")


def optimize(src_url: str) -> bool:
    if Image is None:
        return False

    src = PUBLIC / src_url.lstrip("/")
    dest = card_path(src_url)
    if not src.exists():
        print(f"skip missing: {src_url}", file=sys.stderr)
        return False

    dest.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(src) as im:
        im = im.convert("RGB") if im.mode not in ("RGB", "RGBA") else im
        if im.mode == "RGBA":
            bg = Image.new("RGB", im.size, (255, 255, 255))
            bg.paste(im, mask=im.split()[-1])
            im = bg
        elif im.mode != "RGB":
            im = im.convert("RGB")

        w, h = im.size
        if w > MAX_WIDTH:
            ratio = MAX_WIDTH / w
            im = im.resize((MAX_WIDTH, max(1, int(h * ratio))), Image.Resampling.LANCZOS)

        im.save(dest, "WEBP", quality=QUALITY, method=6)

    before = src.stat().st_size
    after = dest.stat().st_size
    print(f"ok {src_url} -> {dest.relative_to(PUBLIC)} ({before // 1024}KiB -> {after // 1024}KiB)")
    return True


def main() -> int:
    if Image is None:
        print("skip card optimize: Pillow not installed", file=sys.stderr)
        return 0

    covers = collect_covers()
    ok = sum(1 for cover in sorted(covers) if optimize(cover))
    print(f"done: {ok}/{len(covers)} card images")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
