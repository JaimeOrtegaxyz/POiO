/**
 * Where the device face sits on the page. Pure math over face.json (the
 * geometry measured from the frontal renders by scripts/face/build-face.py),
 * so the tests can pin it.
 *
 * The shell's screen opening was modeled for the Kaleido 3 6" candidate
 * (1448×1072, about 1.35): that panel fills it. Another profile keeps its own
 * aspect and is letterboxed inside the opening (Spectra's 3:2 gets bands
 * above and below): never stretched.
 *
 * Two size modes:
 *   fit   (default) the whole chicken fits the window. When that makes the
 *         screen too small to read, it grows (up to 440 px of screen) as far as
 *         the width allows, never cut: if it's then taller than the window, the
 *         page scrolls. Only when even the width can't hold a readable screen
 *         (phones) is it cropped around the screen and the controls.
 *         Labeled uncalibrated.
 *   real  the PANEL is drawn at the candidate panel's real size, from a
 *         ruler calibration (CSS px per mm). With the Kaleido profile the
 *         opening is the panel, so the whole shell is close to its modeled
 *         size too; with another profile only the panel is to scale.
 */
import FACE from './face.json';

export type Face = typeof FACE;
export interface Rect { x: number; y: number; w: number; h: number }
export interface Viewport { w: number; h: number }

export interface Layout {
  /** CSS px per render px. */
  scale: number;
  /** The whole face at this scale. */
  devW: number;
  devH: number;
  /** The visible window onto it, and the face's offset inside that window. */
  frameW: number;
  frameH: number;
  offX: number;
  offY: number;
}

export const GUTTER = 16;
const MAX_W = 1000;
/** Room kept under the face for the power button to peek in. */
const RESERVE_H = 80;

/** The panel's active area inside the hole, in hole-relative render px: as large as fits, centered. */
export function panelInHole(hole: Pick<Rect, 'w' | 'h'>, panelW: number, panelH: number): Rect {
  const a = panelW / panelH;
  const w = Math.min(hole.w, hole.h * a);
  const h = w / a;
  return { x: (hole.w - w) / 2, y: (hole.h - h) / 2, w, h };
}

/** The part that must stay visible: the hole and the control row. */
export function focusRect(f: Face = FACE): Rect {
  const top = f.hole.y;
  const bottom = Math.max(f.knob.y + f.knob.h, f.pills.back.y + f.pills.back.h);
  const left = Math.min(f.hole.x, f.pills.back.x);
  const right = Math.max(f.hole.x + f.hole.w, f.pills.home.x + f.pills.home.w);
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function avail(vp: Viewport) {
  return { w: Math.max(Math.min(vp.w - 2 * GUTTER, MAX_W), 200), h: Math.max(vp.h - RESERVE_H, 320) };
}

/** Below this many CSS px of screen width, cropping the chicken beats shrinking it. */
const MIN_READABLE = 340;

/** Fit mode: the whole face; grown for a readable screen only as far as the width allows; cropped only on phones. */
export function fitScale(vp: Viewport, f: Face = FACE): number {
  const a = avail(vp);
  const whole = Math.min(a.w / f.width, a.h / f.height);
  const readable = Math.min(a.w * 0.92, 440) / f.hole.w;
  if (whole >= readable) return whole;
  const fullWidth = a.w / f.width;
  if (fullWidth * f.hole.w >= MIN_READABLE) return Math.min(readable, fullWidth);
  const focus = focusRect(f);
  const focusFits = Math.min(a.w / f.hole.w, a.h / focus.h);
  return Math.min(readable, focusFits);
}

/** The candidate panel's active-area width in mm, from its diagonal and pixel aspect. */
export function panelWidthMm(diagonalIn: number, panelW: number, panelH: number): number {
  const a = panelW / panelH;
  return diagonalIn * 25.4 * (a / Math.sqrt(a * a + 1));
}

/** Real mode: scale so the emulated panel's active area is its real width on this calibrated screen. */
export function realScale(pxPerMm: number, diagonalIn: number, panelW: number, panelH: number, f: Face = FACE): number {
  const inHole = panelInHole(f.hole, panelW, panelH);
  return (panelWidthMm(diagonalIn, panelW, panelH) * pxPerMm) / inHole.w;
}

export function layout(vp: Viewport, scale: number, f: Face = FACE): Layout {
  const a = avail(vp);
  const devW = f.width * scale;
  const devH = f.height * scale;
  // The face may use the whole window width (MAX_W only caps the fit size).
  // Nothing is cut vertically: a face taller than the window scrolls with the
  // page. The one exception is a phone too narrow for the whole face, where the
  // crop around the screen and controls keeps them in view together.
  const roomW = Math.max(vp.w - 2 * GUTTER, 200);
  const frameW = Math.min(devW, roomW);
  const phoneCrop = devW > roomW + 0.5 && vp.w <= 600;
  const frameH = phoneCrop ? Math.min(devH, a.h) : devH;
  const focus = focusRect(f);
  const cx = (focus.x + focus.w / 2) * scale;
  const cy = (focus.y + focus.h / 2) * scale;
  const clamp = (v: number, max: number) => Math.min(Math.max(v, 0), Math.max(max, 0));
  // When the whole face fits, the window is the face; otherwise center on the focus.
  const offX = clamp(cx - frameW / 2, devW - frameW);
  const offY = clamp(cy - frameH / 2, devH - frameH);
  return { scale, devW, devH, frameW, frameH, offX, offY };
}

/** Percent of the face box, for absolutely placed parts. */
export function pct(r: Rect, f: Face = FACE): { left: string; top: string; width: string; height: string } {
  const p = (n: number, d: number) => `${((n / d) * 100).toFixed(4)}%`;
  return { left: p(r.x, f.width), top: p(r.y, f.height), width: p(r.w, f.width), height: p(r.h, f.height) };
}

export { FACE };
