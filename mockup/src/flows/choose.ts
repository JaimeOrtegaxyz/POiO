/**
 * What to cook: exactly three rows, title · time · difficulty. No commentary,
 * no follow-up. Rotate moves the inversion; press or voice picks. "Otras"
 * gives three new options with no comment and logs the discard.
 */
import { normalizeText } from '../../shared/slug';
import { AFFORD, CHOOSE, CONTEXT } from '../copy/es-MX';
import type { App } from './app';
import { T, pickIndex, row } from './draw';
import type { ScreenDef } from './screens';

function pick(app: App, idx: number): void {
  const opt = app.rt.choose.options?.[idx];
  if (!opt) return;
  app.track('pick', { index: idx + 1 });
  void app.openRecipe({ title: opt.title, option: opt }, 'choose');
}

function discard(app: App): void {
  const opts = app.rt.choose.options;
  if (!opts) return;
  app.state.discards.push({ titles: opts.map((o) => o.title), at: app.now() });
  app.state.discards = app.state.discards.slice(-20);
  app.save();
  app.track('discard', { count: opts.length });
  void app.openChoose('choose', { keepShown: true });
}

export const choose: ScreenDef = {
  context: () => CONTEXT.choose,
  afford: () => AFFORD.choose,

  draw(p, app, body) {
    const opts = app.rt.choose.options;
    if (!opts) return;
    const rowH = 76;
    const top = body.y + (body.h - rowH * 3) / 2 - 6;
    opts.forEach((o, i) => {
      const y = top + i * rowH;
      const sel = i === app.rt.choose.sel;
      row(p, body.x, y, body.w, rowH - 8, sel, (fg) => {
        p.text(String(i + 1), body.x + 4, y + 41, { ...T.mono, size: 15, color: fg });
        const meta = CHOOSE.meta(o.minutes, o.difficulty);
        const mw = p.measure(meta, T.mono);
        let title = CHOOSE.row(o.title);
        const maxW = body.w - mw - 60;
        const lines = p.wrap(title, maxW, T.row);
        if (lines.length > 2) title = `${lines[0]} ${lines[1]}`;
        const shown = p.wrap(title, maxW, T.row).slice(0, 2);
        const ty = shown.length === 1 ? y + 42 : y + 29;
        shown.forEach((l, k) => p.text(l, body.x + 30, ty + k * 26, { ...T.row, color: fg }));
        p.text(meta, body.x + body.w, y + 41, { ...T.mono, color: fg, align: 'right' });
      });
    });
  },

  rotate(app, dir) {
    const n = app.rt.choose.options?.length ?? 0;
    if (!n) return;
    app.rt.choose.sel = (app.rt.choose.sel + dir + n) % n;
    app.repaint();
  },

  press(app) { pick(app, app.rt.choose.sel); },

  intent(app, i) {
    const n = app.rt.choose.options?.length ?? 0;
    if (i.kind === 'discard') { discard(app); return true; }
    if ((i.kind === 'pick' || i.kind === 'number') && n) {
      const idx = pickIndex(i.kind === 'pick' ? i.index : i.value, n);
      if (idx === null) return false;
      pick(app, idx);
      return true;
    }
    if (i.kind === 'back') { app.go(app.rt.choose.from === 'onboarding' ? 'cookbook' : app.rt.choose.from); return true; }
    if (i.kind === 'yes') { pick(app, app.rt.choose.sel); return true; }
    return false;
  },

  utterance(app, text) {
    // A name on screen: "la tinga", "el de gochujang".
    const opts = app.rt.choose.options ?? [];
    const n = normalizeText(text);
    const idx = opts.findIndex((o) => normalizeText(o.title) === n || normalizeText(o.title).split(' ').some((w) => w.length > 4 && w !== 'pollo' && n.split(' ').includes(w)));
    if (idx >= 0 && n.split(' ').length <= 5) { pick(app, idx); return true; }
    return false;
  },

  action(app, a) {
    const opts = app.rt.choose.options ?? [];
    if (a.action === 'pick') {
      const byTitle = a.title ? opts.findIndex((o) => normalizeText(o.title) === normalizeText(a.title!)) : -1;
      const idx = byTitle >= 0 ? byTitle : a.index ? pickIndex(a.index, opts.length) : null;
      if (idx === null || idx < 0) return false;
      pick(app, idx);
      return true;
    }
    if (a.action === 'discard') { discard(app); return true; }
    if (a.action === 'tweak') {
      app.track('tweak');
      void app.openChoose('choose', { tweak: a.tweak, keepShown: true });
      return true;
    }
    return false;
  },

  contents: (app) => ({ options: app.rt.choose.options ?? [] }),
};
