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
