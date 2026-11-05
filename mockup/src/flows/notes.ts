/**
 * Lo que sé de ti: a short poionotas list + "¿Cambio algo?". Editable by
 * asking ("Olvida lo del cilantro" -> "Listo, ya no lo tomo en cuenta.").
 */
import { AFFORD, CONTEXT, NOTES_SCREEN } from '../copy/es-MX';
import { T } from './draw';
import type { ScreenDef } from './screens';

export const notes: ScreenDef = {
  context: () => CONTEXT.notes,
  afford: () => AFFORD.notes,

  enter(app) { app.rt.notes.sel = 0; },

  draw(p, app, body) {
    const list = app.state.poionotas;
    if (!list.length) {
      p.para(NOTES_SCREEN.empty, body.x + 4, body.y + 80, body.w - 40, T.body, 27, 2);
    } else {
      // Newest last; show the most recent that fit, starting at the scroll offset.
      const per = 8;
      const start = Math.max(0, Math.min(app.rt.notes.sel, list.length - per));
      let y = body.y + 40;
      for (const n of list.slice(start, start + per)) {
        p.dot(body.x + 8, y - 6, 3, 'ink');
        y = p.para(n.text, body.x + 22, y, body.w - 30, { ...T.body, size: 19 }, 24, 2) + 6;
        if (y > body.y + body.h - 50) break;
      }
    }
    p.text(NOTES_SCREEN.change, body.x + 4, body.y + body.h - 14, { ...T.row, size: 22 });
  },

  rotate(app, dir) {
    const n = app.state.poionotas.length;
    const next = app.rt.notes.sel + dir;
    if (next < 0) { app.go('pantry'); return; }
    if (next > Math.max(0, n - 8)) { app.go('cookbook'); return; }
    app.rt.notes.sel = next;
    app.repaint();
  },

  press: (app) => app.go('cookbook'),

  intent(app, i) {
    if (i.kind === 'back' || i.kind === 'no') { app.go('cookbook'); return true; }
    return false;
  },

  contents: (app) => ({ poionotas: app.state.poionotas.map((n) => n.text) }),
};
