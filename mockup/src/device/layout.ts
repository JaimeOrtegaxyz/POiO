/**
 * Where the device face sits on the page. Pure math over face.json (the
 * geometry measured from the frontal render by scripts/face/build-face.py),
 * so the tests can pin it.
 *
 * The emulated panel keeps its own aspect (600×400 = 3:2 for Spectra) and is
 * letterboxed inside the render's screen hole (about 4:3): never stretched.
 *
 * Two size modes:
 *   fit   (default) the face fits the window, with the hole kept big enough to
 *         read; when the whole chicken doesn't fit, it's cropped around the
 *         screen and the controls (comb and pedestal first, sides on phones).
 *         Labeled uncalibrated.
 *   real  the PANEL is drawn at the candidate panel's real size, from a
 *         ruler calibration (CSS px per mm). Only the panel is to scale: the
 *         shell's size is unknown (it lives in the Rhino model), so the body
 *         just follows the panel and makes no size claim.
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
  const bottom = Math.max(f.star.y + f.star.h, f.pills.back.y + f.pills.back.h);
  const left = Math.min(f.hole.x, f.pills.back.x);
  const right = Math.max(f.hole.x + f.hole.w, f.pills.home.x + f.pills.home.w);
  return { x: left, y: top, w: right - left, h: bottom - top };
}

function avail(vp: Viewport) {
  return { w: Math.max(Math.min(vp.w - 2 * GUTTER, MAX_W), 200), h: Math.max(vp.h - RESERVE_H, 320) };
}

/** Fit mode: the whole face if the hole stays readable, else a crop around the screen and controls. */
export function fitScale(vp: Viewport, f: Face = FACE): number {
  const a = avail(vp);
  const whole = Math.min(a.w / f.width, a.h / f.height);
  const readable = Math.min(a.w * 0.92, 440) / f.hole.w;
  const focus = focusRect(f);
  const focusFits = Math.min(a.w / f.hole.w, a.h / focus.h);
  return Math.min(Math.max(whole, readable), focusFits);
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
  const frameW = Math.min(devW, a.w);
  const frameH = Math.min(devH, a.h);
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
