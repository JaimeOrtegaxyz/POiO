/**
 * The fake brain: fixtures and keyword matching, zero API calls. Used with
 * POIO_FAKE_BRAIN=1, automatically when no key is set, and as the fallback
 * when a budget cap blocks a call. The three sample recipes come from
 * reference/recipes/ (allowlisted); six more live in server/fixtures/.
 */
import { agreement, pronoun } from '../../shared/grammar';
import { matchItems } from '../../shared/match';
import { normalizeText, slugify } from '../../shared/slug';
import { STATE_ACTIONS, type Action, type BrainContext, type MissingOption, type Recipe, type SuggestOption } from '../../shared/types';
import { DEFAULT_EQUIPMENT, EXTRA_PANTRY_NAMES, NOTES, PANTRY_NAMES, pantryName, sentence } from '../../src/copy/es-MX';
import { localDate } from '../prompt';
import caldo from '../fixtures/recipes/caldo-de-pollo.json';
import enfrijoladas from '../fixtures/recipes/enfrijoladas.json';
import huevos from '../fixtures/recipes/huevos-a-la-mexicana.json';
import salsaVerde from '../fixtures/recipes/pollo-en-salsa-verde.json';
import pastor from '../fixtures/recipes/tacos-de-pollo-al-pastor.json';
import atun from '../fixtures/recipes/tostadas-de-atun.json';

interface PoolEntry extends SuggestOption { id: string; chicken: boolean; oven: boolean }

/** Canned suggestions, in the order "otras" walks through them. */
export const POOL: PoolEntry[] = [
  { id: 'tinga-de-pollo', title: 'Tinga de pollo', minutes: 25, difficulty: 'fácil', chicken: true, oven: false },
  { id: 'pollo-a-la-crema-con-rajas', title: 'Pollo a la crema con rajas', minutes: 30, difficulty: 'fácil', chicken: true, oven: false },
  { id: 'gochujang-glazed-thighs', title: 'Muslos glaseados con gochujang', minutes: 45, difficulty: 'media', chicken: true, oven: true },
  { id: 'pollo-en-salsa-verde', title: 'Pollo en salsa verde', minutes: 30, difficulty: 'fácil', chicken: true, oven: false },
  { id: 'tacos-de-pollo-al-pastor', title: 'Tacos de pollo al pastor en sartén', minutes: 25, difficulty: 'fácil', chicken: true, oven: false },
  { id: 'caldo-de-pollo', title: 'Caldo de pollo con verduras', minutes: 45, difficulty: 'fácil', chicken: true, oven: false },
  { id: 'huevos-a-la-mexicana', title: 'Huevos a la mexicana', minutes: 15, difficulty: 'fácil', chicken: false, oven: false },
  { id: 'enfrijoladas', title: 'Enfrijoladas con queso fresco', minutes: 20, difficulty: 'fácil', chicken: false, oven: false },
  { id: 'tostadas-de-atun', title: 'Tostadas de atún con chipotle', minutes: 15, difficulty: 'fácil', chicken: false, oven: false },
];

/** Cookbook-slot picks by month: [before 14:00, after 14:00], with the seasonal reason. */
const COOKBOOK: { months: number[]; picks: [string, string, string, string] }[] = [
  { months: [9, 10, 11, 0], picks: ['caldo-de-pollo', 'Es temporada de chayote.', 'pollo-en-salsa-verde', 'Hay tomate verde bueno en el mercado.'] },
  { months: [6, 7, 8], picks: ['pollo-a-la-crema-con-rajas', 'Es temporada de poblano.', 'tinga-de-pollo', 'Sale en una olla, sin prisa.'] },
  { months: [1, 2, 3, 4, 5], picks: ['tacos-de-pollo-al-pastor', 'Hay piña dulce en estos meses.', 'tinga-de-pollo', 'Sale en una olla, sin prisa.'] },
];

export class FakeBrain {
  private recipes = new Map<string, Recipe>();

  constructor(sampleFixtures: string[], private timeZone = 'America/Mexico_City') {
    for (const raw of sampleFixtures) {
      const r = JSON.parse(raw) as Recipe;
      this.recipes.set(r.id, r);
    }
    for (const r of [salsaVerde, pastor, caldo, huevos, enfrijoladas, atun] as Recipe[]) this.recipes.set(r.id, r);
  }

