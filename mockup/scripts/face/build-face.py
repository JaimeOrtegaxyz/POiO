#!/usr/bin/env python3
"""
Build the /demo device face from the frontal renders (hand-run).

    python3 -I scripts/face/build-face.py            # from mockup/

Reads ../assets/render/, all from the same camera, 1952×1714, white background:

    POiO-main.png        the shell alone: screen opening, no pills, no knob   → the base
    buttons-normal.png   the shell with both pills at rest                     → pill layers (up)
    buttons-pressed.png  the shell with both pills pushed in                   → pill layers (down)
    buttons-alone.png    the pills alone                                       → pill hit targets
    knob01..04.png       the star knob alone, at rest and turned 15°, 30°, 45° clockwise
    01-regularview.png   everything at rest                                    → reference only:
                         the knob's shadow and the shell's color on its rim are fitted to it

Writes public/face/:

    face-{W}.webp               the shell: transparent background and screen opening
    pill-{back,home}-{up,down}-{W}.webp
                                the pill and the shell around it, from the pill
                                renders, feathered so it sits seamlessly on the base
    knob-{0..3}-{W}.webp        the knob turned 0/15/30/45°, rim tinted by the shell
    knob-shadow-{0..3}-{W}.webp the knob's shadow on the shell, a multiply layer
                                (white = no change), fitted to the at-rest render

and src/device/face.json (geometry in the trimmed base's pixels).

Every pixel kept comes from a render; the only modeled parts are the knob's
shadow and the shell color on the knob's rim, both fitted to 01-regularview.
The fit's error is printed. Needs numpy, opencv-python and Pillow.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
MOCKUP = HERE.parent.parent
SRC = MOCKUP.parent / 'assets' / 'render'
OUT_DIR = MOCKUP / 'public' / 'face'
GEOMETRY = MOCKUP / 'src' / 'device' / 'face.json'
WIDTHS = (1240, 720)
PAD = 6
STEP_DEG = 15
KNOB_FRAMES = ['knob01.png', 'knob02.png', 'knob03.png', 'knob04.png']


def load(name):
    return np.array(Image.open(SRC / name).convert('RGB')).astype(np.float32)


def component_at(mask, seed):
    n, lab = cv2.connectedComponents(mask.astype(np.uint8), connectivity=8)
    k = lab[seed[1], seed[0]]
    if k == 0:
        sys.exit(f'nothing at seed {seed}')
    return lab == k


def largest(mask):
    n, lab, st, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    if n < 2:
        sys.exit('empty mask')
    return lab == 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA]))


def fill(mask):
    cs, _ = cv2.findContours(mask.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    out = np.zeros(mask.shape, np.uint8)
    cv2.drawContours(out, cs, -1, 1, thickness=cv2.FILLED)
    return out.astype(bool)


def bbox(mask):
    ys, xs = np.where(mask)
    return int(xs.min()), int(ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)


def dilate(mask, r):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    return cv2.dilate(mask.astype(np.uint8), k).astype(bool)


def erode(mask, r):
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))
    return cv2.erode(mask.astype(np.uint8), k).astype(bool)


def unmix_on_white(f, alpha):
    """The foreground color of an edge pixel that was blended with the white background."""
    a = np.maximum(alpha[..., None], 0.05)
    return np.clip((f - (1 - alpha[..., None]) * 255) / a, 0, 255)


def soft_matte(f, hard, fg_dark):
    """Alpha 1 inside `hard`, with a soft edge in a 3 px band estimated from how far a pixel is from white."""
    minc = f.min(axis=2)
    alpha = hard.astype(np.float32)
    band = dilate(hard, 2) & ~erode(hard, 2)
    est = np.clip((255 - minc) / (255 - fg_dark), 0, 1)
    alpha[band] = est[band]
    return alpha


# ---------------------------------------------------------------- the shell

def shell(main):
    h, w, _ = main.shape
    minc = main.min(axis=2)
    bg = component_at(minc > 244, (0, 0))
    body = ~bg
    alpha = soft_matte(main, body & erode(body, 1), 55)
    alpha[bg & ~dilate(body, 3)] = 0
    color = main.copy()
    edge = (alpha > 0) & (alpha < 1)
    color[edge] = unmix_on_white(main, alpha)[edge]

    # The screen opening: the white field inside the body. It's a rectangle:
    # keep the rows and columns it fills at least halfway, grown 2 px so no
    # white fringe stays.
    inner = fill(body) & (minc > 236)
    cy, cx = h // 2, w // 2
    paper = fill(component_at(inner, (cx, int(h * 0.52))))
    rows = np.where(paper.sum(axis=1) > 0.5 * paper.sum(axis=1).max())[0]
    cols = np.where(paper.sum(axis=0) > 0.5 * paper.sum(axis=0).max())[0]
    hx, hy = int(cols.min()) - 2, int(rows.min()) - 2
    hw, hh = int(cols.max()) + 3 - hx, int(rows.max()) + 3 - hy
    alpha[hy:hy + hh, hx:hx + hw] = 0
    return color, alpha, body, (hx, hy, hw, hh)


# ---------------------------------------------------------------- the pills

def pills(main, up, down, alone):
    """Each pill: its hit rect (from the pills-alone render) and a layer rect
    covering everything the pill changes on the shell (the pill, its rim, its
    shadow), with a feathered alpha shared by the up and down layers."""
    shape = alone.min(axis=2) < 240
    n, lab, st, cen = cv2.connectedComponentsWithStats(shape.astype(np.uint8), connectivity=8)
    parts = sorted([i for i in range(1, n) if st[i, cv2.CC_STAT_AREA] > 2000], key=lambda i: cen[i][0])
    if len(parts) != 2:
        sys.exit(f'expected two pills in buttons-alone.png, found {len(parts)}')
    changed = (np.abs(up - main).max(axis=2) > 6) | (np.abs(down - main).max(axis=2) > 6) | (np.abs(down - up).max(axis=2) > 6)
    changed = cv2.morphologyEx(changed.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)).astype(bool)
    out = {}
    for name, i in zip(('back', 'home'), parts):
        px, py, pw, ph = (int(v) for v in st[i, :4])
        near = np.zeros_like(changed)
        near[py - 30:py + ph + 40, px - 30:px + pw + 30] = True
        region = dilate(changed & near, 6) | dilate(lab == i, 6)
        soft = cv2.GaussianBlur(region.astype(np.float32), (0, 0), 3)
        soft = np.clip(soft * 1.6, 0, 1)
        lx, ly, lw, lh = bbox(soft > 0.004)
        out[name] = {'hit': (px, py, pw, ph), 'layer': (lx, ly, lw, lh), 'alpha': soft}
    return out


# ---------------------------------------------------------------- the knob

def knob_masks():
    frames = []
    for name in KNOB_FRAMES:
        f = load(name)
        hard = fill(largest(f.min(axis=2) < 240))
        alpha = soft_matte(f, erode(hard, 1), 30)
        color = f.copy()
        edge = (alpha > 0) & (alpha < 1)
        color[edge] = unmix_on_white(f, alpha)[edge]
        frames.append({'rgb': f, 'color': color, 'alpha': alpha, 'hard': hard})
    return frames


def center_of(mask):
    m = cv2.moments(mask.astype(np.uint8), binaryImage=True)
    return m['m10'] / m['m00'], m['m01'] / m['m00']


def polar(mask, cx, cy):
    """Distance in from the knob's edge, and the angle around its center (screen degrees)."""
    h, w = mask.shape
    d = cv2.distanceTransform(mask.astype(np.uint8), cv2.DIST_L2, 5)
    ys, xs = np.mgrid[0:h, 0:w]
    a = (np.degrees(np.arctan2(ys - cy, xs - cx)) + 360) % 360
    return d, a


