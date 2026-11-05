/**
 * Finish: the finish cluck, "Listo. Provecho.", then silence. No recap, no
 * next suggestion. After a press or a few seconds, the optional taste
 * question; then the predicted pantry diff (computed locally from
 * `depletes`) as a checklist. Apply only what's confirmed, then the cookbook.
 */
import { AFFORD, DONE, NOTES, STATUS_LABEL } from '../copy/es-MX';
import type { App } from './app';
import { T, row } from './draw';
import { predictDiff, type DiffRow } from './pantry-logic';
import type { ScreenDef } from './screens';

/** How long "Listo. Provecho." stays alone before the taste question. */
export const LINE_MS = 5000;
/** Check-ins come at least this long after the cook (÷ speed). */
export const CHECKIN_AFTER_MS = 3 * 3600 * 1000;

let diffRows: DiffRow[] = [];

function toTaste(app: App): void {
  app.rt.done.phase = 'taste';
  app.rt.done.tasteSel = 10; // "Saltar": skippable by default
  app.repaint();
}

function toDiff(app: App): void {
  const r = app.rt.recipe?.recipe;
  diffRows = r ? predictDiff(r, app.state.pantry).slice(0, 6) : [];
  if (!diffRows.length) { app.go('cookbook'); return; }
  app.rt.done.phase = 'diff';
  app.rt.done.diffSel = 0;
  app.rt.done.checked = diffRows.map(() => true);
  app.repaint();
}

function rate(app: App, n: number | null): void {
  const r = app.rt.recipe?.recipe;
  if (n && r) {
    app.addNotes([NOTES.rating(r.name, n)]);
    app.track('taste', { score: n });
  } else {
    app.track('taste', { skipped: true });
  }
  toDiff(app);
}

function confirmDiff(app: App, all: boolean | null): void {
  const d = app.rt.done;
  const chosen = diffRows.filter((_, i) => (all === null ? d.checked[i] : all));
  app.applyPantry(chosen.map((r) => ({ item: r.item, status: r.to, display: r.display })));
  app.track('pantry_diff', { applied: chosen.length, proposed: diffRows.length });
  app.go('cookbook');
}

