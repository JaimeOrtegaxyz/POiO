"""
The device picture on the landing page: the face layers from public/face/
(shell, pills at rest, the star at rest and its shadow) composited into one
transparent image, with the screen showing what the panel holds when the
device is off, the hen from assets/chicken-color.svg, muted the way the color
e-paper mutes it.

Hand-run after the face or the hen changes:
    /opt/homebrew/opt/python@3.11/bin/python3.11 -I scripts/landing/device-shot.py

Needs Pillow and numpy, and rsvg-convert (librsvg) to rasterize the hen.
Writes public/landing/device-{1100,640}.webp.
"""
import io
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

MOCKUP = Path(__file__).resolve().parents[2]
REPO = MOCKUP.parent
FACE = MOCKUP / 'public' / 'face'
OUT = MOCKUP / 'public' / 'landing'
SRC_W = 1240            # the face layer set to build from
WIDTHS = (1100, 640)    # what the landing serves

# The Kaleido 3 profile's on-panel paper (src/screen/profiles.ts), and how much
# the panel's color filter mutes saturated color (its `desaturate`).
PAPER = (0xDD, 0xDD, 0xCC)
DESATURATE = 0.4
HEN_OF_HEIGHT = 0.62    # src/flows/sleep.ts


def layer(name: str) -> Image.Image:
    return Image.open(FACE / f'{name}-{SRC_W}.webp')


def box(b: dict, k: float) -> tuple[int, int, int, int]:
    return round(b['x'] * k), round(b['y'] * k), round(b['w'] * k), round(b['h'] * k)


def hen(size: int) -> Image.Image:
    png = subprocess.run(['rsvg-convert', '-w', str(size), '-h', str(size), str(REPO / 'assets' / 'chicken-color.svg')],
                         check=True, capture_output=True).stdout
    return Image.open(io.BytesIO(png)).convert('RGBA')


def panel(w: int, h: int) -> Image.Image:
    """The sleep image as the panel shows it: paper, the hen, muted, a little shade under the shell's lip."""
    img = Image.new('RGBA', (w, h), PAPER + (255,))
    s = round(h * HEN_OF_HEIGHT)
    img.alpha_composite(hen(s), ((w - s) // 2, (h - s) // 2))
    a = np.asarray(img).astype(np.float32)
    rgb = a[..., :3]
    lum = (rgb * np.array([0.2126, 0.7152, 0.0722], np.float32)).sum(-1, keepdims=True)
    rgb = rgb * (1 - DESATURATE) + lum * DESATURATE
    # The opening's lip shades the top of the panel (the demo's inset shadow).
    y = np.arange(h, dtype=np.float32)[:, None, None]
    rgb = rgb * (1 - 0.22 * np.exp(-y / (h * 0.03)))
    a[..., :3] = np.clip(rgb, 0, 255)
    return Image.fromarray(a.astype(np.uint8), 'RGBA')


def main() -> None:
    f = json.loads((MOCKUP / 'src' / 'device' / 'face.json').read_text())
    k = SRC_W / f['width']
    face = layer('face')
    W, H = face.size
    out = Image.new('RGBA', (W, H), (0, 0, 0, 0))

    # The panel sits behind the shell; a few pixels larger so the shell's edge covers it.
    hx, hy, hw, hh = box(f['hole'], k)
    m = 6
    out.alpha_composite(panel(hw + 2 * m, hh + 2 * m), (hx - m, hy - m))
    out.alpha_composite(face)

    # The star's shadow is a multiply layer on the shell.
    sx, sy, sw, sh = box(f['shadow'], k)
    shade = np.asarray(layer('knob-shadow-0').convert('RGB').resize((sw, sh)), np.float32) / 255
    o = np.asarray(out).astype(np.float32)
    o[sy:sy + sh, sx:sx + sw, :3] *= shade
    out = Image.fromarray(np.clip(o, 0, 255).astype(np.uint8), 'RGBA')

    for name in ('back', 'home'):
        lx, ly, lw, lh = box(f['pills'][name]['layer'], k)
        out.alpha_composite(layer(f'pill-{name}-up').resize((lw, lh), Image.LANCZOS), (lx, ly))
    kx, ky, kw, kh = box(f['knob'], k)
    out.alpha_composite(layer('knob-0').resize((kw, kh), Image.LANCZOS), (kx, ky))

    OUT.mkdir(exist_ok=True)
    for w in WIDTHS:
        img = out.resize((w, round(H * w / W)), Image.LANCZOS)
        img.save(OUT / f'device-{w}.webp', 'WEBP', quality=88, alpha_quality=95, method=6)
        print(OUT / f'device-{w}.webp', img.size)


if __name__ == '__main__':
    main()
