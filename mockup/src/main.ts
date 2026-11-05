/**
 * Boot: build the device, wait for fonts, wire the star knob, the two
 * pills, the keyboard map and the typed fallback to the state machine. The page opens with the
 * device powered off; the Encender click also unlocks audio.
 */
import type { UsageSummary } from '../shared/types';
import { EventLog } from './ab/events';
import { assignVariant } from './ab/variant';
import { Api } from './api';
import { Sounds } from './audio/sounds';
import { DEVICE } from './copy/es-MX';
import { initDebug } from './debug';
import { buildDevice } from './device/dom';
import { App } from './flows/app';
import { bindKeys } from './input/keys';
import { Knob } from './input/knob';
import { PushToTalk, speechSupported } from './input/ptt';
import { Screen, loadFonts } from './screen/emulator';
import { PROFILES, type ProfileId } from './screen/profiles';
import { loadState } from './state/store';

async function boot(): Promise<void> {
  const dom = buildDevice(document.getElementById('app')!);
  const params = new URLSearchParams(location.search);
  const state = loadState();

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
  screen.blank();
  await loadFonts();

  const api = new Api();
  const sounds = new Sounds();
  sounds.muted = state.settings.muted;

  // A/B: random per device, ?variant=a|b overrides.
  const assigned = assignVariant(state.variant, location.search);
  state.variant = assigned.variant;
  const app = new App(state, screen, api, sounds);
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
  const knob = new Knob(dom.knob, dom.knobTurn, {
    onRotate: (d) => app.rotate(d),
    onPress: () => app.press(),
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
    back: () => app.back(),
    home: () => app.home(),
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
  dom.power.addEventListener('click', () => {
    sounds.unlock();
    if (app.on) app.turnOff(); else app.turnOn();
    powerLabel();
    dom.power.blur();
  });

  if (!speechSupported()) dom.notice.textContent = DEVICE.noSpeech;

  // The usage line under the device: updates after every brain call.
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
  api.onCall = () => void refreshUsage();
  void refreshUsage();

  if (params.get('debug') === '1') {
    debugUpdate = initDebug(dom.debug, app, {
      usage: () => usage,
      events: () => events.tail(),
      setVariant: (v) => { app.state.variant = v; app.save(); events.log('variant', { variant: v, source: 'debug' }); },
    });
    app.onRendered = () => debugUpdate?.();
  }

  (window as unknown as { __poio: App }).__poio = app;
}

void boot();
