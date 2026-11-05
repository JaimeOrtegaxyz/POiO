/**
 * The device's one state machine. Each screen is a module in this folder;
 * this file owns power, the runtime state, rendering (chrome + body +
 * bands), the voice pipeline (local intent parser first, then the brain),
 * the hidden scheduler (checkpoints, check-ins) and the brain context.
 */
import { parsePantryTemplate, type PantryStatus, type PantryTemplateItem } from '../../shared/pantry';
import type { Action, BrainContext, LimitReason, PantryChange, Recipe, SuggestOption } from '../../shared/types';
import pantryTemplateMd from '../../../pantry.example.md?raw';
import type { Api } from '../api';
import type { Sounds } from '../audio/sounds';
import { AFFORD, COOK, LIMIT_LINE, MARK, OFFLINE_LINE, REPLY, VOICE_STATE } from '../copy/es-MX';
import { parseIntent, type Intent } from '../input/intent';
import type { Screen } from '../screen/emulator';
import type { Painter } from '../screen/painter';
import { partialAllowed } from '../screen/profiles';
import type { RefreshKind } from '../screen/refresh';
import { newId, saveState, type DeviceState } from '../state/store';
import { SCREENS, type ScreenId } from './screens';

export interface Area { x: number; y: number; w: number; h: number }

export type BandKind = 'listening' | 'thinking' | 'notUnderstood' | 'notice' | 'answer';
export interface Band { kind: BandKind; text: string; until?: number }
export interface FiredCheckpoint { step: number; message: string }
export interface PendingCheckpoint { step: number; message: string; dueAt: number }

export interface Runtime {
  screen: ScreenId;
  onboardingQ: number;
  choose: { options: SuggestOption[] | null; sel: number; shown: string[]; from: ScreenId };
  recipe: { recipe: Recipe; option?: SuggestOption; from: ScreenId } | null;
  check: { handled: Set<string> };
  missing: { action: Action; sel: number } | null;
  cook: { step: number; peek: number | null; seen: Set<number>; pending: PendingCheckpoint[]; fired: FiredCheckpoint[]; animFrame: number };
  done: { phase: 'line' | 'taste' | 'diff'; enteredAt: number; tasteSel: number; diffSel: number; checked: boolean[]; animFrame: number };
  pantry: { sel: number; keys: string[] };
  notes: { sel: number };
  cookbook: { loading: boolean; checkinShown: string | null };
}

export interface Track { (type: string, data?: Record<string, string | number | boolean>): void }

const LAYOUT = { mast: 32, foot: 28, pad: 24 };

function freshRuntime(): Runtime {
  return {
    screen: 'off',
    onboardingQ: 0,
    choose: { options: null, sel: 0, shown: [], from: 'cookbook' },
    recipe: null,
    check: { handled: new Set() },
    missing: null,
    cook: { step: 0, peek: null, seen: new Set(), pending: [], fired: [], animFrame: 0 },
    done: { phase: 'line', enteredAt: 0, tasteSel: 10, diffSel: 0, checked: [], animFrame: 0 },
    pantry: { sel: 0, keys: [] },
    notes: { sel: 0 },
    cookbook: { loading: false, checkinShown: null },
  };
}

export class App {
  rt: Runtime = freshRuntime();
  on = false;
  turnOnAt = 0;
  band: Band | null = null;
  limited: LimitReason | null = null;
  readonly template: PantryTemplateItem[] = parsePantryTemplate(pantryTemplateMd);
  /** Bumped on every screen change, so late brain replies for an old screen are dropped. */
  private epoch = 0;
  /** Count of frames presented (tests and the debug panel read it). */
  renders = 0;
  private lastActivity = Date.now();
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  track: Track = () => {};
  onRendered: (() => void) | null = null;

  constructor(
    public state: DeviceState,
    readonly screen: Screen,
    readonly api: Api,
    readonly sounds: Sounds,
  ) {}

  // ---------------- clock, persistence ----------------

  now(): number { return Date.now() + this.state.settings.clockOffsetMs; }
  get speed(): number { return Math.max(1, this.state.settings.speed || 1); }
  get variant(): 'a' | 'b' { return this.state.variant ?? 'b'; }
  /** Variant a's frame animations only run where the panel can partial-refresh. */
  get canAnimate(): boolean { return this.variant === 'a' && partialAllowed(this.screen.profile, this.screen.timing); }
  save(): void { saveState(this.state); }

