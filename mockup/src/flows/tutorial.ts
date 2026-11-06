/**
 * The tutorial ("Cómo se usa"): a practice run on the screen itself. The
 * masthead says "Tutorial · n de 6"; each step asks for one real action with
 * one control, the screen answers, and the next step asks for the next one:
 *
 *   1 hello   press the star
 *   2 turn    turn it through three practice rows, then press to pick one
 *   3 back    the left pill goes back
 *   4 talk    hold the star (or Space, or type) and say anything
 *   5 home    the right pill: the cookbook
 *   6 done    press to start for real
 *
 * The control being asked for gets a static ring on the face (`hint`). A
 * wrong control gets a short band saying which one. Nothing here is saved,
 * logged or sent to the brain: every utterance stops at `hear`.
 */
import { TUTORIAL } from '../copy/es-MX';
import { parseIntent } from '../input/intent';
import type { App } from './app';
import { T, row } from './draw';
import type { ScreenDef } from './screens';

export type Control = 'knob' | 'back' | 'home';

const STEPS = 6;
const HINT: Control[] = ['knob', 'knob', 'back', 'knob', 'home', 'knob'];

function advance(app: App, step: number): void {
  app.rt.tutorial.step = step;
  app.band = null;
  // A new step is a view change: a full refresh, like any other screen change.
  app.render('full');
}

function ask(app: App): string {
  const t = app.rt.tutorial;
  switch (t.step) {
    case 0: return TUTORIAL.hello.ask;
    case 1: return t.turns > 0 ? TUTORIAL.turn.nowPress : TUTORIAL.turn.ask;
    case 2: return TUTORIAL.back.ask;
    case 3: return TUTORIAL.talk.ask;
    case 4: return TUTORIAL.home.ask;
    default: return TUTORIAL.done.ask;
  }
}

/** The step wanted another control: say which, in a short band. */
function wrong(app: App): void {
  const want = HINT[app.rt.tutorial.step];
  app.notice(want === 'back' ? TUTORIAL.wrong.back : want === 'home' ? TUTORIAL.wrong.home : TUTORIAL.wrong.knob);
}

export const tutorial: ScreenDef = {
  context: () => TUTORIAL.context,
  meta: (app) => TUTORIAL.meta(app.rt.tutorial.step + 1, STEPS),
  afford(app) {
    const s = app.rt.tutorial.step;
    return s === 1 ? TUTORIAL.afford.turn : s === 2 ? TUTORIAL.afford.back : s === 3 ? TUTORIAL.afford.talk : s === 4 ? TUTORIAL.afford.home : TUTORIAL.afford.press;
  },
  hint: (app) => HINT[app.rt.tutorial.step] ?? null,

  draw(p, app, body) {
    const t = app.rt.tutorial;
    const x = body.x + 4;
    const w = body.w - 8;
    let y = body.y + 50;
    const title = (s: string) => { y = p.para(s, x, y, w, T.question, 33, 2); };
    const text = (s: string) => { y = p.para(s, x, y + 10, w, T.why, 23, 4); };

    if (t.step === 0) { title(TUTORIAL.hello.title); text(TUTORIAL.hello.body); }
    if (t.step === 1) {
      title(TUTORIAL.turn.title);
      const rowH = 54;
      const top = y + 14;
      TUTORIAL.practice.forEach((o, i) => {
        const ry = top + i * rowH;
        row(p, x, ry, w, rowH - 8, i === t.sel, (fg) => {
          p.text(o.title, x + 6, ry + 31, { ...T.row, size: 20, color: fg });
          p.text(`${o.minutes} min · ${o.difficulty}`, x + w - 4, ry + 30, { ...T.mono, color: fg, align: 'right' });
        });
      });
    }
    if (t.step === 2) { title(TUTORIAL.back.title(t.dish)); text(TUTORIAL.back.body); }
    if (t.step === 3) { title(TUTORIAL.talk.title); text(TUTORIAL.talk.body); text(TUTORIAL.talk.example); }
    if (t.step === 4) { title(TUTORIAL.home.title(t.heard)); text(TUTORIAL.home.body); }
    if (t.step === 5) { title(TUTORIAL.done.title); text(TUTORIAL.done.body); }

    // What to do now: one line at the bottom, marked with the red dot.
    const ay = body.y + body.h - 20;
    p.dot(x + 7, ay - 7, 6, 'red');
    p.text(ask(app), x + 22, ay, T.body);
  },

  rotate(app, dir) {
    const t = app.rt.tutorial;
    if (t.step !== 1) return;
    const n = TUTORIAL.practice.length;
    t.sel = (t.sel + dir + n) % n;
    t.turns++;
    // The selection moves as a partial repaint, the ask line changes with it.
    app.repaint();
  },

  press(app) {
    const t = app.rt.tutorial;
    if (t.step === 0) advance(app, 1);
    else if (t.step === 1) {
      if (t.turns === 0) { app.notice(TUTORIAL.wrong.turnFirst); return; }
      t.dish = TUTORIAL.practice[t.sel].title.toLowerCase();
      advance(app, 2);
    } else if (t.step === 3) app.notice(TUTORIAL.talk.holdLonger);
    else if (t.step === 5) app.endTutorial();
    else wrong(app);
  },

  /** The left pill. */
  intent(app, i) {
    if (i.kind !== 'back') return true;
    if (app.rt.tutorial.step === 2) advance(app, 3);
    else wrong(app);
    return true;
  },

  /** The right pill. */
  home(app) {
    const s = app.rt.tutorial.step;
    if (s === 4) advance(app, 5);
    else if (s === 5) app.endTutorial();
    else wrong(app);
    return true;
  },

  /** Every utterance stops here: the talk step takes it; "atrás" works on the back step; nothing reaches the brain. */
  hear(app, text) {
    const t = app.rt.tutorial;
    if (t.step === 3) {
      const heard = text.trim().replace(/[«»]/g, '');
      t.heard = heard.length > 48 ? `${heard.slice(0, 46).trimEnd()}…` : heard;
      advance(app, 4);
    } else if (t.step === 2 && parseIntent(text)?.kind === 'back') advance(app, 3);
    else app.notice(ask(app));
    return true;
  },
};