export const done: ScreenDef = {
  context: (app) => app.rt.recipe?.recipe.name ?? '',
  afford: (app) => (app.rt.done.phase === 'taste' ? AFFORD.taste : app.rt.done.phase === 'diff' ? AFFORD.diff : AFFORD.done),

  enter(app) {
    const d = app.rt.done;
    d.phase = 'line';
    d.enteredAt = app.now();
    d.animFrame = 0;
    // The recipe is over: checkpoints still pending never fire.
    app.rt.cook.pending = [];
    app.rt.cook.fired = [];
    app.sounds.play('finish');
    const r = app.rt.recipe?.recipe;
    if (r) {
      const t = app.now();
      app.state.history.push({ id: r.id, name: r.name, finishedAt: t });
      app.state.history = app.state.history.slice(-50);
      // One check-in at a time: the newest cook replaces an unanswered one.
      app.state.checkins = app.state.checkins.filter((c) => c.done);
      app.state.checkins.push({ dish: r.name, dueAt: t + CHECKIN_AFTER_MS / app.speed });
      app.save();
      app.track('finish', { steps: r.steps.length });
    }
    if (app.canAnimate) app.animate((f) => { d.animFrame = f; });
  },

  draw(p, app, body) {
    const d = app.rt.done;
    if (d.phase === 'line') {
      if (app.variant === 'a') p.glyph('bowl', 300 - 75, body.y + 40, 150, d.animFrame);
      p.text(DONE.line, 300, app.variant === 'a' ? body.y + 200 : body.y + body.h / 2 + 12, { ...T.title, size: 34, align: 'center' });
      return;
    }
    if (d.phase === 'taste') {
      p.text(DONE.taste, body.x + 4, body.y + 90, { ...T.question });
      const cell = 44, gap = 6;
      const total = 10 * cell + 9 * gap;
      const x0 = body.x + (body.w - total) / 2;
      const y0 = body.y + 140;
      for (let i = 0; i < 10; i++) {
        const x = x0 + i * (cell + gap);
        const sel = d.tasteSel === i;
        if (sel) p.invert(x, y0, cell, cell);
        else { p.hline(y0, x, x + cell); p.hline(y0 + cell - 1 / p.u, x, x + cell); p.vline(x, y0, y0 + cell); p.vline(x + cell - 1 / p.u, y0, y0 + cell); }
        p.text(String(i + 1), x + cell / 2, y0 + 30, { ...T.row, size: 22, align: 'center', color: sel ? 'paper' : 'ink' });
      }
      const sy = y0 + cell + 26;
      row(p, body.x + body.w - 120, sy, 120, 38, d.tasteSel === 10, (fg) => {
        p.text(DONE.skip, body.x + body.w - 60, sy + 26, { ...T.row, size: 20, align: 'center', color: fg });
      });
      return;
    }
    // Pantry diff.
    const names = diffRows.map((r) => r.display);
    const allOut = diffRows.every((r) => r.to === 'out');
    let y = p.para(allOut ? DONE.diffOut(names) : DONE.diffMixed(names), body.x + 4, body.y + 36, body.w - 8, { ...T.row, size: 21 }, 27, 3);
    y += 4;
    const rowH = diffRows.length > 4 ? 30 : 34;
    const visible = diffRows;
    visible.forEach((r, i) => {
      const sel = d.diffSel === i;
      row(p, body.x, y, body.w, rowH - 4, sel, (fg) => {
        p.checkbox(body.x + 4, y + 6, 18, d.checked[i], sel);
        p.swatch(body.x + 32, y + 7, 16, r.to);
        p.text(r.display, body.x + 58, y + 21, { ...T.body, size: 19, color: fg });
        p.text(STATUS_LABEL[r.to], body.x + body.w, y + 20, { ...T.mono, color: fg, align: 'right' });
      });
      y += rowH;
    });
    const ci = visible.length;
    row(p, body.x, y + 4, body.w, 32, d.diffSel === ci, (fg) => {
      p.text(DONE.confirm, body.x + 4, y + 27, { ...T.row, size: 20, color: fg });
    });
  },

  tick(app, now) {
    const d = app.rt.done;
    if (d.phase === 'line' && now - d.enteredAt > LINE_MS) { d.phase = 'taste'; d.tasteSel = 10; return true; }
    return false;
  },

  rotate(app, dir) {
    const d = app.rt.done;
    if (d.phase === 'taste') { d.tasteSel = Math.max(0, Math.min(10, d.tasteSel + dir)); app.repaint(); return; }
    if (d.phase === 'diff') {
      const n = diffRows.length + 1;
      d.diffSel = (d.diffSel + dir + n) % n;
      app.repaint();
    }
  },

  press(app) {
    const d = app.rt.done;
    if (d.phase === 'line') { toTaste(app); return; }
    if (d.phase === 'taste') { rate(app, d.tasteSel === 10 ? null : d.tasteSel + 1); return; }
    if (d.diffSel >= diffRows.length) { confirmDiff(app, null); return; }
    d.checked[d.diffSel] = !d.checked[d.diffSel];
    app.repaint();
  },

  intent(app, i) {
    const d = app.rt.done;
    if (d.phase === 'line' && (i.kind === 'next' || i.kind === 'yes')) { toTaste(app); return true; }
    if (d.phase === 'taste') {
      if (i.kind === 'number') { rate(app, i.value); return true; }
      if (i.kind === 'skip' || i.kind === 'no' || i.kind === 'next') { rate(app, null); return true; }
    }
    if (d.phase === 'diff') {
      if (i.kind === 'yes' || i.kind === 'next') { confirmDiff(app, null); return true; }
      if (i.kind === 'no' || i.kind === 'skip') { confirmDiff(app, false); return true; }
    }
    return false;
  },

  contents: (app) => ({ phase: app.rt.done.phase, recipe: app.rt.recipe?.recipe.name }),
};
