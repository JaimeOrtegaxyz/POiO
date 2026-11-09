import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { keyAction } from '../src/input/keys';
import { HOLD_MS } from '../src/input/knob';
import { MIN_HOLD_MS } from '../src/input/ptt';
import { App } from '../src/flows/app';
import { PROFILES } from '../src/screen/profiles';
import { freshState } from '../src/state/store';

describe('keyboard map: star knob, back pill, home pill', () => {
  const cases: [string, Parameters<typeof keyAction>[0], ReturnType<typeof keyAction>][] = [
    ['→ turns forward', { key: 'ArrowRight' }, { kind: 'rotate', dir: 1 }],
    ['↓ turns forward', { key: 'ArrowDown' }, { kind: 'rotate', dir: 1 }],
    ['← turns back', { key: 'ArrowLeft' }, { kind: 'rotate', dir: -1 }],
    ['↑ turns back', { key: 'ArrowUp' }, { kind: 'rotate', dir: -1 }],
    ['Enter presses the knob', { key: 'Enter' }, { kind: 'press' }],
    ['Space holds the knob to talk', { key: ' ', code: 'Space' }, { kind: 'talk' }],
    ['Esc is the back pill', { key: 'Escape' }, { kind: 'back' }],
    ['Backspace is the back pill', { key: 'Backspace' }, { kind: 'back' }],
    ['H is the home pill', { key: 'h' }, { kind: 'home' }],
    ['shift-H is the home pill too', { key: 'H' }, { kind: 'home' }],
    ['other keys do nothing', { key: 'x' }, null],
    ['Cmd-H stays a browser shortcut', { key: 'h', metaKey: true }, null],
    ['Ctrl-← stays a browser shortcut', { key: 'ArrowLeft', ctrlKey: true }, null],
  ];
  for (const [name, e, want] of cases) it(name, () => expect(keyAction(e)).toEqual(want));

  it('a pointer hold only starts talking once it is long enough to be understood', () => {
    expect(HOLD_MS).toBeGreaterThanOrEqual(MIN_HOLD_MS);
  });
});

describe('back and home pills', () => {
  let app: App | null = null;

  beforeAll(() => {
    const mem = new Map<string, string>();
    (globalThis as any).localStorage = {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
    };
  });
  afterEach(() => { app?.turnOff(); app = null; });

  function device(onboarded: boolean): App {
    const state = freshState();
    state.onboarded = onboarded;
    state.variant = 'b';
    const screen = { profile: PROFILES['spectra6-4in'], timing: 'fast', render: () => {} } as any;
    const api = { session: '', suggest: async () => null, recipe: async () => null, utterance: async () => null, usage: async () => null } as any;
    const sounds = { play: () => {}, muted: true } as any;
    app = new App(state, screen, api, sounds);
    app.turnOn();
    return app;
  }

  it('back leaves the pantry and the notes for the cookbook', () => {
    const a = device(true);
    expect(a.rt.screen).toBe('cookbook');
    a.rotate(1);
    expect(a.rt.screen).toBe('pantry');
    a.back();
    expect(a.rt.screen).toBe('cookbook');
    a.rotate(-1);
    expect(a.rt.screen).toBe('notes');
    a.back();
    expect(a.rt.screen).toBe('cookbook');
  });

  it('back first clears a band, and does nothing while waiting on the brain', () => {
    const a = device(true);
    a.rotate(1);
    a.setBand('thinking', '…');
    a.back();
    expect(a.rt.screen).toBe('pantry');
    a.setBand('answer', 'Sí.');
    a.back();
    expect(a.band).toBeNull();
    expect(a.rt.screen).toBe('cookbook');
  });

  it('home goes to the cookbook and drops a recipe in progress', () => {
    const a = device(true);
    a.rotate(-1);
    a.rt.cook.pending.push({ step: 2, message: 'Revisa el pollo.', dueAt: Date.now() + 60_000 });
    a.home();
    expect(a.rt.screen).toBe('cookbook');
    expect(a.rt.cook.pending).toEqual([]);
  });

  it('home is ignored during the first-run questions', () => {
    const a = device(false);
    expect(a.rt.screen).toBe('onboarding');
    a.home();
    expect(a.rt.screen).toBe('onboarding');
  });

  it('the pills do nothing with the device off', () => {
    const a = device(true);
    a.turnOff();
    a.back();
    a.home();
    expect(a.rt.screen).toBe('off');
  });
});

