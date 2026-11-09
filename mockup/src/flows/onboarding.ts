/**
 * First run: four skippable questions, each with its why-line, then straight
 * to three options. No summary, no "¿listo?". Defaults per setup/interview.md.
 *
 * City and servings are read here. The diet answer ("soy vegetariano", "no
 * como cerdo") and the equipment answer ("no tengo horno, pero sí freidora")
 * go to the brain, which writes them as poionotas; "sí", "de todo" and a
 * skip take the defaults without a call. The pantry isn't asked: the first
 * options don't depend on it, and the ingredient check fills it in.
 *
 * Each answer is said back in one short line above the next question
 * ("Guadalajara, anotado."), and the last one above the first-round wait,
 * so the person sees they were understood. A skip says nothing back.
 */
import { normalizeText } from '../../shared/slug';
import type { Action } from '../../shared/types';
import { AFFORD, CONTEXT, DEFAULT_EQUIPMENT, EQUIPMENT_WHAT, HEARD, NOTES, NOTHING_WORDS, ONBOARDING, pantryName, progress, sentence } from '../copy/es-MX';
import { parseServings } from '../input/intent';
import type { App } from './app';
import { T } from './draw';
import type { ScreenDef } from './screens';

/** The pantry nobody was asked about: the basics, marked "supuesto" (and sent to the brain as guesses). */
export const ASSUMED_BASICS = ['salt-kosher-table', 'vegetable-oil', 'white-onion', 'garlic'];
/** Chicken too, unless the diet answer rules it out. */
export const ASSUMED_CHICKEN = ['chicken-thighs-boneless', 'chicken-breast-boneless'];

/** Does a note say this person doesn't eat chicken? (vegetarian, vegan, "no como pollo") */
export function noChicken(notes: string[]): boolean {
  return notes.some((n) => /(vegetarian|vegan|sin carne, pollo|no come[s]? (carne|pollo)|no como (carne|pollo)|sin pollo)/.test(normalizeText(n)));
}

function assumeBasics(app: App): void {
  const t = app.now();
  const keys = noChicken(app.state.poionotas.map((n) => n.text)) ? ASSUMED_BASICS : [...ASSUMED_BASICS, ...ASSUMED_CHICKEN];
  for (const key of keys) {
    if (!app.state.pantry[key]) app.state.pantry[key] = { status: 'plenty', display: pantryName(key), assumed: true, at: t };
  }
}

/** On to the next question (or the first options), saying back what was heard. */
function next(app: App, heard: string | null = null): void {
  app.rt.onboardingHeard = heard;
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
  // The first options: from 'onboarding', so the wait and the screen say what this round is.
  void app.openChoose('onboarding');
}

/** The default for each question when it's skipped or answered "sí". */
function takeDefault(app: App, q: number): void {
  if (q === 1) app.addNotes([NOTES.servings(2)]);
  if (q === 2) app.addNotes([NOTES.noRestrictions]);
  if (q === 3) app.addNotes([NOTES.equipment(DEFAULT_EQUIPMENT)]);
}

function skip(app: App): void {
  const q = app.rt.onboardingQ;
  app.track('onboarding_skip', { q: q + 1 });
  takeDefault(app, q);
  app.save();
  next(app);
}

function answered(app: App, q: number, data: Record<string, number> = {}, heard: string | null = null): void {
  app.track('onboarding_answer', { q: q + 1, ...data });
  app.save();
  next(app, heard);
}

export const onboarding: ScreenDef = {
  context: () => CONTEXT.onboarding,
  meta: (app) => progress(app.rt.onboardingQ + 1, ONBOARDING.length),
  afford: () => AFFORD.onboarding,

  enter(app) { app.rt.onboardingQ = 0; app.rt.onboardingHeard = null; },

  draw(p, app, body) {
    const q = ONBOARDING[app.rt.onboardingQ];
    const heard = app.rt.onboardingHeard;
    if (heard) p.para(heard, body.x + 8, body.y + 36, body.w - 40, T.body, 26, 1);
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
      next(app, HEARD.servings(i.value));
      return true;
    }
    const q = app.rt.onboardingQ;
    // "¿Comes de todo…?" — "sí" or "no" (nothing I don't eat) both mean the default.
    if ((i.kind === 'no' || i.kind === 'yes') && q === 2) { takeDefault(app, q); answered(app, q, {}, HEARD.eatsAll); return true; }
    // "Supongo que tienes… ¿Así es?" — "sí" keeps the guess; a bare "no" asks what's different.
    if (i.kind === 'yes' && q === 3) { takeDefault(app, q); answered(app, q); return true; }
    if (i.kind === 'no' && q === 3) { app.notice(EQUIPMENT_WHAT); return true; }
    return false;
  },

  async utterance(app, text) {
    const q = app.rt.onboardingQ;
    if (q === 0) {
      const city = sentence(text).replace(/\.$/, '').replace(/^(en|cocino en|vivo en)\s+/i, '');
      app.state.prefs.city = city.charAt(0).toUpperCase() + city.slice(1);
      app.addNotes([NOTES.city(app.state.prefs.city)]);
      app.track('onboarding_answer', { q: 1 });
      next(app, HEARD.city(app.state.prefs.city));
      return true;
    }
    if (q === 1) {
      const n = parseServings(text);
      if (!n) { app.notUnderstood(); return true; }
      app.state.prefs.servings = n;
      app.addNotes([NOTES.servings(n)]);
      app.track('onboarding_answer', { q: 2 });
      next(app, HEARD.servings(n));
      return true;
    }
    if (q === 2 && NOTHING_WORDS.includes(normalizeText(text))) { takeDefault(app, q); answered(app, q, {}, HEARD.eatsAll); return true; }
    // Q3 diet and Q4 equipment, in the user's words: the brain writes them as notes.
    return false;
  },

  actions(app, list: Action[]) {
    const q = app.rt.onboardingQ;
    if (q < 2) return false;
    let notes = 0;
    let heard: string | null = null;
    for (const a of list) {
      if (a.action === 'poionotas') {
        app.removeNotes(a.remove ?? []); app.addNotes(a.add ?? []); notes += (a.add ?? []).length;
        // The brain says back what it understood ("Sin cerdo y poco picante."); a bare "Anotado." says nothing.
        if (a.reply?.trim() && !/^anotado\.?$/i.test(a.reply.trim())) heard = a.reply.trim();
      }
      // Food mentioned in passing ("no como cerdo, y tengo pollo"): it's in the kitchen.
      if (a.action === 'pantry' && a.changes?.length) app.applyPantry(a.changes);
    }
    if (!notes) { app.notUnderstood(); return true; }
    answered(app, q, { notes }, heard);
    return true;
  },

  contents: (app) => ({ question: ONBOARDING[app.rt.onboardingQ].ask }),
};
