/**
 * Boot: build the device, wait for fonts, wire the red button, the typed
 * fallback and the encoder to the state machine. The page opens with the
 * device powered off; the Encender click also unlocks audio.
 */
import type { UsageSummary } from '../shared/types';
import { Api } from './api';
import { Sounds } from './audio/sounds';
import { DEVICE } from './copy/es-MX';
import { initDebug } from './debug';
import { buildDevice } from './device/dom';
import { App } from './flows/app';
import { Encoder } from './input/encoder';
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
  const app = new App(state, screen, api, sounds);
  app.save();

  const typing = () => {
    const a = document.activeElement;
    return a instanceof HTMLInputElement || a instanceof HTMLSelectElement || a instanceof HTMLTextAreaElement;
  };
  new PushToTalk(dom.ptt, dom.led, {
    canListen: () => app.on,
    onStart: () => app.pttStart(),
    onEnd: (r) => void app.pttEnd(r.text, r.heldMs, false),
    onUnsupported: () => { dom.notice.textContent = DEVICE.noSpeech; },
  }, typing);
  new Encoder(dom.knob, dom.dial, { onRotate: (d) => app.rotate(d), onPress: () => app.press() }, typing, [dom.canvas]);

  dom.typed.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const text = dom.typed.value;
      dom.typed.value = '';
      void app.pttEnd(text, 0, true);
    } else if (e.key === 'Escape') {
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
      events: () => [],
      setVariant: (v) => { app.state.variant = v; app.save(); },
    });
    app.onRendered = () => debugUpdate?.();
  }

  (window as unknown as { __poio: App }).__poio = app;
}

void boot();
