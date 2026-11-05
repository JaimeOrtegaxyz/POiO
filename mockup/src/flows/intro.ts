/** Recipe intro: title, the one-line vibe, time · difficulty · servings, an image in variant a. */
import { AFFORD, INTRO } from '../copy/es-MX';
import { ensureFood } from '../screen/images';
import type { App } from './app';
import { T, foodOrGlyph, recipeGlyph } from './draw';
import type { ScreenDef } from './screens';

export function recipeMinutes(app: App): number {
  const r = app.rt.recipe!;
  return r.option?.minutes ?? r.recipe.time.totalMin;
}

export const intro: ScreenDef = {
  context: (app) => app.rt.recipe?.recipe.name ?? '',
  afford: () => AFFORD.intro,

  enter(app) {
    const r = app.rt.recipe;
    if (r && app.variant === 'a') void ensureFood(r.recipe.id).then((ok) => { if (ok && app.rt.screen === 'intro') app.repaint(); });
  },

  draw(p, app, body) {
    const r = app.rt.recipe;
    if (!r) return;
    const withImage = app.variant === 'a';
    const imgBox = { x: body.x + body.w - 236, y: body.y + 22, w: 236, h: body.h - 44 };
    const textW = withImage ? body.w - 236 - 26 : body.w - 30;
    if (withImage) foodOrGlyph(p, r.recipe.id, imgBox, recipeGlyph(r.recipe.steps));
    let y = body.y + 70;
    y = p.para(r.recipe.name, body.x + 4, y, textW, T.title, 35, 3);
    y = p.para(r.recipe.vibe, body.x + 4, y + 8, textW, T.why, 23, 4);
    p.text(INTRO.meta(recipeMinutes(app), r.option?.difficulty, r.recipe.serves), body.x + 4, Math.max(y + 22, body.y + body.h - 30), T.mono);
  },

  press: (app) => app.go('check'),

  intent(app, i) {
    if (i.kind === 'yes' || i.kind === 'next') { app.go('check'); return true; }
    if (i.kind === 'back' || i.kind === 'no') {
      const from = app.rt.recipe?.from ?? 'cookbook';
      if (from === 'choose' && app.rt.choose.options) app.go('choose');
      else app.go('cookbook');
      return true;
    }
    return false;
  },

  contents: (app) => {
    const r = app.rt.recipe?.recipe;
    return r ? { recipe: r.name, ingredients: r.ingredients.map((i) => ({ item: i.item, display: i.display })) } : undefined;
  },
};
