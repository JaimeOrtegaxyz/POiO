/**
 * Boot: ask the server who this browser is, load the device state (from the
 * server for an invited profile, from this browser in local mode), build the
 * device, wait for fonts, wire the star knob, the two pills, the keyboard map
 * and the typed fallback to the state machine. The page opens with the
 * device powered off; the Encender click also unlocks audio. Without access
 * (no invite cookie, not this machine, no access code) the page shows the
 * invite gate instead and never calls the brain.
 */
import type { UsageSummary } from '../shared/types';
import { EventLog } from './ab/events';
import { assignVariant } from './ab/variant';
import { Api } from './api';
import { Sounds } from './audio/sounds';
import { DEVICE, GATE } from './copy/es-MX';
import { initDebug } from './debug';
import { buildDevice } from './device/dom';
import { App } from './flows/app';
import { bindKeys } from './input/keys';
import { Knob } from './input/knob';
import { PushToTalk, speechSupported } from './input/ptt';
import { Screen, loadFonts } from './screen/emulator';
import { drawSleep } from './flows/sleep';
import { PROFILES, type ProfileId } from './screen/profiles';
import { clearState, freshState, loadState, normalizeState, useProfileStore, type DeviceState } from './state/store';
import { StateSync } from './state/sync';

function showGate(mount: HTMLElement): void {
  mount.innerHTML = '';
  const page = document.createElement('div');
  page.className = 'page';
  const box = document.createElement('section');
  box.className = 'gate';
  const h = document.createElement('h1');
  h.textContent = GATE.heading;
  const p = document.createElement('p');
  p.textContent = GATE.body;
  const a = document.createElement('a');
  a.href = '/';
  a.textContent = GATE.home;
  box.append(h, p, a);
  page.append(box);
  mount.append(page);
}