  allRecipes(): Recipe[] { return [...this.recipes.values()]; }

  /** A fixture for a title, if one matches closely (exact title, id, or name). */
  fixtureFor(title: string): Recipe | null {
    const n = normalizeText(title);
    const s = slugify(title);
    for (const r of this.recipes.values()) {
      if (normalizeText(r.name) === n || r.id === s) return r;
    }
    const pool = POOL.find((p) => normalizeText(p.title) === n);
    return pool ? this.recipes.get(pool.id) ?? null : null;
  }

  /** Best-effort keyword match ("tinga" -> Tinga de pollo). */
  fuzzyFixture(text: string): Recipe | null {
    const words = normalizeText(text).split(' ').filter((w) => w.length > 3 && !['pollo', 'unas', 'unos', 'hazme', 'quiero', 'para', 'cenar'].includes(w));
    let best: Recipe | null = null;
    let bestScore = 0;
    for (const r of this.recipes.values()) {
      const name = normalizeText(r.name);
      const score = words.filter((w) => name.includes(w)).length;
      if (score > bestScore) { bestScore = score; best = r; }
    }
    return best;
  }

  suggest(ctx: BrainContext, opts: { tweak?: string; exclude?: string[]; slot?: string }): { options: SuggestOption[]; reason?: string } {
    if (opts.slot === 'cookbook') {
      const d = localDate(ctx.now, this.timeZone);
      const row = COOKBOOK.find((c) => c.months.includes(d.m)) ?? COOKBOOK[0];
      const late = d.hour >= 14;
      const id = late ? row.picks[2] : row.picks[0];
      const p = POOL.find((x) => x.id === id)!;
      return { options: [strip(p)], reason: late ? row.picks[3] : row.picks[1] };
    }
    const tweak = normalizeText(opts.tweak ?? '');
    const exclude = new Set((opts.exclude ?? []).map(normalizeText));
    const outKeys = new Set(ctx.pantry.filter((p) => p.status === 'out').map((p) => p.item));
    const noChicken = /(sin pollo|no hay pollo|otra cosa que no sea pollo|algo sin pollo|no quiero pollo)/.test(tweak)
      || ['chicken-thighs-boneless', 'chicken-breast-boneless'].every((k) => outKeys.has(k)) && /pollo/.test(tweak);
    let list = POOL.filter((p) => !exclude.has(normalizeText(p.title)));
    if (/horno/.test(tweak)) list = list.filter((p) => !p.oven);
    if (noChicken) list = list.filter((p) => !p.chicken);
    if (/rapid|ligero|corto|poco tiempo/.test(tweak)) list = [...list].sort((a, b) => a.minutes - b.minutes);
    if (list.length < 3) {
      // Pool exhausted: start over, still honoring the tweak.
      let rest = POOL.filter((p) => !list.includes(p));
      if (noChicken) rest = rest.filter((p) => !p.chicken);
      list = [...list, ...rest];
    }
    return { options: list.slice(0, 3).map(strip) };
  }

  recipe(title: string): Recipe | null {
    return this.fixtureFor(title) ?? this.fuzzyFixture(title);
  }

  utterance(ctx: BrainContext, utterance: string): Action[] {
    return fakeActions(ctx, utterance, this);
  }
}

const strip = (p: PoolEntry): SuggestOption => ({ title: p.title, minutes: p.minutes, difficulty: p.difficulty });

const NAMES: Record<string, string[]> = { ...PANTRY_NAMES, ...EXTRA_PANTRY_NAMES };