  // ---------------- power ----------------

  turnOn(): void {
    if (this.on) return;
    this.on = true;
    this.turnOnAt = this.now();
    this.lastActivity = Date.now();
    this.api.session = newId();
    this.rt = freshRuntime();
    this.band = null;
    this.limited = null;
    this.state.firstTurnOnAt ??= this.now();
    this.save();
    this.track('turn_on', { onboarded: this.state.onboarded });
    this.go(this.state.onboarded ? 'cookbook' : 'onboarding');
    this.sounds.play('chirp');
    this.tickTimer = setInterval(() => this.tick(), 500);
  }

  turnOff(): void {
    if (!this.on) return;
    this.track('turn_off');
    this.on = false;
    this.rt = freshRuntime();
    this.band = null;
    if (this.tickTimer) clearInterval(this.tickTimer);
    this.tickTimer = null;
    this.api.session = '';
    // E-paper keeps the last image with no power: nothing to repaint.
  }

  // ---------------- navigation and rendering ----------------

  go(id: ScreenId, opts: { keepBand?: boolean } = {}): void {
    this.epoch++;
    this.rt.screen = id;
    if (!opts.keepBand) this.band = null;
    SCREENS[id].enter?.(this);
    if (this.rt.screen === id) this.render('full');
  }

  /** Same screen, something changed: a partial repaint of the changed rectangle. */
  repaint(): void { this.render('partial'); }

  render(kind: RefreshKind): void {
    if (!this.on) return;
    const def = SCREENS[this.rt.screen];
    this.screen.render((p) => {
      const body: Area = { x: LAYOUT.pad, y: LAYOUT.mast + 1, w: p.W - 2 * LAYOUT.pad, h: p.H - LAYOUT.mast - LAYOUT.foot - 2 };
      this.drawChrome(p, def.context(this), def.meta?.(this) ?? '', this.bandsCover() ? AFFORD.cookBand : def.afford(this));
      def.draw(p, this, body);
      this.drawBands(p);
    }, kind);
    this.renders++;
    if (kind === 'full') this.state.lastFullRefreshDay = this.dayKey();
    this.onRendered?.();
  }

  private bandsCover(): boolean {
    return this.rt.screen === 'cook' && this.rt.cook.fired.length > 0;
  }

  private drawChrome(p: Painter, context: string, meta: string, afford: string): void {
    // Masthead: mark · context · meta (no clock).
    p.dot(21, 16.5, 4.5, 'red');
    const mw = p.text(MARK, 30, 22.5, { kind: 'q', size: 18, weight: 700 });
    if (context) {
      p.text('·', 30 + mw + 7, 22, { kind: 'm', size: 13 });
      let c = context;
      const maxW = 600 - (30 + mw + 20) - (meta ? p.measure(meta, { kind: 'm', size: 13, weight: 500 }) + 36 : 24);
      while (c.length > 4 && p.measure(c, { kind: 'q', size: 16, weight: 600 }) > maxW) c = `${c.slice(0, -2).trimEnd()}…`;
      p.text(c, 30 + mw + 20, 22, { kind: 'q', size: 16, weight: 600 });
    }
    if (meta) p.text(meta, 576, 22, { kind: 'm', size: 13, weight: 500, align: 'right' });
    p.hline(LAYOUT.mast);
    // Affordance band: static glyphs for what the controls do here.
    const fy = p.H - LAYOUT.foot - 1;
    p.hline(fy);
    let x = LAYOUT.pad;
    const base = p.H - 9.5;
    const opts = { kind: 'm' as const, size: 12, weight: 500, tracking: 0.05, caps: true };
    for (const tok of afford.split(/([●◎])/)) {
      if (tok === '●') { p.dot(x + 5, base - 4.5, 4.5, 'red'); x += 15; continue; }
      if (tok === '◎') { p.ring(x + 5, base - 4.5, 4.2, 'ink', 1.6); p.dot(x + 5, base - 4.5, 1.4, 'ink'); x += 15; continue; }
      const t = tok.trim();
      if (t) x += p.text(t, x, base, opts) + 8;
    }
  }

