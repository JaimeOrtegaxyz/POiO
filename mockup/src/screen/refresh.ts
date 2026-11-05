/**
 * Refresh emulation. A view change is a full refresh (ink -> paper -> new
 * frame flashes); a step or small change is a partial repaint of the changed
 * rectangle, where the panel allows it. Discrete steps on setTimeout: no
 * animation loop, no spinners.
 */
import type { PixelBuffer } from './panel';
import type { Profile, TimingMode } from './profiles';

export interface Rect { x: number; y: number; w: number; h: number }
export type RefreshKind = 'full' | 'partial';

/** Bounding box of the pixels that differ between two frames; null if identical. */
export function diffRect(a: PixelBuffer | null, b: PixelBuffer): Rect | null {
  if (!a || a.width !== b.width || a.height !== b.height) return { x: 0, y: 0, w: b.width, h: b.height };
  const w = b.width, h = b.height;
  const A = new Uint32Array(a.data.buffer, a.data.byteOffset, w * h);
  const B = new Uint32Array(b.data.buffer, b.data.byteOffset, w * h);
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      if (A[row + x] !== B[row + x]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export interface PresentStats { full: number; partial: number; last: RefreshKind | null; lastRect: Rect | null }

/** Full refresh every N partials, to clear ghosting (UI-LANGUAGE refresh hygiene). */
export const PARTIALS_BEFORE_FULL = 8;

export class Display {
  private ctx: CanvasRenderingContext2D;
  private shown: ImageData | null = null;
  private busy = false;
  private pending: { frame: ImageData; kind: RefreshKind } | null = null;
  private partialsSinceFull = 0;
  readonly stats: PresentStats = { full: 0, partial: 0, last: null, lastRect: null };
  onIdle: (() => void) | null = null;

  constructor(
    private canvas: HTMLCanvasElement,
    private getProfile: () => Profile,
    private getMode: () => TimingMode,
  ) {
    this.ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  }

  /** Match the canvas to the profile (native pixels) and the integer display scale. */
  configure(scale: number): void {
    const p = this.getProfile();
    if (this.canvas.width !== p.width || this.canvas.height !== p.height) {
      this.canvas.width = p.width;
      this.canvas.height = p.height;
      this.shown = null;
    }
    this.canvas.style.width = `${p.width * scale}px`;
    this.canvas.style.height = `${p.height * scale}px`;
  }

  /** Blank paper, as a powered-off panel that has never been drawn. */
  blank(color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.shown = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
  }

  get isBusy(): boolean { return this.busy; }

  present(frame: ImageData, kind: RefreshKind): void {
    if (this.busy) {
      // Coalesce: keep only the newest frame; a pending full wins.
      const k: RefreshKind = this.pending?.kind === 'full' || kind === 'full' ? 'full' : 'partial';
      this.pending = { frame, kind: k };
      return;
    }
    this.run(frame, kind);
  }

  private run(frame: ImageData, kind: RefreshKind): void {
    const p = this.getProfile();
    const t = p.timing[this.getMode()];
    let k = kind;
    if (t.partialMs === null) k = 'full';
    if (k === 'partial' && this.partialsSinceFull >= PARTIALS_BEFORE_FULL) k = 'full';
    const rect = diffRect(this.shown, frame);
    if (!rect) { this.finish(); return; }
    this.busy = true;
    this.stats.last = k;
    this.stats.lastRect = k === 'full' ? { x: 0, y: 0, w: frame.width, h: frame.height } : rect;
    const colors = p.mode === 'kaleido' ? { ink: p.kaleido!.ink, paper: p.kaleido!.paper } : { ink: p.colors.ink, paper: p.colors.paper };

    if (k === 'full') {
      this.stats.full++;
      this.partialsSinceFull = 0;
      // Real Spectra timing flashes twice over its ~16 s; fast mode flashes once.
      const phases = this.getMode() === 'real' && p.mode === 'palette' ? 4 : 2;
      const slice = t.fullMs / (phases + 1);
      let i = 0;
      const tick = () => {
        if (i < phases) {
          this.ctx.fillStyle = i % 2 === 0 ? colors.ink : colors.paper;
          this.ctx.fillRect(0, 0, frame.width, frame.height);
          i++;
          setTimeout(tick, slice);
          return;
        }
        this.ctx.putImageData(frame, 0, 0);
        this.shown = frame;
        setTimeout(() => this.finish(), slice);
      };
      tick();
    } else {
      this.stats.partial++;
      this.partialsSinceFull++;
      const ms = t.partialMs ?? 0;
      this.ctx.fillStyle = colors.ink;
      this.ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      setTimeout(() => {
        this.ctx.putImageData(frame, 0, 0, rect.x, rect.y, rect.w, rect.h);
        this.shown = frame;
        setTimeout(() => this.finish(), ms / 2);
      }, ms / 2);
    }
  }

  private finish(): void {
    this.busy = false;
    const next = this.pending;
    this.pending = null;
    if (next) this.run(next.frame, next.kind);
    else this.onIdle?.();
  }
}
