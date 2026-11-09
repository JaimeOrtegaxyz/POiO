/**
 * Ingredient check before step 1: "Antes de empezar:" + 3-6 key ingredients
 * with status markers, then "¿Todo listo?". A press or "sí" starts. "No hay
 * crema", or a required item that's `out`, opens the missing-ingredient line.
 */
import type { Action } from '../../shared/types';
import { AFFORD, CHECK, MISSING } from '../copy/es-MX';
import type { App } from './app';
import { T } from './draw';
import { keyIngredients } from './pantry-logic';
import type { ScreenDef } from './screens';

function start(app: App): void {
  const c = app.rt.cook;
  c.step = 0; c.peek = null; c.seen = new Set(); c.pending = []; c.fired = []; c.animFrame = 0;
  app.go('cook');
}

/** A required ingredient the pantry says is `out`, not handled yet. */
function firstOut(app: App) {
  const r = app.rt.recipe!.recipe;
  return r.ingredients.find((i) => i.required !== false && app.state.pantry[i.item]?.status === 'out' && !app.rt.check.handled.has(i.item));
}

/** The missing-ingredient line for `a`; the choice returns to `from` (the check, or the step being cooked). */
export function openMissing(app: App, a: Action, from: 'check' | 'cook' = 'check'): void {
  const display = a.display || app.displayOf(a.item ?? '');
  const action: Action = {
    ...a,
    display,
    line: a.line || MISSING.line(display),
    options: a.options?.length ? a.options.slice(0, 2) : [{ label: MISSING.dropFallback, kind: 'drop' }],
  };
  app.rt.missing = { action, sel: 0, from };
  if (a.item) app.rt.check.handled.add(a.item);
  app.track('missing', { known: !!a.options?.length });
  app.go('missing');
}

export const check: ScreenDef = {
  context: (app) => app.rt.recipe?.recipe.name ?? '',
  afford: () => AFFORD.check,

  enter(app) {
    const out = app.rt.recipe ? firstOut(app) : undefined;
    if (!out) return;
    // Ask the brain for the options and trade-off (keyword fixtures in fake mode).
    const display = out.display || out.item;
    app.rt.check.handled.add(out.item);
    queueMicrotask(() => void app.askBrain(`No hay ${display}`));
  },

  draw(p, app, body) {
    const r = app.rt.recipe?.recipe;
    if (!r) return;
    let y = body.y + 50;
    p.text(CHECK.heading, body.x + 4, y, { ...T.row, size: 24 });
    y += 22;
    const list = keyIngredients(r);
    const rowH = list.length > 5 ? 34 : 38;
    for (const ing of list) {
      const st = app.state.pantry[ing.item]?.status ?? null;
      p.swatch(body.x + 6, y + 9, 17, st);
      let name = ing.display || ing.item;
      while (name.length > 4 && p.measure(name, T.body) > body.w - 210) name = `${name.slice(0, -2).trimEnd()}…`;
      p.text(name, body.x + 36, y + 25, T.body);
      let qty = ing.qty;
      while (qty.length > 4 && p.measure(qty, T.mono) > 160) qty = `${qty.slice(0, -2).trimEnd()}…`;
      p.text(qty, body.x + body.w, y + 24, { ...T.mono, align: 'right' });
      y += rowH;
    }
    p.text(CHECK.ready, body.x + 4, Math.min(y + 34, body.y + body.h - 14), { ...T.row, size: 24 });
  },

  press: (app) => start(app),

  intent(app, i) {
    if (i.kind === 'yes' || i.kind === 'next') { start(app); return true; }
    if (i.kind === 'back') { app.go('intro'); return true; }
    return false;
  },

  action(app, a) {
    if (a.action === 'missing' && a.item) { openMissing(app, a); return true; }
    return false;
  },

  contents: (app) => {
    const r = app.rt.recipe?.recipe;
    return r ? { recipe: r.name, ingredients: r.ingredients.map((i) => ({ item: i.item, display: i.display, required: i.required !== false })) } : undefined;
  },
};