  private drawBands(p: Painter): void {
    const bottom = p.H - LAYOUT.foot - 1;
    let y = bottom;
    // Checkpoints stay until the next press; newest at the bottom.
    if (this.rt.screen === 'cook') {
      const opts = { kind: 'q' as const, size: 22, weight: 700, color: 'paper' as const };
      for (const f of [...this.rt.cook.fired].reverse().slice(0, 2)) {
        const text = f.step === this.rt.cook.step + 1 ? COOK.checkpointHere(f.message) : COOK.checkpointOther(f.step, f.message);
        const lines = Math.min(2, p.wrap(text, 552, opts).length);
        const h = 14 + lines * 27;
        y -= h;
        p.invert(0, y, 600, h);
        p.para(text, LAYOUT.pad, y + 28, 552, opts, 27, 2);
        y -= 1;
      }
    }
    if (!this.band) return;
    const b = this.band;
    const size = 20;
    const lines = p.wrap(b.text, b.kind === 'listening' ? 520 : 552, { kind: 'q', size, weight: 700 }).slice(0, 4);
    const h = 16 + lines.length * 25;
    y -= h;
    p.invert(0, y, 600, h);
    let tx = LAYOUT.pad;
    if (b.kind === 'listening') { p.dot(tx + 7, y + h / 2, 7, 'red'); tx += 24; }
    lines.forEach((l, i) => p.text(l, tx, y + 26 + i * 25, { kind: 'q', size, weight: 700, color: 'paper' }));
  }

