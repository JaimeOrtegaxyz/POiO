/**
 * Canvas 2D drawing in design units (authored for 600×400, scaled per
 * profile). Everything lands on the offscreen native-resolution canvas; the
 * panel pass then snaps it to what the panel can show.
 */
import type { PantryStatus } from '../../shared/pantry';
import { chicken, type ChickenKind } from './chicken';
import { GLYPH_H, GLYPH_W, STEAM_X, glyphShape, steam, type GlyphName } from './glyphs';
import { designHeight, unitScale, type ChromeColor, type Profile } from './profiles';

export type FontKind = 'q' | 'm';
export interface TextOpts {
  kind?: FontKind;
  size?: number;
  weight?: number;
  color?: ChromeColor;
  align?: 'left' | 'right' | 'center';
  /** Letter spacing in em (mono kickers are tracked caps). */
  tracking?: number;
  caps?: boolean;
}

export const FAMILY: Record<FontKind, string> = { q: '"Quicksand"', m: '"JetBrains Mono"' };

/** Type roles from UI-LANGUAGE.md, starting sizes from the brief (design px). */
export const TYPE = {
  title: { kind: 'q', size: 30, weight: 700 },
  step: { kind: 'q', size: 26, weight: 600 },
  body: { kind: 'q', size: 20, weight: 600 },
  small: { kind: 'q', size: 16, weight: 600 },
  kicker: { kind: 'm', size: 13, weight: 500, tracking: 0.08, caps: true },
  meta: { kind: 'm', size: 13, weight: 500 },
  qty: { kind: 'm', size: 15, weight: 500 },
} as const satisfies Record<string, TextOpts>;

/** Floor for anything read while cooking. */
export const COOKING_FLOOR = 22;

export class Painter {
  readonly u: number;
  readonly W = 600;
  readonly H: number;
  private patterns = new Map<string, CanvasPattern>();

  constructor(readonly ctx: CanvasRenderingContext2D, readonly profile: Profile) {
    this.u = unitScale(profile);
    this.H = designHeight(profile);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.textBaseline = 'alphabetic';
    ctx.imageSmoothingEnabled = false;
  }

  /** Design units -> native pixels, snapped to the grid. */
  px(v: number): number { return Math.round(v * this.u); }
  color(c: ChromeColor): string { return this.profile.colors[c]; }
  /** One native pixel at 600 px wide, scaled for denser panels. */
  get hair(): number { return Math.max(1, Math.round(this.u)); }

  clear(c: ChromeColor = 'paper'): void { this.fill(0, 0, this.W, this.H + 1, c); }

  fill(x: number, y: number, w: number, h: number, c: ChromeColor): void {
    const x0 = this.px(x), y0 = this.px(y);
    this.ctx.fillStyle = this.color(c);
    this.ctx.fillRect(x0, y0, this.px(x + w) - x0, this.px(y + h) - y0);
  }

  hline(y: number, x0 = 0, x1 = this.W, c: ChromeColor = 'ink', weight = 1): void {
    const yy = this.px(y);
    this.ctx.fillStyle = this.color(c);
    this.ctx.fillRect(this.px(x0), yy, this.px(x1) - this.px(x0), this.hair * weight);
  }

  vline(x: number, y0: number, y1: number, c: ChromeColor = 'ink'): void {
    this.ctx.fillStyle = this.color(c);
    this.ctx.fillRect(this.px(x), this.px(y0), this.hair, this.px(y1) - this.px(y0));
  }

  dot(x: number, y: number, r: number, c: ChromeColor): void {
    this.ctx.fillStyle = this.color(c);
    this.ctx.beginPath();
    this.ctx.arc(this.px(x), this.px(y), r * this.u, 0, Math.PI * 2);
    this.ctx.fill();
  }

