/** Drawing pieces shared by the screens. Design units, 600 wide. */
import type { PantryStatus } from '../../shared/pantry';
import { ASSUMED, STATUS_LABEL } from '../copy/es-MX';
import type { GlyphName } from '../screen/glyphs';
import { foodImage } from '../screen/images';
import type { Painter, TextOpts } from '../screen/painter';
import type { Area } from './app';

export const T = {
  title: { kind: 'q', size: 30, weight: 700 } as TextOpts,
  question: { kind: 'q', size: 28, weight: 700 } as TextOpts,
  step: { kind: 'q', size: 26, weight: 600 } as TextOpts,
  row: { kind: 'q', size: 22, weight: 700 } as TextOpts,
  body: { kind: 'q', size: 20, weight: 600 } as TextOpts,
  why: { kind: 'q', size: 17, weight: 600 } as TextOpts,
  kicker: { kind: 'm', size: 13, weight: 500, tracking: 0.08, caps: true } as TextOpts,
  mono: { kind: 'm', size: 14, weight: 500 } as TextOpts,
};

/** A selectable row: inverted when selected (selection = inversion, no hover). */
export function row(p: Painter, x: number, y: number, w: number, h: number, selected: boolean, draw: (fg: 'ink' | 'paper') => void): void {
  if (selected) p.invert(x - 10, y, w + 20, h);
  draw(selected ? 'paper' : 'ink');
}

/** A status marker plus its mono label (color plus pattern plus words). */
export function statusMark(p: Painter, x: number, y: number, st: PantryStatus | null, size = 16): void {
  p.swatch(x, y, size, st);
}

export function statusLabel(st: PantryStatus | null, assumed?: boolean): string {
  if (!st) return '';
  return assumed ? `${STATUS_LABEL[st]} · ${ASSUMED}` : STATUS_LABEL[st];
}

/** The food image for variant a, or a glyph, or nothing. Returns true if something was drawn. */
export function foodOrGlyph(p: Painter, id: string, box: Area, glyph: GlyphName | null): boolean {
  const img = foodImage(id, p.profile, box.w, box.h);
  if (img) {
    p.blit(img, box.x, box.y);
    // A hairline keyline around the image, like a plate on the page.
    p.hline(box.y, box.x, box.x + box.w); p.hline(box.y + box.h - 1 / p.u, box.x, box.x + box.w);
    p.vline(box.x, box.y, box.y + box.h); p.vline(box.x + box.w - 1 / p.u, box.y, box.y + box.h);
    return true;
  }
  if (glyph) {
    const gw = Math.min(box.w, 170);
    p.glyph(glyph, box.x + (box.w - gw) / 2, box.y + (box.h - gw * 0.66) / 2, gw);
    return true;
  }
  return false;
}

/** Pick a glyph for a recipe without an image: the first step's, else a bowl. */
export function recipeGlyph(steps: { glyph?: string }[] | undefined): GlyphName {
  const g = steps?.find((s) => s.glyph && s.glyph !== 'none')?.glyph;
  return (g as GlyphName) ?? 'bowl';
}

/** The number for `pick` on a list, from "la primera" / "2" / "la última". */
export function pickIndex(index: number, count: number): number | null {
  const i = index === -1 ? count : index;
  return i >= 1 && i <= count ? i - 1 : null;
}
