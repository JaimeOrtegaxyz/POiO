#!/usr/bin/env python3
"""
Build the /demo device chrome from the frontal render (hand-run).

    python3 -I scripts/face/build-face.py            # from mockup/

Reads   ../assets/render-frontal.png   (the head-on render, white background)
Writes  public/face/face-{1240,720}.webp   the body with a transparent
                                           background and a transparent screen
                                           hole; the star knob is painted out
        public/face/star-{1240,720}.webp   the star knob alone, so it can turn
        src/device/face.json               geometry in the trimmed image's pixels

Nothing is redrawn by hand: every pixel kept comes from the render. The
screen hole is the render's own screen area (its paper-white panel), measured
here, not guessed. Needs numpy, opencv-python and Pillow.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
MOCKUP = HERE.parent.parent
SRC = MOCKUP.parent / 'assets' / 'render-frontal.png'
OUT_DIR = MOCKUP / 'public' / 'face'
GEOMETRY = MOCKUP / 'src' / 'device' / 'face.json'
WIDTHS = (1240, 720)
PAD = 6


def largest_component_at(mask, seed):
    n, lab = cv2.connectedComponents(mask.astype(np.uint8), connectivity=8)
    k = lab[seed[1], seed[0]]
    if k == 0:
        sys.exit(f'nothing at seed {seed}')
    return lab == k


def fill(mask):
    """Fill every hole inside the mask's outer contour."""
    cs, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros(mask.shape, np.uint8)
    cv2.drawContours(out, cs, -1, 1, thickness=cv2.FILLED)
    return out.astype(bool)


def bbox(mask):
    ys, xs = np.where(mask)
    return int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)