  ring(x: number, y: number, r: number, c: ChromeColor, lw = 1.6): void {
    this.ctx.strokeStyle = this.color(c);
    this.ctx.lineWidth = lw * this.u;
    this.ctx.beginPath();
    this.ctx.arc(this.px(x), this.px(y), r * this.u, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private setFont(o: TextOpts): void {
    const size = (o.size ?? 20) * this.u;
    this.ctx.font = `${o.weight ?? 600} ${size}px ${FAMILY[o.kind ?? 'q']}`;
  }

  /** Width in design units. */
  measure(s: string, o: TextOpts = {}): number {
    this.setFont(o);
    const str = o.caps ? s.toUpperCase() : s;
    const tr = (o.tracking ?? 0) * (o.size ?? 20) * this.u;
    return (this.ctx.measureText(str).width + tr * Math.max(0, [...str].length - 1)) / this.u;
  }

  /** Draw text with its baseline at y. Returns the width in design units. */
  text(s: string, x: number, y: number, o: TextOpts = {}): number {
    const str = o.caps ? s.toUpperCase() : s;
    const w = this.measure(str, { ...o, caps: false });
    let sx = x;
    if (o.align === 'right') sx = x - w;
    else if (o.align === 'center') sx = x - w / 2;
    this.setFont(o);
    this.ctx.fillStyle = this.color(o.color ?? 'ink');
    const tr = (o.tracking ?? 0) * (o.size ?? 20) * this.u;
    if (!tr) {
      this.ctx.fillText(str, Math.round(sx * this.u), this.px(y));
    } else {
      let cx = sx * this.u;
      for (const ch of str) {
        this.ctx.fillText(ch, Math.round(cx), this.px(y));
        cx += this.ctx.measureText(ch).width + tr;
      }
    }
    return w;
  }

  /** Greedy word wrap to `maxW` design units. */
  wrap(s: string, maxW: number, o: TextOpts = {}): string[] {
    const words = s.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let cur = '';
    for (const w of words) {
      const next = cur ? `${cur} ${w}` : w;
      if (cur && this.measure(next, o) > maxW) { lines.push(cur); cur = w; } else cur = next;
    }
    if (cur) lines.push(cur);
    return lines;
  }

  /** Wrapped paragraph; returns the y after the last line. Truncates with "…" past maxLines. */
  para(s: string, x: number, y: number, maxW: number, o: TextOpts, lineH: number, maxLines = 99): number {
    let lines = this.wrap(s, maxW, o);
    if (lines.length > maxLines) {
      lines = lines.slice(0, maxLines);
      let last = lines[maxLines - 1];
      while (last.length > 1 && this.measure(`${last}…`, o) > maxW) last = last.slice(0, -1);
      lines[maxLines - 1] = `${last.replace(/\s+\S*$/, '') || last}…`;
    }
    for (const l of lines) { this.text(l, x, y, o); y += lineH; }
    return y;
  }

  /** Inverted band: ink fill, paper text. */
  invert(x: number, y: number, w: number, h: number): void { this.fill(x, y, w, h, 'ink'); }

  // ---------- status grammar: color plus pattern, pixel-snapped ----------

  private tile(key: string, draw: (t: CanvasRenderingContext2D, n: number) => void, n: number): CanvasPattern {
    const k = `${this.profile.id}:${key}`;
    let pat = this.patterns.get(k);
    if (!pat) {
      const c = document.createElement('canvas');
      c.width = n; c.height = n;
      const t = c.getContext('2d')!;
      draw(t, n);
      pat = this.ctx.createPattern(c, 'repeat')!;
      this.patterns.set(k, pat);
    }
    return pat;
  }

  /** plenty = solid ink; low = yellow + 1 px ink 45° hatch every 4 px; out = red + paper dots every 4 px. */
  statusPattern(st: PantryStatus): string | CanvasPattern {
    const pitch = Math.max(4, Math.round(4 * this.u));
    const h = this.hair;
    if (st === 'plenty') return this.color('ink');
    if (st === 'low') {
      return this.tile('low', (t, n) => {
        t.fillStyle = this.color('yellow'); t.fillRect(0, 0, n, n);
        t.fillStyle = this.color('ink');
        for (let i = 0; i < n; i++) t.fillRect((n - 1 - i + n) % n, i, h, 1); // one diagonal per tile
      }, pitch);
    }
    return this.tile('out', (t, n) => {
      t.fillStyle = this.color('red'); t.fillRect(0, 0, n, n);
      t.fillStyle = this.color('paper'); t.fillRect(0, 0, h, h);
    }, pitch);
  }

  /** A square status marker with an ink keyline, aligned to the native grid. */
  swatch(x: number, y: number, size: number, st: PantryStatus | null): void {
    const x0 = this.px(x), y0 = this.px(y), s = this.px(size);
    const k = this.hair;
    if (!st) {
      // Unknown: a hollow keyline only.
      this.ctx.fillStyle = this.color('ink');
      this.ctx.fillRect(x0, y0, s, k); this.ctx.fillRect(x0, y0 + s - k, s, k);
      this.ctx.fillRect(x0, y0, k, s); this.ctx.fillRect(x0 + s - k, y0, k, s);
      return;
    }
    this.ctx.fillStyle = this.color('ink');
    this.ctx.fillRect(x0, y0, s, s);
    this.ctx.fillStyle = this.statusPattern(st);
    this.ctx.fillRect(x0 + k, y0 + k, s - 2 * k, s - 2 * k);
  }

  /** A checkbox: hollow keyline, filled ink square when checked. */
  checkbox(x: number, y: number, size: number, checked: boolean, invert = false): void {
    const fg: ChromeColor = invert ? 'paper' : 'ink';
    const x0 = this.px(x), y0 = this.px(y), s = this.px(size), k = this.hair * 2;
    this.ctx.fillStyle = this.color(fg);
    this.ctx.fillRect(x0, y0, s, k); this.ctx.fillRect(x0, y0 + s - k, s, k);
    this.ctx.fillRect(x0, y0, k, s); this.ctx.fillRect(x0 + s - k, y0, k, s);
    if (checked) this.ctx.fillRect(x0 + 2 * k, y0 + 2 * k, s - 4 * k, s - 4 * k);
  }

  // ---------- glyphs and images ----------

  private dotPattern(): CanvasPattern {
    const pitch = Math.max(3, Math.round(3 * this.u));
    return this.tile('dots', (t, n) => {
      t.fillStyle = this.color('yellow'); t.fillRect(0, 0, n, n);
      t.fillStyle = this.color('ink'); t.fillRect(0, 0, this.hair, this.hair);
    }, pitch);
  }

  /** Draw a line-art glyph into the box (design units). `frame` lifts the steam for variant-a animation. */
  glyph(name: GlyphName, x: number, y: number, w: number, frame = 0): void {
    const shape = glyphShape(name);
    const k = (w / GLYPH_W) * this.u;
    const tx = this.px(x), ty = this.px(y);
    const ctx = this.ctx;
    const ink = this.color('ink');
    ctx.save();
    for (const f of shape.fills) {
      ctx.save();
      ctx.setTransform(k, 0, 0, k, tx, ty);
      ctx.clip(f.path);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = this.dotPattern();
      ctx.fillRect(tx, ty, Math.ceil(GLYPH_W * k), Math.ceil(GLYPH_H * k));
      ctx.restore();
    }
    ctx.setTransform(k, 0, 0, k, tx, ty);
    ctx.strokeStyle = ink;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const s of shape.strokes) {
      ctx.lineWidth = s.width;
      ctx.setLineDash(s.dash ?? []);
      ctx.stroke(s.path);
    }
    ctx.setLineDash([]);
    ctx.lineWidth = 2.4;
    for (const f of shape.fills) if (f.outline) ctx.stroke(f.path);
    ctx.fillStyle = ink;
    for (const p of shape.solids) ctx.fill(p);
    const st = STEAM_X[name];
    if (st.always || frame > 0) {
      ctx.lineWidth = 2.4;
      for (const sx of st.x) ctx.stroke(steam(sx, frame * 4));
    }
    ctx.restore();
  }

  /**
   * The chicken, `h` design units tall with its top-left at (x, y). `as`
   * paints every shape one color (the paper silhouette on an inverted band).
   * Returns the drawn width.
   */
  chicken(kind: ChickenKind, x: number, y: number, h: number, as?: ChromeColor): number {
    const c = chicken(kind);
    const k = (h / c.h) * this.u;
    const ctx = this.ctx;
    ctx.save();
    ctx.setTransform(k, 0, 0, k, this.px(x), this.px(y));
    for (const s of c.paths) {
      ctx.fillStyle = this.color(as ?? s.fill);
      ctx.fill(s.path, s.rule);
    }
    ctx.restore();
    return (c.w / c.h) * h;
  }

  /** Blit a pre-processed native-resolution image at a grid-aligned position. */
  blit(img: CanvasImageSource, x: number, y: number): void {
    this.ctx.drawImage(img, this.px(x), this.px(y));
  }
}