/** Substitutions for the fake missing-ingredient line, keyed by pantry key. */
const SUBS: Record<string, { line: string; options: MissingOption[] }> = {
  'crema-mexican-sour-cream': {
    line: 'No hay crema. ¿La quitamos o usamos yogur? Queda menos espesa.',
    options: [{ label: 'Quitarla', kind: 'drop' }, { label: 'Usar yogur', kind: 'swap', swapItem: 'greek-yoghurt', swapDisplay: 'yogur griego' }],
  },
  'media-crema': {
    line: 'No hay media crema. ¿Usamos crema con un chorrito de leche? Queda casi igual.',
    options: [{ label: 'Crema y leche', kind: 'swap', swapItem: 'crema-mexican-sour-cream', swapDisplay: 'crema con leche' }, { label: 'Usar yogur', kind: 'swap', swapItem: 'greek-yoghurt', swapDisplay: 'yogur griego' }],
  },
  tostadas: {
    line: 'No hay tostadas. ¿La hacemos en tacos? Quedan menos crujientes.',
    options: [{ label: 'Usar tortillas', kind: 'swap', swapItem: 'corn-tortillas', swapDisplay: 'tortillas de maíz' }],
  },
  'queso-fresco': {
    line: 'No hay queso fresco. ¿Lo quitamos o usamos cotija? El cotija es más salado.',
    options: [{ label: 'Quitarlo', kind: 'drop' }, { label: 'Usar cotija', kind: 'swap', swapItem: 'cotija', swapDisplay: 'queso cotija' }],
  },
  'poblano-peppers': {
    line: 'No hay poblanos. ¿Usamos pimiento morrón? Pierde lo ahumado.',
    options: [{ label: 'Usar morrón', kind: 'swap', swapItem: 'bell-peppers', swapDisplay: 'pimiento morrón' }],
  },
  'chipotle-in-adobo-canned': {
    line: 'No hay chipotles. ¿Usamos chile ancho remojado? Queda menos ahumado.',
    options: [{ label: 'Usar ancho', kind: 'swap', swapItem: 'chile-ancho', swapDisplay: 'chile ancho remojado' }],
  },
  gochujang: {
    line: 'No hay gochujang. ¿Usamos miso con sriracha? Queda menos dulce.',
    options: [{ label: 'Miso y sriracha', kind: 'swap', swapItem: 'miso-paste-white-or-red', swapDisplay: 'miso con sriracha' }],
  },
  'chicken-broth-stock': {
    line: 'No hay caldo. ¿Usamos agua con sal? Queda menos sabroso.',
    options: [{ label: 'Agua con sal', kind: 'swap', swapItem: 'water', swapDisplay: 'agua con sal' }],
  },
};

function missingFor(item: string, display: string): Action {
  const sub = SUBS[item];
  if (sub) return { action: 'missing', item, display, line: sub.line, options: sub.options };
  const pro = pronoun(agreement(display));
  return {
    action: 'missing',
    item,
    display,
    line: `No hay ${display}. ¿${pro.charAt(0).toUpperCase() + pro.slice(1)} quitamos? Cambia un poco el plato.`,
    options: [{ label: `Quitar${pro}`, kind: 'drop' }],
  };
}

/** Ingredients on the current screen (recipe screens send them as contents.ingredients). */
function screenIngredients(ctx: BrainContext): { item: string; display: string }[] {
  const c = ctx.screen.contents as { ingredients?: { item: string; display?: string }[] } | undefined;
  return (c?.ingredients ?? []).map((i) => ({ item: i.item, display: i.display || pantryName(i.item) }));
}

function screenOptions(ctx: BrainContext): string[] {
  const c = ctx.screen.contents as { options?: { title: string }[] } | undefined;
  return (c?.options ?? []).map((o) => o.title);
}

/** Equipment words the fake brain knows, as the note writes them. */
const EQUIPMENT: [RegExp, string][] = [
  [/estufa|parrilla electrica|parrilla de induccion|induccion/, 'estufa'],
  [/horno(?! de microondas| tostador)/, 'horno'],
  [/sarten/, 'sartén'],
  [/licuadora/, 'licuadora'],
  [/freidora( de aire)?|air ?fryer/, 'freidora de aire'],
  [/olla (de presion|express?|expres)|instant ?pot/, 'olla de presión'],
  [/microondas/, 'microondas'],
  [/horno tostador|tostador/, 'horno tostador'],
  [/comal/, 'comal'],
  [/asador|parrilla(?! electrica| de induccion)/, 'asador'],
  [/procesador/, 'procesador'],
  [/wok/, 'wok'],
  [/olla de coccion lenta|slow ?cooker|crock ?pot/, 'olla de cocción lenta'],
];