async function boot(): Promise<void> {
  const mount = document.getElementById('app')!;
  const params = new URLSearchParams(location.search);
  const api = new Api();

  // Who is this? 'gate' = no access; null = server unreachable (local mode, as before).
  const me = await api.me();
  if (me === 'gate') { showGate(mount); return; }
  let state: DeviceState;
  let sync: StateSync | null = null;
  if (me?.mode === 'profile') {
    // Invited profile: the server holds the state; this browser keeps a cache.
    const s = new StateSync(api);
    sync = s;
    useProfileStore(me.tag ?? 'profile', (st) => s.schedule(st));
    const remote = await api.getState();
    state = remote ? (normalizeState(remote.state) ?? freshState()) : loadState();
  } else {
    state = loadState();
  }

  let screenRef: Screen | null = null;
  let appRef: App | null = null;
  const dom = buildDevice(mount, () => {
    const p = screenRef?.profile ?? PROFILES[state.settings.profile];
    return { w: p.width, h: p.height, diagonalIn: p.diagonalIn };
  }, {
    sendFeedback: (text) => api.feedback(text, appRef?.rt.screen ?? '', appRef?.variant ?? ''),
  });

  // Test and feel-test overrides from the URL.
  const speed = Number(params.get('speed'));
  if (speed >= 1) state.settings.speed = speed;
  const prof = params.get('profile') as ProfileId | null;
  if (prof && PROFILES[prof]) { state.settings.profile = prof; state.settings.scale = undefined; }
  const timing = params.get('timing');
  if (timing === 'fast' || timing === 'real') state.settings.timing = timing;
  const scale = Number(params.get('scale'));
  if ([1, 2, 3].includes(scale)) state.settings.scale = scale;
  const quiet = Number(params.get('checkinQuiet'));
  if (params.has('checkinQuiet') && quiet >= 0) state.settings.checkinQuietMs = quiet * 1000;

  const screen = new Screen(dom.canvas, state.settings.profile, state.settings.timing, state.settings.scale);
  screenRef = screen;
  dom.relayout();
  // The panel opens on what it held with the power off: the sleep image.
  screen.still(drawSleep);
  await loadFonts();

  const sounds = new Sounds();
  sounds.muted = state.settings.muted;

  // A/B: random per device, ?variant=a|b overrides.
  const assigned = assignVariant(state.variant, location.search);
  state.variant = assigned.variant;
  const app = new App(state, screen, api, sounds);
  appRef = app;
  app.save();
  const events = new EventLog(api, () => app.state.deviceId, () => app.variant);
  app.track = (type, data) => events.log(type, data);
  if (assigned.changed) events.log('variant', { variant: assigned.variant, source: assigned.source });

  const typing = () => {
    const a = document.activeElement;
    return a instanceof HTMLInputElement || a instanceof HTMLSelectElement || a instanceof HTMLTextAreaElement;
  };
  // The star knob: turn, press, hold to talk. One part, so push-to-talk
  // rides on the knob's hold.
  const ptt = new PushToTalk(dom.knob, dom.led, {
    canListen: () => app.on,
    onStart: () => app.pttStart(),
    onEnd: (r) => void app.pttEnd(r.text, r.heldMs, false),
    onUnsupported: () => { dom.notice.textContent = DEVICE.noSpeech; },
  });
  const knob = new Knob(dom.knob, dom.showKnob, {
    onRotate: (d) => app.rotate(d),
    // Off, pressing the star turns POiO on, like the power button.
    onPress: () => (app.on ? app.press() : powerOn()),
    onHoldStart: (since) => ptt.begin(since),
    onHoldEnd: () => ptt.end(),
  }, [dom.canvas]);

  // The pills either side: back and home (provisional functions).
  const pill = (b: HTMLButtonElement, act: () => void) => b.addEventListener('click', () => { act(); b.blur(); });
  pill(dom.back, () => app.back());
  pill(dom.home, () => app.home());

  bindKeys({
    rotate: (d) => knob.turn(d),
    press: () => knob.press(),
    talkStart: () => ptt.begin(),
    talkEnd: () => ptt.end(),
    back: () => { dom.flashPill('back'); app.back(); },
    home: () => { dom.flashPill('home'); app.home(); },
  }, typing);

  dom.typed.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = dom.typed.value;
      dom.typed.value = '';
      void app.pttEnd(text, 0, true);
    } else if (e.key === 'Escape') {
      // Leave the field only; the same Esc must not also press back.
      e.stopPropagation();
      dom.typed.blur();
    }
  });

  const powerLabel = () => {
    dom.power.textContent = app.on ? DEVICE.powerOff : DEVICE.powerOn;
    dom.power.classList.toggle('off-state', !app.on);
  };
  powerLabel();
  // The tutorial lives on the screen (flows/tutorial.ts); the page follows it:
  // an exit line instead of the links, and a ring on the control it asks for.
  app.onScreen = (id) => dom.setTutorialMode(id === 'tutorial');
  app.onHint = (c) => dom.setHint(c);
  dom.tutorialLink.addEventListener('click', () => {
    sounds.unlock();
    app.startTutorial();
    powerLabel();
    // Let Enter press the star next, not this link again.
    dom.tutorialLink.blur();
  });
  // No focus moves to a link afterwards: Enter has to press the star again, not reopen the tutorial.
  dom.tutorialExit.addEventListener('click', () => { app.endTutorial(); dom.tutorialExit.blur(); });

  const powerOn = () => {
    sounds.unlock();
    // An invited profile's very first turn-on starts with the tutorial (they've never held one).
    if (sync && !app.state.tutorialSeen && !app.state.onboarded) app.startTutorial();
    else app.turnOn();
    powerLabel();
  };
  dom.power.addEventListener('click', () => {
    if (app.on) { sounds.unlock(); app.turnOff(); powerLabel(); } else powerOn();
    dom.power.blur();
  });

  if (!speechSupported()) dom.notice.textContent = DEVICE.noSpeech;

  // The usage line under the device (local mode only: an invitee never sees
  // spend or tokens; their caps still apply on the server). Updates after
  // every brain call.
  let usage: UsageSummary | null = null;
  let debugUpdate: (() => void) | null = null;
  const refreshUsage = async () => {
    usage = await api.usage();
    if (usage) {
      const k = (n: number) => `${(n / 1000).toFixed(1)}k`;
      const capK = `${Math.round(usage.session.cap / 1000)}k`;
      const line = DEVICE.usageLine(k(usage.session.tokens), capK, usage.day.usd.toFixed(2), usage.month.usd.toFixed(2), String(usage.month.cap));
      dom.usage.textContent = usage.fake ? `${line} · ${DEVICE.demoMode}` : line;
    }
    debugUpdate?.();
  };
  if (!sync) {
    dom.usage.hidden = false;
    api.onCall = () => void refreshUsage();
    void refreshUsage();
  }

  // Reset: this profile only (server copy, then the cache), or this browser in local mode.
  const resetDevice = async () => {
    if (sync) {
      sync.cancel();
      await api.deleteState();
    }
    clearState();
    events.clear();
    location.reload();
  };
  if (sync) {
    dom.myDataLink.hidden = false;
    dom.reset.addEventListener('click', () => {
      if (confirm(DEVICE.resetConfirm)) void resetDevice();
    });
  }

  // The debug panel shows spend and resets: local mode only.
  if (params.get('debug') === '1' && !sync) {
    debugUpdate = initDebug(dom.debug, app, {
      usage: () => usage,
      events: () => events.tail(),
      setVariant: (v) => { app.state.variant = v; app.save(); events.log('variant', { variant: v, source: 'debug' }); },
      reset: resetDevice,
      who: me ? 'local mode' : 'server unreachable',
    });
    app.onRendered = () => debugUpdate?.();
  }

  (window as unknown as { __poio: App }).__poio = app;
}

void boot();