RIM_D = 18      # px in from the edge where the shell tints the rim
D_BINS = 18
A_BINS = 36


def fit_rim(frame, rest, cx, cy):
    """The shell bounces yellow onto the knob's rim and shades its foot; the
    lone renders sit on white instead. Learn the difference on the rest frame
    as a function of (distance in from the edge, angle around the center): the
    light is fixed in the world, so the same table applies to every turn."""
    hard = frame['hard']
    d, a = polar(hard, cx, cy)
    sel = hard & (d < RIM_D)
    di = np.clip((d[sel] / RIM_D * D_BINS).astype(int), 0, D_BINS - 1)
    ai = (a[sel] / 360 * A_BINS).astype(int) % A_BINS
    delta = rest[sel] - frame['rgb'][sel]
    table = np.zeros((D_BINS, A_BINS, 3), np.float32)
    count = np.zeros((D_BINS, A_BINS), np.float32)
    np.add.at(table, (di, ai), delta)
    np.add.at(count, (di, ai), 1)
    table /= np.maximum(count, 1)[..., None]
    # Smooth around the circle (wrapping) and along the depth.
    wrap = np.concatenate([table[:, -3:], table, table[:, :3]], axis=1)
    wrap = cv2.GaussianBlur(wrap, (0, 0), sigmaX=1.2, sigmaY=0.6)
    return wrap[:, 3:-3]