/** Onboarding Q4 in fake mode: the default kitchen, minus what they lack, plus what they named. */
export function fakeEquipment(utterance: string): Action {
  const n = normalizeText(utterance);
  const lacks = new Set<string>();
  const adds: string[] = [];
  // "no tengo horno", "sin licuadora", "no hay horno ni licuadora"
  const neg = /(no tengo|no hay|sin|me falta|no cuento con)\b(.*)/.exec(n)?.[2] ?? '';
  for (const [re, name] of EQUIPMENT) {
    if (neg && re.test(neg)) lacks.add(name);
    else if (re.test(n) && !DEFAULT_EQUIPMENT.includes(name)) adds.push(name);
  }
  if (!lacks.size && !adds.length) return { action: 'not_understood' };
  const have = [...DEFAULT_EQUIPMENT.filter((e) => !lacks.has(e)), ...adds];
  return { action: 'poionotas', add: [NOTES.equipment(have, [...lacks])], reply: 'Anotado.' };
}

/** Onboarding Q3 in fake mode: a diet word becomes a clear note; anything else is kept as said. */
export function fakeDiet(utterance: string): Action {
  const n = normalizeText(utterance);
  if (/vegan/.test(n)) return { action: 'poionotas', add: ['Dieta vegana: nada de origen animal.'], reply: 'Anotado.' };
  if (/vegetarian|no como carne|no comemos carne/.test(n)) return { action: 'poionotas', add: ['Dieta vegetariana: sin carne, pollo ni pescado.'], reply: 'Anotado.' };
  if (/pescetarian|solo pescado/.test(n)) return { action: 'poionotas', add: ['Sin carne ni pollo; pescado sí.'], reply: 'Anotado.' };
  // Notes speak to the user: "no como cerdo" -> "No comes cerdo."
  const note = sentence(utterance).replace(/^No como\b/, 'No comes').replace(/^No comemos\b/, 'No comen');
  return note ? { action: 'poionotas', add: [/^no\b/i.test(note) ? note : `No comes: ${note.replace(/\.$/, '')}.`], reply: 'Anotado.' } : { action: 'not_understood' };
}

/**
 * The fake reply: an utterance can ask for several things ("me gusta la
 * primera pero no tengo perejil"). Each clause around "pero" is read on its
 * own; what's understood comes back in order, state first, one move.
 */
export function fakeActions(ctx: BrainContext, utterance: string, brain: FakeBrain): Action[] {
  const screen = ctx.screen.id;
  if (screen === 'onboarding-3') return [fakeDiet(utterance)];
  if (screen === 'onboarding-4') return [fakeEquipment(utterance)];
  const clauses = utterance.split(/\s*,?\s+pero\s+/i).map((c) => c.trim()).filter(Boolean);
  let got = clauses.map((c) => fakeUtterance(ctx, c, brain)).filter((a) => a.action !== 'not_understood');
  if (clauses.length > 1 && !got.length) got = [fakeUtterance(ctx, utterance, brain)].filter((a) => a.action !== 'not_understood');
  const state = got.filter((a) => STATE_ACTIONS.includes(a.action));
  const move = got.find((a) => !STATE_ACTIONS.includes(a.action));
  const out = [...state, ...(move ? [move] : [])];
  return out.length ? out : [{ action: 'not_understood' }];
}

