/**
 * Cooking: one step per screen. `3 / 6`, the step text, only this step's
 * `uses` with status, a glyph in variant a. Press or "siguiente" advances,
 * "atrás" goes back, rotate peeks at the neighbors.
 *
 * Checkpoints, not countdowns: showing a step with a checkpoint starts a
 * hidden timer for afterSec (÷ speed). No time is ever drawn. When it
 * fires: the checkpoint cluck and an inverted band, kept until the next
 * press, even if you've moved on ("Paso 2 · …"). Several can be pending.
 */
import { AFFORD, COOK, pantryName } from '../copy/es-MX';
import type { GlyphName } from '../screen/glyphs';
import type { App } from './app';
import { openMissing } from './check';
import { T } from './draw';
import type { ScreenDef } from './screens';

function steps(app: App) { return app.rt.recipe?.recipe.steps ?? []; }

/**
 * What the stepper shows: the instruction without its "A los 5 min,
 * checkpoint: …" clause. No time is drawn while cooking; the checkpoint
 * band brings that message when it's due.
 */
export function stepDisplayText(text: string, hasCheckpoint: boolean): string {
  const sentences = text.match(/[^.]+(?:\.|$)/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const kept = sentences.filter((s) => !/checkpoint/i.test(s) && !(hasCheckpoint && /^a l[ao]s? .*\b(min|minutos|seg|segundos|h|horas)\b/i.test(s)));
  return kept.length ? kept.join(' ') : text;
}

/** Arm the step's checkpoint the first time the step is shown. */
function arm(app: App): void {
  const c = app.rt.cook;
  const s = steps(app)[c.step];
  if (!s || c.seen.has(c.step)) return;
  c.seen.add(c.step);
  if (s.checkpoint) {
    c.pending.push({ step: c.step + 1, message: s.checkpoint.message, dueAt: app.now() + (s.checkpoint.afterSec * 1000) / app.speed });
  }
}

function advance(app: App): void {
  const c = app.rt.cook;
  const n = steps(app).length;
  app.track('step_completed', { n: c.step + 1, of: n });
  if (c.step >= n - 1) { app.go('done'); return; }
  c.step++;
  c.peek = null;
  arm(app);
  app.repaint();
}

function back(app: App): void {
  const c = app.rt.cook;
  if (c.step === 0) { app.go('check'); return; }
  c.step--;
  c.peek = null;
  app.repaint();
}

export const cook: ScreenDef = {
  context: (app) => app.rt.recipe?.recipe.name ?? '',
  meta: (app) => {
    const c = app.rt.cook;
    const n = steps(app).length;
    return c.peek !== null ? `${COOK.peek} ${COOK.progress(c.peek + 1, n)}` : COOK.progress(c.step + 1, n);
  },
  afford: (app) => (app.rt.cook.peek !== null ? AFFORD.cookPeek : AFFORD.cook),

  enter(app) { arm(app); },

  draw(p, app, body) {
    const r = app.rt.recipe?.recipe;
    if (!r) return;
    const c = app.rt.cook;
    const idx = c.peek ?? c.step;
    const s = r.steps[idx];
    if (!s) return;
    const glyph = app.variant === 'a' && s.glyph && s.glyph !== 'none' ? (s.glyph as GlyphName) : null;
    const textW = glyph ? body.w - 150 : body.w - 8;
    if (glyph) p.glyph(glyph, body.x + body.w - 130, body.y + 18, 130, c.peek === null ? c.animFrame : 0);
    let y = body.y + 46;
    if (c.peek !== null) { p.text(COOK.peek, body.x + 4, y - 18, T.kicker); y += 8; }
    y = p.para(stepDisplayText(s.text, !!s.checkpoint), body.x + 4, y, textW, T.step, 33, 5);
    // Only this step's ingredients, with status.
    const uses = (s.uses ?? []).map((k) => {
      const ing = r.ingredients.find((i) => i.item === k);
      return { key: k, name: ing?.display || pantryName(k), qty: ing?.qty };
    });
    y += 14;
    let x = body.x + 4;
    const maxY = body.y + body.h - 8;
    for (const u of uses) {
      const w = 26 + p.measure(u.name, { ...T.body, size: 22 });
      if (x + w > body.x + body.w) { x = body.x + 4; y += 34; }
      if (y > maxY) break;
      p.swatch(x, y - 17, 17, app.state.pantry[u.key]?.status ?? null);
      p.text(u.name, x + 26, y, { ...T.body, size: 22 });
      x += w + 22;
    }
  },

  rotate(app, dir) {
    const c = app.rt.cook;
    const n = steps(app).length;
    const at = (c.peek ?? c.step) + dir;
    if (at < 0 || at >= n) return;
    c.peek = at === c.step ? null : at;
    app.repaint();
  },

  press(app) {
    const c = app.rt.cook;
    if (c.fired.length) { c.fired = []; app.repaint(); return; }
    if (c.peek !== null) { c.peek = null; app.repaint(); return; }
    advance(app);
  },

  intent(app, i) {
    const c = app.rt.cook;
    if (i.kind === 'next' || i.kind === 'yes') { c.fired = []; c.peek = null; advance(app); return true; }
    if (i.kind === 'back') { c.fired = []; back(app); return true; }
    return false;
  },

  action(app, a) {
    if (a.action !== 'missing' || !a.item) return false;
    // Mid-cook, "no hay crema" for something this recipe still needs: offer the swap, then back to this step.
    const need = app.rt.recipe?.recipe.ingredients.find((i) => i.item === a.item && i.required !== false);
    if (need && a.options?.length) { openMissing(app, a, 'cook'); return true; }
    // Anything else is pantry news; stay on the step.
    app.dispatch({ action: 'pantry', changes: [{ item: a.item, status: 'out', display: a.display }] });
    return true;
  },

  contents: (app) => {
    const r = app.rt.recipe?.recipe;
    if (!r) return undefined;
    const s = r.steps[app.rt.cook.step];
    return { recipe: r.name, step: app.rt.cook.step + 1, of: r.steps.length, text: s?.text, ingredients: r.ingredients.map((i) => ({ item: i.item, display: i.display })) };
  },
};