def apply_rim(frame, table, cx, cy):
    hard = frame['hard']
    d, a = polar(hard, cx, cy)
    # Bilinear lookup; the edge band (outside `hard`) uses depth 0.
    dd = np.clip(d / RIM_D * D_BINS - 0.5, 0, D_BINS - 1)
    aa = a / 360 * A_BINS - 0.5
    d0 = np.floor(dd).astype(int)
    d1 = np.minimum(d0 + 1, D_BINS - 1)
    td = (dd - d0)[..., None]
    a0 = np.floor(aa).astype(int) % A_BINS
    a1 = (a0 + 1) % A_BINS
    ta = (aa - np.floor(aa))[..., None]
    v = (table[d0, a0] * (1 - ta) + table[d0, a1] * ta) * (1 - td) + (table[d1, a0] * (1 - ta) + table[d1, a1] * ta) * td
    fade = np.clip(1 - (d - RIM_D * 0.8) / (RIM_D * 0.2), 0, 1)[..., None]
    color = np.clip(frame['color'] + v * fade, 0, 255)
    return color


def blur_shift(mask, dx, dy, sigma):
    m = mask.astype(np.float32)
    M = np.float32([[1, 0, dx], [0, 1, dy]])
    m = cv2.warpAffine(m, M, (m.shape[1], m.shape[0]))
    return cv2.GaussianBlur(m, (0, 0), sigma)


def fit_shadow(hard, ratio, fit_zone):
    """ratio = at-rest render / pills-at-rest render: what the knob does to the
    shell around it. Model it as 1 - (a tight contact shade + a soft cast
    shadow offset away from the light), per channel (the red bounce takes
    green and blue more than red). Least squares for the strengths; a small
    grid for the offset and the blurs."""
    zx, zy, zw, zh = bbox(fit_zone)
    win = (slice(zy - 20, zy + zh + 20), slice(zx - 20, zx + zw + 20))
    hard, ratio, fit_zone = hard[win], ratio[win], fit_zone[win]
    y = 1 - ratio[fit_zone]
    best = None
    for s1 in (2, 4, 6):
        c = blur_shift(hard, 0, 0, s1)[fit_zone]
        for s2 in (10, 16, 22, 30):
            for dx in range(0, 25, 3):
                for dy in range(0, 25, 3):
                    b = blur_shift(hard, dx, dy, s2)[fit_zone]
                    A = np.stack([c, b], axis=1)
                    k, res, *_ = np.linalg.lstsq(A, y, rcond=None)
                    err = float(((A @ k - y) ** 2).sum())
                    if best is None or err < best[0]:
                        best = (err, s1, s2, dx, dy, k)
    err, s1, s2, dx, dy, k = best
    rms = (err / y.size) ** 0.5
    print(f'knob shadow fit: contact σ={s1}, cast σ={s2} offset ({dx},{dy}) · rms error {rms:.4f} of full scale')
    return {'s1': s1, 's2': s2, 'dx': dx, 'dy': dy, 'k': np.clip(k, 0, None)}


def shadow_of(hard, p):
    c = blur_shift(hard, 0, 0, p['s1'])
    b = blur_shift(hard, p['dx'], p['dy'], p['s2'])
    shade = c[..., None] * p['k'][0][None, None, :] + b[..., None] * p['k'][1][None, None, :]
    return np.clip(1 - shade, 0, 1)


# ---------------------------------------------------------------- output

