/**
 * Despensa: known items only (everything starts unknown except what
 * onboarding set). "no hay" first, then "poco", then the rest by category.
 * Rotate scrolls; past the ends it moves to the neighboring top-level
 * screen. Press cycles plenty -> low -> out. Context, never a gate.
 */
import { AFFORD, CONTEXT, PANTRY } from '../copy/es-MX';
import type { App } from './app';
import { T, row, statusLabel } from './draw';
import { NEXT_STATUS, pantryRows } from './pantry-logic';
import type { ScreenDef } from './screens';

const ROW_H = 30;

function rows(app: App) {
  const all = pantryRows(app.state.pantry, app.template);
  // Keep the order fixed while you're on the screen, so a press doesn't move the caret's item.
  const order = app.rt.pantry.keys;
  return order.length ? order.map((k) => all.find((r) => r.key === k)!).filter(Boolean) : all;
}

export const pantry: ScreenDef = {
  context: () => CONTEXT.pantry,
  afford: () => AFFORD.pantry,

  enter(app) {
    app.rt.pantry.keys = pantryRows(app.state.pantry, app.template).map((r) => r.key);
    app.rt.pantry.sel = 0;
  },

  draw(p, app, body) {
    const list = rows(app);
    if (!list.length) { p.para(PANTRY.empty, body.x + 4, body.y + 80, body.w - 40, T.body, 27, 3); return; }
    const per = Math.floor((body.h - 16) / ROW_H);
    const sel = app.rt.pantry.sel;
    const top = Math.max(0, Math.min(sel - Math.floor(per / 2), list.length - per));
    list.slice(top, top + per).forEach((r, i) => {
      const y = body.y + 8 + i * ROW_H;
      const isSel = top + i === sel;
      row(p, body.x, y, body.w, ROW_H - 2, isSel, (fg) => {
        p.swatch(body.x + 4, y + 6, 16, r.status);
        p.text(r.display, body.x + 32, y + 21, { ...T.body, size: 19, color: fg });
        p.text(statusLabel(r.status, r.assumed), body.x + body.w, y + 20, { ...T.mono, size: 13, color: fg, align: 'right' });
      });
    });
    if (top + per < list.length) p.text(PANTRY.more(list.length - top - per), body.x + body.w, body.y + body.h - 4, { ...T.mono, size: 12, align: 'right' });
  },

  rotate(app, dir) {
    const n = rows(app).length;
    const next = app.rt.pantry.sel + dir;
    if (next < 0) { app.go('cookbook'); return; }
    if (next >= n) { app.go('notes'); return; }
    app.rt.pantry.sel = next;
    app.repaint();
  },

  press(app) {
    const r = rows(app)[app.rt.pantry.sel];
    if (!r) return;
    app.applyPantry([{ item: r.key, status: NEXT_STATUS[r.status], display: r.display }]);
    app.repaint();
  },

  intent(app, i) {
    if (i.kind === 'back') { app.go('cookbook'); return true; }
    return false;
  },

  contents: (app) => ({ items: rows(app).length }),
};
