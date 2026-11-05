/**
 * First run: four skippable questions, each with its why-line, then straight
 * to three options. No summary, no "¿listo?". Defaults per setup/interview.md.
 */
import { normalizeText } from '../../shared/slug';
import { AFFORD, CONTEXT, NOTES, NOTHING_WORDS, ONBOARDING, pantryName, progress, sentence } from '../copy/es-MX';
import { parseServings } from '../input/intent';
import type { App } from './app';
import { T } from './draw';
import type { ScreenDef } from './screens';

/** Q4 skipped or partial: assume the basics and chicken, marked "supuesto". */
export const ASSUMED_BASICS = ['salt-kosher-table', 'vegetable-oil', 'white-onion', 'garlic', 'chicken-thighs-boneless', 'chicken-breast-boneless'];

function assumeBasics(app: App): void {
  const t = app.now();
  for (const key of ASSUMED_BASICS) {
    if (!app.state.pantry[key]) app.state.pantry[key] = { status: 'plenty', display: pantryName(key), assumed: true, at: t };
  }
}

function next(app: App): void {
  if (app.rt.onboardingQ < ONBOARDING.length - 1) {
    app.rt.onboardingQ++;
    app.band = null;
    app.repaint();
    return;
  }
  finish(app);
}

function finish(app: App): void {
  assumeBasics(app);
  app.state.onboarded = true;
  app.save();
  void app.openChoose('cookbook');
}

function skip(app: App): void {
  const q = app.rt.onboardingQ;
  app.track('onboarding_skip', { q: q + 1 });
  if (q === 1) app.addNotes([NOTES.servings(2)]);
  if (q === 2) app.addNotes([NOTES.noRestrictions]);
  app.save();
  next(app);
}

export const onboarding: ScreenDef = {
  context: () => CONTEXT.onboarding,
  meta: (app) => progress(app.rt.onboardingQ + 1, ONBOARDING.length),
  afford: () => AFFORD.onboarding,

  enter(app) { app.rt.onboardingQ = 0; },

  draw(p, app, body) {
    const q = ONBOARDING[app.rt.onboardingQ];
    let y = body.y + 82;
    y = p.para(q.ask, body.x + 8, y, body.w - 40, T.question, 36, 3);
    p.para(q.why, body.x + 8, y + 8, body.w - 60, T.why, 23, 3);
  },

  press: (app) => skip(app),

  intent(app, i) {
    if (i.kind === 'skip' || i.kind === 'next') { skip(app); return true; }
    if (i.kind === 'number' && app.rt.onboardingQ === 1) {
      app.state.prefs.servings = i.value;
      app.addNotes([NOTES.servings(i.value)]);
      app.track('onboarding_answer', { q: 2 });
      next(app);
      return true;
    }
    if (i.kind === 'no' && app.rt.onboardingQ === 2) {
      app.addNotes([NOTES.noRestrictions]);
      app.track('onboarding_answer', { q: 3 });
      next(app);
      return true;
    }
    return false;
  },

  async utterance(app, text) {
    const q = app.rt.onboardingQ;
    if (q === 0) {
      const city = sentence(text).replace(/\.$/, '').replace(/^(en|cocino en|vivo en)\s+/i, '');
      app.state.prefs.city = city.charAt(0).toUpperCase() + city.slice(1);
      app.addNotes([NOTES.city(app.state.prefs.city)]);
      app.track('onboarding_answer', { q: 1 });
      next(app);
      return true;
    }
    if (q === 1) {
      const n = parseServings(text);
      if (!n) { app.notUnderstood(); return true; }
      app.state.prefs.servings = n;
      app.addNotes([NOTES.servings(n)]);
      app.track('onboarding_answer', { q: 2 });
      next(app);
      return true;
    }
    if (q === 2) {
      const nothing = NOTHING_WORDS.includes(normalizeText(text));
      app.addNotes([nothing ? NOTES.noRestrictions : NOTES.restriction(text)]);
      app.track('onboarding_answer', { q: 3 });
      next(app);
      return true;
    }
    // Q4: map what's at hand to pantry keys. One small brain call (keyword matching in fake mode).
    return false;
  },

  action(app, a) {
    if (app.rt.onboardingQ !== 3) return false;
    if (a.action === 'pantry' && a.changes?.length) {
      app.applyPantry(a.changes.map((c) => ({ ...c, status: 'plenty' })));
      app.track('onboarding_answer', { q: 4, items: a.changes.length });
    } else {
      app.track('onboarding_skip', { q: 4 });
    }
    finish(app);
    return true;
  },

  contents: (app) => ({ question: ONBOARDING[app.rt.onboardingQ].ask }),
};
