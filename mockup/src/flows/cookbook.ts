/**
 * The resting screen: a cookbook left open. "Hoy:" + one seasonal dish, a
 * short reason, an image in variant a. At most two suggestions a day, one
 * per slot (before/after 14:00), generated on first entry to the slot and
 * cached by date + slot. A check-in ("¿Qué tal la tinga?") shows as a second
 * line only during a running session, never on the first paint after turn-on.
 */
import { AFFORD, COOKBOOK, CONTEXT, REPLY } from '../copy/es-MX';
import { ensureFood } from '../screen/images';
import type { App } from './app';
import { T, foodOrGlyph } from './draw';
import type { ScreenDef } from './screens';

const SLOT_SPLIT_HOUR = 14;

export function slotKey(app: App): string {
  const d = new Date(app.now());
  return `${app.dayKey()}:${d.getHours() < SLOT_SPLIT_HOUR ? 'am' : 'pm'}`;
}

/** Recipe id for an image lookup: the fixture slug of the title. */
function imageId(title: string): string {
  const known: Record<string, string> = {
    'Tinga de pollo': 'tinga-de-pollo',
    'Pollo a la crema con rajas': 'pollo-a-la-crema-con-rajas',
    'Muslos glaseados con gochujang': 'gochujang-glazed-thighs',
  };
  return known[title] ?? title.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

async function load(app: App, tweak?: string): Promise<void> {
  const key = slotKey(app);
  if (!tweak && app.state.cookbook?.key === key) return;
  app.rt.cookbook.loading = true;
  const res = await app.api.suggest(app.context(), { slot: 'cookbook', tweak });
  app.rt.cookbook.loading = false;
  if (!res?.options.length || !app.on) return;
  app.noteLimit(res.limited);
  app.state.cookbook = { key, option: res.options[0], reason: res.reason };
  app.save();
  if (app.variant === 'a') await ensureFood(imageId(res.options[0].title));
  if (app.rt.screen === 'cookbook') app.repaint();
}

export const cookbook: ScreenDef = {
  context: () => CONTEXT.cookbook,
  afford: (app) => (app.state.cookbook ? AFFORD.cookbook : AFFORD.cookbookEmpty),

  enter(app) {
    app.rt.cookbook.checkinShown = null;
    if (app.state.cookbook && app.variant === 'a') {
      void ensureFood(imageId(app.state.cookbook.option.title)).then((ok) => { if (ok && app.rt.screen === 'cookbook') app.repaint(); });
    }
    void load(app);
    // Decide the check-in line now, so it never appears on the first paint after turn-on.
    const c = app.checkinVisible();
    if (c) { app.rt.cookbook.checkinShown = c.dish; app.track('checkin_shown'); }
  },

  draw(p, app, body) {
    const cb = app.state.cookbook;
    const checkin = app.rt.cookbook.checkinShown;
    if (cb) {
      const withImage = app.variant === 'a';
      const imgBox = { x: body.x + body.w - 236, y: body.y + 22, w: 236, h: body.h - 44 };
      const textW = withImage ? body.w - 236 - 26 : body.w - 30;
      if (withImage) foodOrGlyph(p, imageId(cb.option.title), imgBox, 'bowl');
      let y = body.y + 50;
      p.text(COOKBOOK.today, body.x + 4, y, T.kicker);
      y += 38;
      y = p.para(cb.option.title, body.x + 4, y, textW, T.title, 35, 3);
      if (cb.reason) y = p.para(cb.reason, body.x + 4, y + 6, textW, T.why, 23, 2);
      p.text(COOKBOOK.meta(cb.option.minutes, cb.option.difficulty), body.x + 4, y + 22, T.mono);
    }
    if (checkin) {
      const y = body.y + body.h - 22;
      p.hline(y - 30, body.x, cb && app.variant === 'a' ? body.x + body.w - 262 : body.x + body.w);
      p.text(COOKBOOK.checkin(checkin), body.x + 4, y, { ...T.body });
    }
  },

  tick(app) {
    // A check-in becoming due while you're here: repaint once, as a second line.
    if (app.rt.cookbook.checkinShown) return false;
    const c = app.checkinVisible();
    if (!c) return false;
    app.rt.cookbook.checkinShown = c.dish;
    app.track('checkin_shown');
    return true;
  },

  rotate(app, dir) { app.go(dir > 0 ? 'pantry' : 'notes'); },

  press(app) {
    const cb = app.state.cookbook;
    if (cb) void app.openRecipe({ title: cb.option.title, option: cb.option }, 'cookbook');
  },

  action(app, a) {
    if (a.action === 'tweak') {
      app.track('tweak', { cookbook: true });
      void load(app, a.tweak);
      app.notice(REPLY.noted);
      return true;
    }
    if (a.action === 'poionotas' && app.rt.cookbook.checkinShown) {
      app.addNotes(a.add ?? []);
      app.removeNotes(a.remove ?? []);
      app.resolveCheckin();
      app.track('checkin_answered');
      app.notice(REPLY.noted);
      return true;
    }
    if (a.action === 'pick' && app.state.cookbook) { void app.openRecipe({ title: app.state.cookbook.option.title, option: app.state.cookbook.option }, 'cookbook'); return true; }
    return false;
  },

  contents: (app) => ({
    today: app.state.cookbook?.option.title,
    ...(app.rt.cookbook.checkinShown ? { checkin: app.rt.cookbook.checkinShown } : {}),
  }),
};