export function fakeUtterance(ctx: BrainContext, utterance: string, brain: FakeBrain): Action {
  const n = normalizeText(utterance);
  const screen = ctx.screen.id;
  const items = matchItems(utterance, NAMES);

  // "Me gusta la primera", "quiero la dos": a pick, before "me gusta" reads as a taste note.
  if (screen === 'choose') {
    const ord = /\b(primera|primero|segunda|segundo|tercera|tercero|ultima|ultimo)\b|\b(?:la|el|opcion) ([123])\b/.exec(n);
    if (ord) {
      const idx = ord[2] ? Number(ord[2]) : ({ primera: 1, primero: 1, segunda: 2, segundo: 2, tercera: 3, tercero: 3, ultima: 3, ultimo: 3 } as Record<string, number>)[ord[1]];
      return { action: 'pick', index: idx };
    }
  }

  // Poionotas: forget something.
  if (/^(olvida|borra|quita|ya no tomes en cuenta)\b/.test(n)) {
    const topic = n.replace(/^(olvida|borra|quita|ya no tomes en cuenta)( lo de| que| lo del| la de| eso de)?/, '').replace(/^\s*(el|la|los|las|lo|del|de)\s+/, '').trim();
    const words = topic.split(' ').filter((w) => w.length > 2);
    const remove = ctx.poionotas.filter((note) => words.some((w) => normalizeText(note).includes(w)));
    return remove.length ? { action: 'poionotas', remove, reply: 'Listo, ya no lo tomo en cuenta.' } : { action: 'not_understood' };
  }

  // Poionotas: restrictions and dislikes.
  if (/(no me gusta|no me gustan|no como|no comemos|soy alergic|alergia|no puedo comer|me gusta|me encanta)/.test(n)) {
    const note = utterance.trim().replace(/[.!]+$/, '');
    return { action: 'poionotas', add: [`${note.charAt(0).toUpperCase()}${note.slice(1)}.`], reply: 'Anotado.' };
  }

  // Stock news: bought something.
  if (/^(compre|compramos|traje|ya hay|ya tengo|hay|tengo)\b/.test(n) && items.length) {
    return { action: 'pantry', changes: items.map((m) => ({ item: m.key, status: 'plenty' as const, display: pantryName(m.key) })), reply: 'Anotado.' };
  }

  // Missing before cooking vs. out while cooking.
  const outMatch = /(se acabo|se acabaron|se termino|se terminaron|ya no hay|ya no queda|no queda|no hay|no tengo|nos quedamos sin|queda poco|casi no hay)/.exec(n);
  if (outMatch) {
    const low = /(queda poco|casi no hay)/.test(outMatch[1]);
    const ing = screenIngredients(ctx);
    const onRecipe = ['check', 'missing', 'intro'].includes(screen);
    if (onRecipe && !low) {
      // Prefer the recipe's own ingredient whose display or name matches.
      const hit = ing.find((i) => items.some((m) => m.key === i.item))
        ?? ing.find((i) => n.includes(normalizeText(i.display)) || normalizeText(i.display).split(' ').some((w) => w.length > 3 && n.includes(w)));
      if (hit) return missingFor(hit.item, hit.display);
    }
    if (/sin pollo|no hay pollo/.test(n) && ['choose', 'cookbook'].includes(screen)) return { action: 'tweak', tweak: utterance };
    if (items.length) {
      const recipeHit = ing.find((i) => items.some((m) => m.key === i.item));
      const keys = recipeHit ? [{ key: recipeHit.item, display: recipeHit.display }] : items.slice(0, 3).map((m) => ({ key: m.key, display: pantryName(m.key) }));
      return { action: 'pantry', changes: keys.map((k) => ({ item: k.key, status: low ? 'low' as const : 'out' as const, display: k.display })), reply: 'Anotado.' };
    }
  }

  // Tweaks on the options.
  if (['choose', 'cookbook'].includes(screen) && /(mas rapido|rapido|algo rapido|sin horno|mas ligero|algo ligero|sin pollo|algo mas|algo con|algo sin|menos picante|mas sencillo)/.test(n)) {
    return { action: 'tweak', tweak: utterance };
  }

  // Pick by name.
  const opts = screenOptions(ctx);
  if (opts.length) {
    const idx = opts.findIndex((t) => normalizeText(t).split(' ').filter((w) => w.length > 3 && w !== 'pollo').some((w) => n.includes(w)));
    if (idx >= 0) return { action: 'pick', index: idx + 1, title: opts[idx] };
  }

  // A specific dish.
  if (/^(hazme|haz|quiero|prepara|preparemos|cocina|cocinemos|se me antoja|me antoja|antojo de)\b/.test(n)) {
    const r = brain.fuzzyFixture(n);
    if (r) return { action: 'recipe_request', title: r.name };
    return { action: 'not_understood' };
  }

  // A pending check-in answer on the cookbook screen.
  const c = ctx.screen.contents as { checkin?: string } | undefined;
  if (screen === 'cookbook' && c?.checkin) {
    const note = utterance.trim().replace(/[.!]+$/, '');
    return { action: 'poionotas', add: [`${c.checkin}: ${note}.`], reply: 'Anotado.' };
  }

  // A cooking question.
  if (/^(como|cuanto|cuanta|cuantos|que es|con que|puedo|se puede|por que|cual)\b/.test(n)) {
    return { action: 'answer', text: 'En modo demo no sé responder eso. Con la clave del cerebro, sí.' };
  }

  return { action: 'not_understood' };
}