  dayKey(t = this.now()): string {
    const d = new Date(t);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  // ---------------- bands ----------------

  setBand(kind: BandKind, text: string, ttlMs?: number): void {
    this.band = { kind, text, until: ttlMs ? Date.now() + ttlMs : undefined };
    this.repaint();
  }

  clearBand(): void {
    if (!this.band) return;
    this.band = null;
    this.repaint();
  }

  notice(text: string): void { this.setBand('notice', text, 8000); }

  notUnderstood(): void {
    this.sounds.play('notUnderstood');
    this.setBand('notUnderstood', VOICE_STATE.notUnderstood, 6000);
  }

  // ---------------- inputs ----------------

  private touch(): void {
    // A session ends at turn-off or after 12 h idle.
    if (Date.now() - this.lastActivity > 12 * 3600 * 1000) this.api.session = newId();
    this.lastActivity = Date.now();
  }

  rotate(dir: 1 | -1): void {
    if (!this.on) return;
    this.touch();
    if (this.band && this.band.kind !== 'answer') this.band = null;
    SCREENS[this.rt.screen].rotate?.(this, dir);
  }

  press(): void {
    if (!this.on) return;
    this.touch();
    const band = this.band;
    if (band?.kind === 'thinking') return; // waiting on the brain
    if (band) {
      this.band = null;
      // An answer is something to read: the press only clears it.
      if (band.kind === 'answer') { this.repaint(); return; }
    }
    const before = this.renders;
    SCREENS[this.rt.screen].press?.(this);
    if (band && this.renders === before) this.repaint();
  }

  pttStart(): void {
    if (!this.on) return;
    this.touch();
    this.sounds.play('press');
    this.setBand('listening', VOICE_STATE.listening);
  }

  /** Release of the red button, or Enter in the typed field. */
  async pttEnd(text: string, heldMs: number, typed: boolean): Promise<void> {
    if (!this.on) return;
    if (!typed) this.sounds.play('release');
    if ((!typed && heldMs < 300) || !text.trim()) { this.notUnderstood(); return; }
    await this.utterance(text.trim());
  }

  async utterance(text: string): Promise<void> {
    const def = SCREENS[this.rt.screen];
    const intent = parseIntent(text);
    if (intent && this.handleIntent(intent)) return;
    if (def.utterance && (await def.utterance(this, text))) return;
    await this.askBrain(text);
  }

  private handleIntent(i: Intent): boolean {
    const def = SCREENS[this.rt.screen];
    const before = this.band;
    this.band = null;
    if (def.intent?.(this, i)) { if (before && this.band === null) this.repaint(); return true; }
    if (i.kind === 'askAll') { this.notice(REPLY.soon); return true; }
    if (i.kind === 'nav' && ['cookbook', 'pantry', 'notes', 'choose', 'intro'].includes(this.rt.screen)) {
      if (i.to === 'choose') this.openChoose(this.rt.screen);
      else this.go(i.to);
      return true;
    }
    this.band = before;
    return false;
  }

  /** Send the utterance to the brain with this screen's context; dispatch the action. */
  async askBrain(text: string): Promise<void> {
    const epoch = this.epoch;
    const screenId = this.rt.screen;
    this.setBand('thinking', VOICE_STATE.thinking);
    const res = await this.api.utterance(this.context(), text);
    if (epoch !== this.epoch || this.rt.screen !== screenId || !this.on) return;
    this.band = null;
    if (!res) { this.notice(OFFLINE_LINE); return; }
    this.noteLimit(res.limited);
    this.dispatch(res.action);
    if (this.band === null) this.repaint();
  }

  noteLimit(l: LimitReason | undefined): void {
    if (l && l !== this.limited) { this.limited = l; this.band = { kind: 'notice', text: LIMIT_LINE, until: Date.now() + 8000 }; }
  }

  dispatch(a: Action): void {
    const def = SCREENS[this.rt.screen];
    if (def.action?.(this, a)) return;
    switch (a.action) {
      case 'pantry': {
        const changes = a.changes ?? [];
        this.applyPantry(changes);
        const one = changes.length === 1 ? changes[0] : null;
        if (one?.status === 'out') this.notice(REPLY.notedOut(one.display || this.displayOf(one.item)));
        else if (one?.status === 'low') this.notice(REPLY.notedLow(one.display || this.displayOf(one.item)));
        else this.notice(REPLY.noted);
        return;
      }
      case 'poionotas': {
        const removed = this.removeNotes(a.remove ?? []);
        this.addNotes(a.add ?? []);
        this.notice(removed && !(a.add ?? []).length ? REPLY.forgotten : REPLY.noted);
        return;
      }
      case 'answer':
        this.band = { kind: 'answer', text: a.text || '' };
        this.repaint();
        return;
      case 'recipe_request':
        if (a.title) { void this.openRecipe({ title: a.title }, this.rt.screen); return; }
        break;
      case 'tweak':
        this.openChoose(this.rt.screen, { tweak: a.tweak });
        return;
      case 'missing':
        // Outside the recipe screens, "no hay X" is pantry news.
        if (a.item) { this.dispatch({ action: 'pantry', changes: [{ item: a.item, status: 'out', display: a.display }] }); return; }
        break;
      default:
        break;
    }
    this.notUnderstood();
  }

  // ---------------- device state helpers ----------------

  displayOf(item: string): string {
    const fromRecipe = this.rt.recipe?.recipe.ingredients.find((i) => i.item === item)?.display;
    return fromRecipe || this.state.pantry[item]?.display || item.replace(/-/g, ' ');
  }

  applyPantry(changes: PantryChange[]): void {
    const t = this.now();
    for (const c of changes) {
      if (!c.item || !['plenty', 'low', 'out'].includes(c.status)) continue;
      const prev = this.state.pantry[c.item];
      this.state.pantry[c.item] = { status: c.status as PantryStatus, display: c.display || prev?.display, at: t };
    }
    this.save();
  }

  addNotes(add: string[]): void {
    const t = this.now();
    for (const a of add) {
      const text = a.trim();
      if (text && !this.state.poionotas.some((n) => n.text === text)) this.state.poionotas.push({ text, at: t });
    }
    this.save();
  }

  removeNotes(remove: string[]): boolean {
    const before = this.state.poionotas.length;
    const set = new Set(remove.map((r) => r.trim()));
    this.state.poionotas = this.state.poionotas.filter((n) => !set.has(n.text));
    this.save();
    return this.state.poionotas.length < before;
  }

  /** The dynamic prompt part: what the brain knows this call. */
  context(): BrainContext {
    const def = SCREENS[this.rt.screen];
    return {
      now: new Date(this.now()).toISOString(),
      city: this.state.prefs.city,
      servings: this.state.prefs.servings,
      poionotas: this.state.poionotas.map((n) => n.text),
      pantry: Object.entries(this.state.pantry).map(([item, e]) => ({ item, status: e.status, display: e.display })),
      recentDiscards: this.state.discards.slice(-5).flatMap((d) => d.titles),
      screen: {
        id: this.rt.screen === 'onboarding' ? `onboarding-${this.rt.onboardingQ + 1}` : this.rt.screen,
        contents: def.contents?.(this),
      },
    };
  }

  // ---------------- shared flows ----------------

  /** Three options: after onboarding, "¿qué hago de cenar?", a tweak or a discard. */
  async openChoose(from: ScreenId, opts: { tweak?: string; keepShown?: boolean } = {}): Promise<void> {
    const c = this.rt.choose;
    if (this.rt.screen !== 'choose') {
      c.from = from === 'choose' ? c.from : from;
      if (!opts.keepShown) c.shown = [];
      c.options = null;
      c.sel = 0;
      this.go('choose');
    }
    const epoch = this.epoch;
    this.setBand('thinking', VOICE_STATE.thinking);
    const res = await this.api.suggest(this.context(), { tweak: opts.tweak, exclude: c.shown });
    if (epoch !== this.epoch || !this.on) return;
    this.band = null;
    if (!res || !res.options.length) { this.notice(OFFLINE_LINE); return; }
    this.noteLimit(res.limited);
    c.options = res.options.slice(0, 3);
    c.sel = 0;
    c.shown.push(...c.options.map((o) => o.title));
    this.track('options_shown', { tweak: !!opts.tweak });
    this.repaint();
  }

  /** Load a recipe and open its intro. */
  async openRecipe(pick: { title: string; option?: SuggestOption }, from: ScreenId): Promise<void> {
    const epoch = this.epoch;
    this.setBand('thinking', VOICE_STATE.thinking);
    const res = await this.api.recipe(this.context(), pick.title);
    if (epoch !== this.epoch || !this.on) return;
    this.band = null;
    if (!res || !res.recipe) { this.notUnderstood(); return; }
    this.noteLimit(res.limited);
    this.rt.recipe = { recipe: res.recipe, option: pick.option, from };
    this.rt.check.handled = new Set();
    if (!this.state.firstRecipeAt) {
      this.state.firstRecipeAt = this.now();
      this.save();
      this.track('first_recipe', { ms: this.state.firstRecipeAt - (this.state.firstTurnOnAt ?? this.state.firstRecipeAt) });
    }
    this.track('recipe_open', { sample: !!res.fake });
    this.go('intro', { keepBand: !!this.band });
  }

  // ---------------- the hidden scheduler ----------------

  /** Twice a second: due checkpoints, check-ins, band expiry, the daily refresh. No drawing unless something changed. */
  tick(): void {
    if (!this.on) return;
    const t = this.now();
    let dirty = false;
    if (this.band?.until && Date.now() > this.band.until) { this.band = null; dirty = true; }

    const cook = this.rt.cook;
    if (cook.pending.length) {
      const due = cook.pending.filter((c) => c.dueAt <= t);
      if (due.length) {
        cook.pending = cook.pending.filter((c) => c.dueAt > t);
        for (const d of due) {
          cook.fired.push({ step: d.step, message: d.message });
          this.track('checkpoint_fired', { step: d.step, onStep: this.rt.screen === 'cook' && cook.step + 1 === d.step });
        }
        this.sounds.play('checkpoint');
        if (this.rt.screen === 'cook') {
          dirty = true;
          if (this.canAnimate) this.animate((f) => { cook.animFrame = f; });
        }
      }
    }
    SCREENS[this.rt.screen].tick?.(this, t) && (dirty = true);
    if (this.rt.screen === 'cookbook' && this.state.lastFullRefreshDay !== this.dayKey()) { this.render('full'); return; }
    if (dirty) this.repaint();
  }

  /** Variant a: at most 3 frame repaints (partial), then rest. */
  animate(set: (frame: number) => void): void {
    const frames = [1, 2, 0];
    frames.forEach((f, i) => setTimeout(() => { if (!this.on) return; set(f); this.repaint(); }, 650 * (i + 1)));
  }

  /** Is a check-in allowed on screen right now? Never in the first minutes after turn-on. */
  checkinVisible(): { dish: string } | null {
    const t = this.now();
    const quiet = this.state.settings.checkinQuietMs / this.speed;
    if (t - this.turnOnAt < quiet) return null;
    const c = this.state.checkins.find((x) => !x.done && x.dueAt <= t);
    return c ? { dish: c.dish } : null;
  }

  resolveCheckin(): void {
    const c = this.state.checkins.find((x) => !x.done && x.dueAt <= this.now());
    if (c) { c.done = true; this.save(); }
    this.rt.cookbook.checkinShown = null;
  }
}
