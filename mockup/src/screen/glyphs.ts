/**
 * Line-art step glyphs, ported from archive/stage2/web/app.js (pan, pot,
 * griddle, bowl, oven, knife) to canvas paths in the same 118×78 space.
 * Strokes are ink; the food gets yellow with an ink dot dither.
 */

export type GlyphName = 'pan' | 'pot' | 'griddle' | 'bowl' | 'oven' | 'knife';
export const GLYPH_W = 118;
export const GLYPH_H = 78;

export interface GlyphShape {
  /** Outlines, stroked in ink (width in glyph units). */
  strokes: { path: Path2D; width: number; dash?: number[] }[];
  /** Food areas: yellow + dot dither, then outlined if `outline`. */
  fills: { path: Path2D; outline: boolean }[];
  /** Solid ink dots (oven knobs). */
  solids: Path2D[];
}

function ellipse(cx: number, cy: number, rx: number, ry: number): Path2D {
  const p = new Path2D();
  p.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  return p;
}
function circle(cx: number, cy: number, r: number): Path2D { return ellipse(cx, cy, r, r); }
function line(x1: number, y1: number, x2: number, y2: number): Path2D {
  const p = new Path2D();
  p.moveTo(x1, y1); p.lineTo(x2, y2);
  return p;
}
function rrect(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D();
  p.roundRect(x, y, w, h, r);
  return p;
}
/** A steam wisp; `lift` moves it up for the variant-a animation frames. */
export function steam(x: number, lift = 0): Path2D {
  return new Path2D(`M${x} ${24 - lift} q5 -5 0 -10 q-5 -5 0 -10`);
}

export function glyphShape(name: GlyphName): GlyphShape {
  switch (name) {
    case 'pan':
      return {
        strokes: [
          { path: line(80, 50, 114, 50), width: 3 },
          { path: ellipse(44, 50, 42, 18), width: 3 },
        ],
        fills: [{ path: ellipse(38, 50, 15, 8.5), outline: true }, { path: ellipse(58, 53, 9, 5.5), outline: true }],
        solids: [],
      };
    case 'pot':
      return {
        strokes: [
          { path: new Path2D('M20 34 h78 l-6 34 a6 6 0 0 1 -6 5 H32 a6 6 0 0 1 -6 -5 Z'), width: 3 },
          { path: line(14, 30, 104, 30), width: 3 },
          { path: line(59, 24, 59, 30), width: 3 },
          { path: line(30, 52, 88, 52), width: 2.4, dash: [2, 4] },
        ],
        fills: [],
        solids: [],
      };
    case 'griddle':
      return {
        strokes: [{ path: ellipse(59, 52, 52, 16), width: 3 }],
        fills: [{ path: ellipse(42, 50, 16, 6.5), outline: true }, { path: ellipse(74, 54, 16, 6.5), outline: true }],
        solids: [],
      };
    case 'bowl':
      return {
        strokes: [
          { path: new Path2D('M14 40 a45 45 0 0 0 90 0 Z'), width: 3 },
          { path: new Path2D('M52 26 q7 -9 14 0'), width: 2.4 },
        ],
        fills: [{ path: new Path2D('M30 40 a29 29 0 0 0 58 0 Z'), outline: false }],
        solids: [],
      };
    case 'oven':
      return {
        strokes: [
          { path: rrect(26, 10, 66, 60, 4), width: 3 },
          { path: line(26, 26, 92, 26), width: 3 },
        ],
        fills: [{ path: new Path2D('M36 34 h46 v28 h-46 Z'), outline: true }],
        solids: [circle(34, 18, 2.4), circle(45, 18, 2.4)],
      };
    case 'knife':
      return {
        strokes: [
          { path: new Path2D('M18 54 h70'), width: 3 },
          { path: line(88, 52, 104, 52), width: 3 },
        ],
        fills: [{ path: new Path2D('M20 40 q34 -6 58 12 l-58 2 Z'), outline: true }],
        solids: [],
      };
  }
}

/** Where each glyph's steam rises from (pan and pot always steam; the rest only when animated). */
export const STEAM_X: Record<GlyphName, { x: number[]; always: boolean }> = {
  pan: { x: [40, 56], always: true },
  pot: { x: [48, 66], always: true },
  griddle: { x: [44, 72], always: false },
  bowl: { x: [42, 76], always: false },
  oven: { x: [], always: false },
  knife: { x: [], always: false },
};