def save(img, name, scale_to, lossless=False):
    """Save one layer at every width; `scale_to(width)` gives the target size.
    The small layers go lossless: a lossy encoder nudges near-white and flat
    yellow by a level or two, which shows as a box over the base."""
    for width in WIDTHS:
        size = scale_to(width)
        out = img.resize(size, Image.LANCZOS)
        if lossless:
            out.save(OUT_DIR / f'{name}-{width}.webp', 'WEBP', lossless=True, quality=100, method=6)
        else:
            out.save(OUT_DIR / f'{name}-{width}.webp', 'WEBP', quality=90, alpha_quality=100, method=6)


def main():
    base = load('POiO-main.png')
    up = load('buttons-normal.png')
    down = load('buttons-pressed.png')
    alone = load('buttons-alone.png')
    rest = load('01-regularview.png')
    h, w, _ = base.shape
    for name, im in (('buttons-normal', up), ('buttons-pressed', down), ('01-regularview', rest)):
        if im.shape != base.shape:
            sys.exit(f'{name}.png is {im.shape[1]}×{im.shape[0]}, the base is {w}×{h}: same camera and size, please')

    color, alpha, body, (hx, hy, hw, hh) = shell(base)
    pl = pills(base, up, down, alone)

    frames = knob_masks()
    cx, cy = np.mean([center_of(f['hard']) for f in frames], axis=0)
    rest_hard = frames[0]['hard']
    table = fit_rim(frames[0], rest, cx, cy)
    for f in frames:
        f['tinted'] = apply_rim(f, table, cx, cy)
    check = frames[0]['hard'] & erode(frames[0]['hard'], 2)
    print(f'knob rim fit: mean abs error inside the knob {np.abs(frames[0]["tinted"][check] - rest[check]).mean():.2f}/255 '
          f'(lone render: {np.abs(frames[0]["rgb"][check] - rest[check]).mean():.2f})')

    ratio = np.clip(rest / np.maximum(up, 1), 0, 1.2)
    near = dilate(rest_hard, 70) & ~dilate(rest_hard, 2) & body
    shadow_p = fit_shadow(rest_hard, ratio, near)

    # One box for all knob frames, and one for all shadows, so swapping never moves anything.
    kx, ky, kw, kh = bbox(np.any([f['alpha'] > 0 for f in frames], axis=0))
    kx, ky, kw, kh = kx - 3, ky - 3, kw + 6, kh + 6
    models = [shadow_of(f['hard'], shadow_p) for f in frames]
    # What the model misses (the render's shadow over the model's, at rest),
    # kept only in its broad shape: a smooth correction that belongs to the
    # light, not to where the rest star's points were, so every frame takes
    # it without a ghost of the rest outline. All four frames go through the
    # same steps, so turning never switches between two kinds of shadow.
    valid = (~dilate(rest_hard, 3) & body).astype(np.float32)
    dist = cv2.distanceTransform((~rest_hard).astype(np.uint8), cv2.DIST_L2, 5)
    trust = valid * np.clip((100 - dist) / 30, 0, 1)
    miss = ratio / np.maximum(models[0], 0.2)
    # The two renders may differ by a hair everywhere (exposure, noise): that
    # isn't shadow. Divide out the level far from the knob, so the correction
    # is exactly neutral where the knob casts nothing.
    far = valid.astype(bool) & (dist > 70) & (dist < 100)
    miss = miss / np.median(miss[far], axis=0)[None, None, :]
    num = cv2.GaussianBlur(miss * trust[..., None], (0, 0), 10)
    den = cv2.GaussianBlur(trust, (0, 0), 10)[..., None]
    fix = np.where(den > 0.05, num / np.maximum(den, 1e-6), 1.0)
    fade = np.clip((110 - dist) / 30, 0, 1)[..., None]
    fix = 1 + (fix - 1) * fade
    shadows = [np.clip(m * fix, 0, 1) for m in models]
    # The layer's box: everywhere any frame darkens by more than half a level,
    # plus a margin; then a window that brings every frame to exactly white
    # (no change) at the box's edge, so the box itself can never show.
    reach = np.any([(1 - sd).max(axis=2) > 0.5 / 255 for sd in shadows], axis=0)
    sx, sy, sw, sh = bbox(reach)
    m = 16
    sx, sy, sw, sh = max(sx - m, 0), max(sy - m, 0), sw + 2 * m, sh + 2 * m
    yy, xx = np.mgrid[0:h, 0:w]
    edge = np.minimum.reduce([xx - sx, sx + sw - 1 - xx, yy - sy, sy + sh - 1 - yy]).astype(np.float32)
    win = np.clip(edge / m, 0, 1)
    win = (win * win * (3 - 2 * win))[..., None]
    shadows = [1 - (1 - sd) * win for sd in shadows]

    # Trim everything to the body plus a few pixels.
    bx, by, bw, bh = bbox(body)
    x0, y0 = max(bx - PAD, 0), max(by - PAD, 0)
    x1, y1 = min(bx + bw + PAD, w), min(by + bh + PAD, h)
    tw, th = x1 - x0, y1 - y0
    scale = lambda width: width / tw
    sized = lambda pw, ph: (lambda width: (max(1, round(pw * scale(width))), max(1, round(ph * scale(width)))))

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for old in OUT_DIR.glob('*.webp'):
        old.unlink()

    rgba = lambda rgb, a: Image.fromarray(np.dstack([np.clip(rgb, 0, 255).astype(np.uint8), (np.clip(a, 0, 1) * 255).astype(np.uint8)]), 'RGBA')
    save(rgba(color, alpha).crop((x0, y0, x1, y1)), 'face', sized(tw, th))

    for name, p in pl.items():
        lx, ly, lw, lh = p['layer']
        for state, src in (('up', up), ('down', down)):
            img = rgba(src, p['alpha']).crop((lx, ly, lx + lw, ly + lh))
            save(img, f'pill-{name}-{state}', sized(lw, lh), lossless=True)

    for i, f in enumerate(frames):
        save(rgba(f['tinted'], f['alpha']).crop((kx, ky, kx + kw, ky + kh)), f'knob-{i}', sized(kw, kh), lossless=True)
        sh_img = Image.fromarray((shadows[i] * 255).round().astype(np.uint8), 'RGB').crop((sx, sy, sx + sw, sy + sh))
        save(sh_img, f'knob-shadow-{i}', sized(sw, sh), lossless=True)

    # Proof sheet: base + pills up + knob 0 + its shadow vs the at-rest render.
    comp = base.copy()
    for name, p in pl.items():
        a = p['alpha'][..., None]
        comp = comp * (1 - a) + up * a
    comp = comp * shadows[0]
    a = frames[0]['alpha'][..., None]
    comp = comp * (1 - a) + frames[0]['tinted'] * a
    zone = (slice(by + int(bh * 0.66), y1), slice(x0, x1))
    err = np.abs(comp[zone] - rest[zone]).mean()
    print(f'composite vs 01-regularview (control row): mean abs error {err:.2f}/255')
    proof = np.vstack([comp[zone], rest[zone]]).astype(np.uint8)
    Image.fromarray(proof).save(OUT_DIR.parent.parent / 'scripts' / 'face' / 'proof.png') if '--proof' in sys.argv else None

    rel = lambda x, y, ww, hh_: {'x': x - x0, 'y': y - y0, 'w': ww, 'h': hh_}
    led_y = ky + kh * 0.08
    geometry = {
        'source': 'assets/render/',
        'width': tw,
        'height': th,
        'hole': rel(hx, hy, hw, hh),
        'knob': {**rel(kx, ky, kw, kh), 'cx': round(cx - kx, 1), 'cy': round(cy - ky, 1), 'frames': len(frames), 'stepDeg': STEP_DEG},
        'shadow': rel(sx, sy, sw, sh),
        'pills': {name: {**rel(*p['hit']), 'layer': rel(*p['layer'])} for name, p in pl.items()},
        # The model has no LED: it's drawn only while listening, in the gap
        # between the knob's upper right and the home pill.
        'led': rel(round((kx + kw + pl['home']['hit'][0]) / 2 - 7), round(led_y), 14, 14),
        'widths': list(WIDTHS),
    }
    GEOMETRY.write_text(json.dumps(geometry, indent=2) + '\n')
    print(json.dumps(geometry))
    print(f'opening {hw}×{hh} render px, aspect {hw / hh:.3f} (Kaleido 3 1448×1072 = {1448 / 1072:.3f})')


if __name__ == '__main__':
    main()