def main():
    rgb = np.array(Image.open(SRC).convert('RGB'))
    h, w, _ = rgb.shape
    f = rgb.astype(np.float32)
    r, g, b = f[..., 0], f[..., 1], f[..., 2]
    minc = f.min(axis=2)

    # 1. Background: the near-white field connected to the corners.
    white = minc > 244
    bg = largest_component_at(white, (0, 0))
    body = ~bg

    # 2. Soft edge: within 3 px of the background, estimate coverage from how
    #    far the pixel is from white (the body's darkest channel sits ~55).
    k3 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    band = cv2.dilate(bg.astype(np.uint8), k3).astype(bool) & body
    alpha = np.where(body, 1.0, 0.0).astype(np.float32)
    est = np.clip((255 - minc) / 200.0, 0, 1)
    alpha[band] = est[band]
    color = f.copy()
    a = alpha[..., None]
    safe = np.maximum(a, 0.05)
    unmixed = np.clip((f - (1 - a) * 255) / safe, 0, 255)
    color[band] = unmixed[band]

    # 3. Screen hole: the render's paper-white panel (blue channel high,
    #    unlike the yellow body). The panel is a rectangle: take the rows and
    #    columns it fills at least halfway, grown 2 px so no white fringe stays.
    paper = fill(largest_component_at(b > 110, (w // 2, int(h * 0.54))))
    rows = np.where(paper.sum(axis=1) > 0.5 * paper.sum(axis=1).max())[0]
    cols = np.where(paper.sum(axis=0) > 0.5 * paper.sum(axis=0).max())[0]
    hx, hy = int(cols.min()) - 2, int(rows.min()) - 2
    hw, hh = int(cols.max()) + 3 - hx, int(rows.max()) + 3 - hy
    hole = np.zeros((h, w), np.uint8)
    cv2.rectangle(hole, (hx, hy), (hx + hw - 1, hy + hh - 1), 1, thickness=cv2.FILLED)
    alpha[hole.astype(bool)] = 0

    # 4. Star knob: red, not yellow (green well under red), filled.
    red = (r > 150) & (g < 0.62 * r)
    star_seed = (int(w * 0.51), int(h * 0.78))
    star = fill(largest_component_at(red, star_seed))
    sx, sy, sw, sh = bbox(star)
    m = cv2.moments(star.astype(np.uint8), binaryImage=True)
    scx, scy = m['m10'] / m['m00'], m['m01'] / m['m00']
    core = cv2.erode(star.astype(np.uint8) * 255, np.ones((3, 3), np.uint8))
    star_soft = cv2.GaussianBlur(core, (5, 5), 0) / 255.0

    # Paint the star out of the body so the knob layer can turn over it:
    # each row is interpolated between the body pixels just left and right
    # of the knob (the body's bottom edge reads as nearly level there), plus
    # the render's fine grain.
    under = cv2.dilate(star.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (31, 31))).astype(bool)
    ux, uy, uw, uh = bbox(under)
    painted = color.copy()
    rng = np.random.default_rng(7)
    for y in range(uy, uy + uh):
        xs = np.where(under[y])[0]
        if xs.size == 0:
            continue
        lx, rx = xs.min() - 3, xs.max() + 3
        left = color[y, lx - 3:lx + 1].mean(axis=0)
        right = color[y, rx:rx + 4].mean(axis=0)
        t = (xs - lx) / max(rx - lx, 1)
        painted[y, xs] = left[None, :] * (1 - t[:, None]) + right[None, :] * t[:, None]
    grain = rng.normal(0, 2.2, painted.shape).astype(np.float32)
    painted[under] = np.clip(painted[under] + grain[under], 0, 255)
    painted = np.clip(painted, 0, 255).astype(np.uint8)
    # Soften the seam where the fill meets the render.
    blurred = cv2.GaussianBlur(painted, (0, 0), 1.2)
    seam = cv2.dilate(under.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool) & ~cv2.erode(under.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    painted[seam] = blurred[seam]

    # 5. Trim to the body plus a few pixels.
    bx, by, bw, bh = bbox(body)
    x0, y0 = max(bx - PAD, 0), max(by - PAD, 0)
    x1, y1 = min(bx + bw + PAD, w), min(by + bh + PAD, h)
    face = np.dstack([painted, (alpha * 255).astype(np.uint8)])[y0:y1, x0:x1]
    face_img = Image.fromarray(face, 'RGBA')
    sp = 4
    star_rgba = np.dstack([rgb, (star_soft * 255).astype(np.uint8)])[sy - sp:sy + sh + sp, sx - sp:sx + sw + sp]
    star_img = Image.fromarray(star_rgba, 'RGBA')

    tw, th = x1 - x0, y1 - y0
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for width in WIDTHS:
        s = width / tw
        face_img.resize((width, round(th * s)), Image.LANCZOS).save(OUT_DIR / f'face-{width}.webp', 'WEBP', quality=88, alpha_quality=95, method=6)
        star_img.resize((round(star_img.width * s), round(star_img.height * s)), Image.LANCZOS).save(OUT_DIR / f'star-{width}.webp', 'WEBP', quality=90, alpha_quality=100, method=6)

    # Pills and the listening LED spot: measured once on the render by eye
    # (the pills are the same yellow as the body, so no color split works).
    pills = {
        'back': {'x': 562, 'y': 1225, 'w': 130, 'h': 67},
        'home': {'x': 980, 'y': 1225, 'w': 130, 'h': 67},
    }
    rel = lambda d: {k: (v - x0 if k == 'x' else v - y0 if k == 'y' else v) for k, v in d.items()}
    geometry = {
        'source': 'assets/render-frontal.png',
        'width': tw,
        'height': th,
        'hole': rel({'x': hx, 'y': hy, 'w': hw, 'h': hh}),
        'star': {**rel({'x': sx - sp, 'y': sy - sp, 'w': sw + 2 * sp, 'h': sh + 2 * sp}), 'cx': round(scx - (sx - sp), 1), 'cy': round(scy - (sy - sp), 1)},
        'pills': {k: rel(v) for k, v in pills.items()},
        'led': rel({'x': sx + sw + 14, 'y': sy + 16, 'w': 20, 'h': 20}),
        'widths': list(WIDTHS),
    }
    GEOMETRY.write_text(json.dumps(geometry, indent=2) + '\n')
    print(json.dumps(geometry))
    print('hole aspect', round(hw / hh, 3), '· panel 3:2 = 1.5 → letterbox inside the hole')


if __name__ == '__main__':
    main()