describe('tutorial: a practice run on the screen', () => {
  function device(): { app: App; brainCalls: string[]; hints: (string | null)[] } {
    const mem = new Map<string, string>();
    (globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    const state = freshState();
    state.variant = 'b';
    const brainCalls: string[] = [];
    const screen = { profile: PROFILES['spectra6-4in'], timing: 'fast', render: () => {} } as any;
    const api = { session: '', suggest: async () => { brainCalls.push('suggest'); return null; }, recipe: async () => { brainCalls.push('recipe'); return null; }, utterance: async () => { brainCalls.push('utterance'); return null; }, usage: async () => null } as any;
    const app = new App(state, screen, api, { play: () => {}, muted: true } as any);
    const hints: (string | null)[] = [];
    app.onHint = (c) => hints.push(c);
    return { app, brainCalls, hints };
  }

  it('walks press → turn → pick → back → talk → home → done, asking for one control at a time', async () => {
    const { app, brainCalls, hints } = device();
    app.startTutorial(); // from off: turns on straight into the tutorial
    expect(app.on).toBe(true);
    expect(app.rt.screen).toBe('tutorial');
    expect(hints.at(-1)).toBe('knob');

    app.press();
    expect(app.rt.tutorial.step).toBe(1);
    app.press(); // pick before turning: told to turn first
    expect(app.rt.tutorial.step).toBe(1);
    expect(app.band?.text).toMatch(/Primero gírala/);
    app.rotate(1); app.rotate(1);
    expect(app.rt.tutorial.sel).toBe(2);
    app.press();
    expect(app.rt.tutorial.step).toBe(2);
    expect(app.rt.tutorial.dish).toBe('pollo a la crema');
    expect(hints.at(-1)).toBe('back');

    app.home(); // wrong pill
    expect(app.rt.tutorial.step).toBe(2);
    expect(app.band?.text).toMatch(/izquierda/);
    app.back();
    expect(app.rt.tutorial.step).toBe(3);

    app.press(); // a press isn't a hold
    expect(app.band?.text).toMatch(/Mantenla presionada/);
    await app.pttEnd('¿qué hago de cenar?', 900, false);
    expect(app.rt.tutorial.step).toBe(4);
    expect(app.rt.tutorial.heard).toBe('¿qué hago de cenar?');
    expect(hints.at(-1)).toBe('home');

    app.back(); // wrong pill
    expect(app.rt.tutorial.step).toBe(4);
    app.home();
    expect(app.rt.tutorial.step).toBe(5);
    app.press();
    expect(app.rt.screen).toBe('onboarding'); // a fresh device goes on to the first-run questions
    expect(app.state.tutorialSeen).toBe(true);
    expect(hints.at(-1)).toBeNull();
    expect(brainCalls).toEqual([]); // practice never reaches the brain
    app.turnOff();
  });

  it('nothing said or typed during the tutorial reaches the brain', async () => {
    const { app, brainCalls } = device();
    app.startTutorial();
    for (const t of ['otras', 'hazme unas tostadas de tinga', 'atrás', 'no hay crema']) await app.pttEnd(t, 0, true);
    expect(brainCalls).toEqual([]);
    app.turnOff();
  });

  it('closing it early lands where a turn-on would, and counts as seen', () => {
    const { app } = device();
    app.state.onboarded = true;
    app.startTutorial();
    app.endTutorial();
    expect(app.rt.screen).toBe('cookbook');
    expect(app.state.tutorialSeen).toBe(true);
    app.turnOff();
  });
});

describe('reactive voice: anything said, anywhere, adjusts', () => {
  const OPTIONS = [
    { title: 'Muslos en adobo de guajillo', minutes: 35, difficulty: 'fácil' as const },
    { title: 'Pollo glaseado con soya y jengibre', minutes: 25, difficulty: 'fácil' as const },
    { title: 'Tinga de pollo', minutes: 30, difficulty: 'fácil' as const },
  ];

  function device(onboarded: boolean, replies: { utterance?: any[] } = {}) {
    const mem = new Map<string, string>();
    (globalThis as any).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
    const state = freshState();
    state.onboarded = onboarded;
    state.variant = 'b';
    const calls: { kind: string; context: any; arg?: any; tweak?: string }[] = [];
    const renders: string[] = [];
    const screen = { profile: PROFILES['spectra6-4in'], timing: 'fast', render: (_d: unknown, kind: string) => renders.push(kind), still: () => {} } as any;
    const recipe = (title: string) => ({ id: 'r', name: title, vibe: 'v', serves: 2, time: { activeMin: 10, totalMin: 30 },
      ingredients: [{ item: 'flat-leaf-parsley', display: 'perejil', qty: '1 manojo', group: 'Dairy & Finish' }, { item: 'chicken-thighs-boneless', display: 'pollo', qty: '500 g', group: 'Protein' }],
      steps: [{ n: 1, text: 'Uno.' }, { n: 2, text: 'Dos.' }, { n: 3, text: 'Tres.' }] });
    const api = {
      session: '',
      suggest: async (context: any) => { calls.push({ kind: 'suggest', context }); return { options: OPTIONS, fake: true }; },
      recipe: async (context: any, title: string, tweak?: string) => { calls.push({ kind: 'recipe', context, arg: title, tweak }); return { recipe: recipe(title), fake: true }; },
      utterance: async (context: any, text: string) => { calls.push({ kind: 'utterance', context, arg: text }); return { actions: replies.utterance?.shift() ?? [{ action: 'not_understood' }], fake: true }; },
      usage: async () => null,
    } as any;
    const app = new App(state, screen, api, { play: () => {}, muted: true } as any);
    return { app, calls, renders };
  }
  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('"me gusta la primera pero no tengo perejil": perejil out, the first dish opens, the check offers the swap', async () => {
    const { app, calls } = device(true, { utterance: [[
      { action: 'pantry', changes: [{ item: 'flat-leaf-parsley', status: 'out', display: 'perejil' }] },
      { action: 'pick', index: 1 },
    ]] });
    app.turnOn();
    await app.openChoose('cookbook');
    expect(app.rt.screen).toBe('choose');
    await app.utterance('me gusta la primera pero no tengo perejil');
    await flush();
    expect(app.state.pantry['flat-leaf-parsley']?.status).toBe('out');
    const r = calls.find((c) => c.kind === 'recipe');
    expect(r?.arg).toBe('Muslos en adobo de guajillo');
    // The recipe call already knows there's no perejil.
    expect(r?.context.pantry).toContainEqual({ item: 'flat-leaf-parsley', status: 'out', display: 'perejil' });
    expect(app.rt.screen).toBe('intro');
    // Quietly remembered: no "Anotado" band covering the move.
    expect(app.band).toBeNull();
    app.turnOff();
  });

  it('first run: "sí" keeps the defaults, the diet goes to the brain, and the first options are a first round', async () => {
    const { app, calls } = device(false, { utterance: [[{ action: 'poionotas', add: ['Dieta vegetariana: sin carne, pollo ni pescado.'] }]] });
    app.turnOn();
    await app.utterance('Guadalajara');
    await app.utterance('para dos');
    await app.utterance('soy vegetariano');
    expect(calls.filter((c) => c.kind === 'utterance').map((c) => c.context.screen.id)).toEqual(['onboarding-3']);
    expect(app.rt.onboardingQ).toBe(3);
    await app.utterance('sí');
    await flush();
    const notes = app.state.poionotas.map((n) => n.text);
    expect(notes).toContain('Dieta vegetariana: sin carne, pollo ni pescado.');
    expect(notes).toContain('Cocinas con estufa, horno, sartén y licuadora.');
    // Vegetarian: the device doesn't assume chicken; the basics it does assume are marked.
    expect(app.state.pantry['chicken-thighs-boneless']).toBeUndefined();
    expect(app.state.pantry.garlic).toMatchObject({ status: 'plenty', assumed: true });
    expect(app.rt.screen).toBe('choose');
    expect(app.rt.choose.from).toBe('onboarding');
    const s = calls.find((c) => c.kind === 'suggest')!;
    expect(s.context.firstRound).toBe(true);
    expect(s.context.pantry).toContainEqual({ item: 'garlic', status: 'plenty', display: 'ajo', assumed: true });
    app.turnOff();
  });

  it('a change asked for mid-cook rewrites the dish and keeps the step', async () => {
    const { app, calls } = device(true, { utterance: [[{ action: 'tweak', tweak: 'sin picante' }]] });
    app.turnOn();
    await app.openRecipe({ title: 'Tinga de pollo' }, 'cookbook');
    app.go('check');
    app.press(); // start cooking
    app.press(); // step 2
    expect(app.rt.screen).toBe('cook');
    expect(app.rt.cook.step).toBe(1);
    await app.utterance('hazla sin picante');
    await flush();
    const r = calls.filter((c) => c.kind === 'recipe').at(-1)!;
    expect(r).toMatchObject({ arg: 'Tinga de pollo', tweak: 'sin picante' });
    expect(app.rt.screen).toBe('cook');
    expect(app.rt.cook.step).toBe(1);
    app.turnOff();
  });

  it('turning off paints the sleep image (e-paper keeps it with no power)', () => {
    const { app, renders } = device(true);
    app.turnOn();
    renders.length = 0;
    app.turnOff();
    expect(renders).toEqual(['full']);
  });
});
