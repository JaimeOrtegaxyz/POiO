/**
 * Missing ingredient: one line with 1-2 options and their trade-off, e.g.
 * "No hay crema. ¿La quitamos o usamos yogur? Queda menos espesa." Pick with
 * the encoder or by voice. The item goes `out`; the recipe drops or swaps it.
 */
import { normalizeText } from '../../shared/slug';
import type { MissingOption } from '../../shared/types';
import { AFFORD } from '../copy/es-MX';
import type { App } from './app';
import { T, pickIndex, row } from './draw';
import { applyMissing } from './pantry-logic';
import type { ScreenDef } from './screens';

function options(app: App): MissingOption[] {
  return (app.rt.missing?.action.options ?? []).slice(0, 2);
}

function choose(app: App, idx: number): void {
  const m = app.rt.missing;
  const opt = options(app)[idx];
  if (!m || !opt || !m.action.item || !app.rt.recipe) return;
  const item = m.action.item;
  app.applyPantry([{ item, status: 'out', display: m.action.display }]);
  app.rt.recipe.recipe = applyMissing(app.rt.recipe.recipe, item, opt);
  app.track('missing', { kind: opt.kind });
  app.rt.missing = null;
  app.go('check');
}

export const missing: ScreenDef = {
  context: (app) => app.rt.recipe?.recipe.name ?? '',
  afford: () => AFFORD.missing,

  draw(p, app, body) {
    const m = app.rt.missing;
    if (!m) return;
    let y = body.y + 56;
    y = p.para(m.action.line || '', body.x + 4, y, body.w - 16, { ...T.row, size: 24 }, 31, 4);
    y += 18;
    options(app).forEach((o, i) => {
      const sel = i === m.sel;
      row(p, body.x, y, body.w, 44, sel, (fg) => {
        p.text(String(i + 1), body.x + 4, y + 29, { ...T.mono, size: 15, color: fg });
        p.text(o.label, body.x + 30, y + 30, { ...T.row, color: fg });
      });
      y += 52;
    });
  },

  rotate(app, dir) {
    const n = options(app).length;
    if (!app.rt.missing || !n) return;
    app.rt.missing.sel = (app.rt.missing.sel + dir + n) % n;
    app.repaint();
  },

  press(app) { if (app.rt.missing) choose(app, app.rt.missing.sel); },

  intent(app, i) {
    const n = options(app).length;
    if (i.kind === 'pick' || i.kind === 'number') {
      const idx = pickIndex(i.kind === 'pick' ? i.index : i.value, n);
      if (idx !== null) { choose(app, idx); return true; }
    }
    if (i.kind === 'yes' && n === 1) { choose(app, 0); return true; }
    if (i.kind === 'back') { app.go('check'); return true; }
    return false;
  },

  utterance(app, text) {
    // "quítala", "la quitamos", "usa yogur", "con yogur".
    const n = normalizeText(text);
    const opts = options(app);
    if (/(quita|quitamos|quitala|quitalo|sin |no le pongas|omit)/.test(n)) {
      const i = opts.findIndex((o) => o.kind === 'drop');
      if (i >= 0) { choose(app, i); return true; }
    }
    const i = opts.findIndex((o) => o.kind === 'swap' && [o.label, o.swapDisplay ?? ''].some((l) => normalizeText(l).split(' ').some((w) => w.length > 3 && w !== 'usar' && n.includes(w))));
    if (i >= 0) { choose(app, i); return true; }
    return false;
  },

  contents: (app) => ({ line: app.rt.missing?.action.line, options: options(app).map((o) => o.label) }),
};
