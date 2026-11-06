/**
 * The DOM around the screen: the device face from the frontal render
 * (assets/render-frontal.png, cut by scripts/face/build-face.py). Layers,
 * back to front:
 *
 *   panel   the emulated e-paper panel, letterboxed in the screen hole
 *   face    the render, with a transparent screen hole and the star painted out
 *   parts   hit targets over the render: back pill, the star knob (its own
 *           image, so it can turn a detent), home pill; the listening LED
 *
 *   [ back pill ]   ( red star knob )   [ home pill ]
 *
 * The face never stretches: one scale for the whole render (device/layout.ts),
 * cropped around the screen and the controls when the window is small. The
 * star knob turns, presses and holds to talk (input/knob.ts). Below the
 * device, off the face and kept quiet: power and the typed fallback, then
 * small links: how to use it (the tutorial, on the screen: flows/tutorial.ts), size,
 * feedback, and for an invited profile their data (the reset); each but the
 * tutorial opens one panel. The spend line exists in local mode only. The screen itself is only
 * the canvas.
 */
import { DEVICE, FEEDBACK, MY_DATA, TUTORIAL } from '../copy/es-MX';
import { FACE, fitScale, layout, pct, realScale, type Rect } from './layout';
import { sizeControls, type SizePref } from './size';

export interface DeviceDom {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  /** The star knob (pointer target), and the part of it that turns. */
  knob: HTMLElement;
  knobTurn: HTMLElement;
  led: HTMLElement;
  back: HTMLButtonElement;
  home: HTMLButtonElement;
  power: HTMLButtonElement;
  typed: HTMLInputElement;
  notice: HTMLElement;
  usage: HTMLElement;
  /** "Cómo se usa": starts the tutorial on the screen (main.ts wires it). */
  tutorialLink: HTMLButtonElement;
  /** "Salir del tutorial", in the line that replaces the links while it runs. */
  tutorialExit: HTMLButtonElement;
  /** "Mis datos" (shown only for an invited profile) and its reset. */
  myDataLink: HTMLButtonElement;
  reset: HTMLButtonElement;
  debug: HTMLElement;
  /** Re-place the face (window resize, profile change). */
  relayout(): void;
  /** While the tutorial runs: its quiet exit line instead of the links and panels. */
  setTutorialMode(on: boolean): void;
  /** Ring the control the screen is asking for (null = none). */
  setHint(c: 'knob' | 'back' | 'home' | null): void;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent?: HTMLElement): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  parent?.appendChild(e);
  return e;
}

function place(e: HTMLElement, r: Rect): void {
  Object.assign(e.style, pct(r));
}

const srcset = (name: string, renderW: number) =>
  FACE.widths.map((w) => `/face/${name}-${w}.webp ${Math.round((renderW * w) / FACE.width)}w`).join(', ');

/** The feedback panel: a text box and a send button; says thanks, or that it didn't go. */
function feedbackForm(host: HTMLElement, send: (text: string) => Promise<boolean>): void {
  const form = el('form', 'feedback', host);
  const box = el('textarea', 'feedback-text', form);
  box.rows = 3;
  box.maxLength = 1000;
  box.placeholder = FEEDBACK.placeholder;
  box.setAttribute('aria-label', FEEDBACK.label);
  el('p', 'feedback-why', form).textContent = FEEDBACK.why;
  const row = el('div', 'feedback-row', form);
  const button = el('button', 'feedback-send', row);
  button.type = 'submit';
  button.textContent = FEEDBACK.send;
  const status = el('span', 'feedback-status', row);
  status.setAttribute('aria-live', 'polite');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = box.value.trim();
    if (!text) { box.focus(); return; }
    button.disabled = true;
    const ok = await send(text);
    button.disabled = false;
    status.textContent = ok ? FEEDBACK.sent : FEEDBACK.failed;
    if (ok) box.value = '';
  });
  // Keep Esc in the box from pressing the device's back pill.
  box.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); box.blur(); } });
}

export interface DeviceHooks {
  sendFeedback(text: string): Promise<boolean>;
}

export function buildDevice(mount: HTMLElement, panelSize: () => { w: number; h: number; diagonalIn: number }, hooks: DeviceHooks): DeviceDom {
  mount.innerHTML = '';
  const root = el('div', 'page', mount);
  const stage = el('div', 'stage', root);
  const frame = el('div', 'frame', stage);
  const device = el('div', 'device', frame);

  const panel = el('div', 'panel', device);
  place(panel, FACE.hole);
  const canvas = el('canvas', 'screen', panel);
  canvas.setAttribute('aria-label', 'Pantalla de POiO');

  const face = el('img', 'face', device);
  face.alt = '';
  face.decoding = 'async';
  face.draggable = false;
  face.srcset = srcset('face', FACE.width);
  face.src = `/face/face-${FACE.widths[0]}.webp`;

  const back = el('button', 'pill pill-back', device);
  back.type = 'button';
  back.title = DEVICE.backLabel;
  back.setAttribute('aria-label', DEVICE.backLabel);
  place(back, FACE.pills.back);

  const knob = el('div', 'knob', device);
  knob.title = DEVICE.knobLabel;
  knob.setAttribute('role', 'button');
  knob.setAttribute('aria-label', DEVICE.knobLabel);
  place(knob, FACE.star);
  const knobTurn = el('div', 'knob-turn', knob);
  knobTurn.style.transformOrigin = `${((FACE.star.cx / FACE.star.w) * 100).toFixed(3)}% ${((FACE.star.cy / FACE.star.h) * 100).toFixed(3)}%`;
  const star = el('img', 'star', knobTurn);
  star.alt = '';
  star.draggable = false;
  star.srcset = srcset('star', FACE.star.w);
  star.src = `/face/star-${FACE.widths[0]}.webp`;

  const led = el('span', 'led', device);
  place(led, FACE.led);

  const home = el('button', 'pill pill-home', device);
  home.type = 'button';
  home.title = DEVICE.homeLabel;
  home.setAttribute('aria-label', DEVICE.homeLabel);
  place(home, FACE.pills.home);

  // Off the face, kept quiet: power and the typed field are always there;
  // help, size and feedback wait behind three small links, one panel open
  // at a time. Notices appear only when there's something to say.
  const under = el('div', 'under', stage);
  const power = el('button', 'power', under);
  power.type = 'button';
  power.textContent = DEVICE.powerOn;
  const typed = el('input', 'typed', under);
  typed.type = 'text';
  typed.placeholder = DEVICE.typedPlaceholder;
  typed.autocomplete = 'off';
  typed.spellcheck = false;
  typed.setAttribute('aria-label', DEVICE.typedPlaceholder);
  const notice = el('div', 'notice', under);
  notice.setAttribute('aria-live', 'polite');

  const tutorialBar = el('div', 'tutorial-bar', under);
  tutorialBar.hidden = true;
  el('span', 'tutorial-tag', tutorialBar).textContent = TUTORIAL.running;
  const tutorialExit = el('button', 'link-button', tutorialBar);
  tutorialExit.type = 'button';
  tutorialExit.textContent = TUTORIAL.exit;

  const links = el('nav', 'under-links', under);
  const panels = el('div', 'under-panels', under);
  const tabs: { button: HTMLButtonElement; panel: HTMLElement }[] = [];
  const tutorialLink = el('button', 'link-button', links);
  tutorialLink.type = 'button';
  tutorialLink.textContent = DEVICE.helpLink;
  const section = (label: string, id: string): HTMLElement => {
    const button = el('button', 'link-button', links);
    button.type = 'button';
    button.textContent = label;
    const panel = el('section', 'under-panel', panels);
    panel.id = `panel-${id}`;
    panel.hidden = true;
    button.setAttribute('aria-controls', panel.id);
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      const opening = panel.hidden;
      for (const t of tabs) { t.panel.hidden = true; t.button.setAttribute('aria-expanded', 'false'); }
      panel.hidden = !opening;
      button.setAttribute('aria-expanded', String(opening));
      button.blur();
    });
    tabs.push({ button, panel });
    return panel;
  };

  const sizeHost = section(DEVICE.sizeLink, 'size');
  sizeHost.classList.add('size');

  feedbackForm(section(DEVICE.feedbackLink, 'feedback'), hooks.sendFeedback);

  const myData = section(MY_DATA.link, 'data');
  const myDataLink = tabs[tabs.length - 1].button;
  myDataLink.hidden = true;
  el('p', 'controls-line', myData).textContent = MY_DATA.body;
  const reset = el('button', 'link-button reset', myData);
  reset.type = 'button';
  reset.textContent = DEVICE.resetProfile;

  // Spend line: local mode only (main.ts shows it); an invitee never sees costs.
  const usage = el('div', 'usage', under);
  usage.hidden = true;
  const debug = el('aside', 'debug', root);
  debug.hidden = true;

  let pref: SizePref = { mode: 'fit' };
  const relayout = () => {
    const p = panelSize();
    const vp = { w: document.documentElement.clientWidth, h: window.innerHeight };
    const s = pref.mode === 'real' && pref.pxPerMm ? realScale(pref.pxPerMm, p.diagonalIn, p.w, p.h) : fitScale(vp);
    const l = layout(vp, s);
    frame.style.width = `${l.frameW}px`;
    frame.style.height = `${l.frameH}px`;
    device.style.width = `${l.devW}px`;
    device.style.height = `${l.devH}px`;
    device.style.left = `${-l.offX}px`;
    device.style.top = `${-l.offY}px`;
    face.sizes = `${Math.ceil(l.devW)}px`;
    star.sizes = `${Math.ceil(FACE.star.w * s)}px`;
  };
  const size = sizeControls(sizeHost, (s) => { pref = s; relayout(); }, () => panelSize().diagonalIn);
  window.addEventListener('resize', relayout);
  // A profile change resizes the canvas: the real-size scale depends on it.
  new MutationObserver(() => size.refresh()).observe(canvas, { attributes: true, attributeFilter: ['width', 'height'] });
  relayout();

  const setTutorialMode = (on: boolean) => {
    tutorialBar.hidden = !on;
    links.hidden = on;
    panels.hidden = on;
    if (on) for (const t of tabs) { t.panel.hidden = true; t.button.setAttribute('aria-expanded', 'false'); }
  };
  const setHint = (c: 'knob' | 'back' | 'home' | null) => {
    knob.classList.toggle('hint', c === 'knob');
    back.classList.toggle('hint', c === 'back');
    home.classList.toggle('hint', c === 'home');
  };

  return { root, canvas, knob, knobTurn, led, back, home, power, typed, notice, usage, tutorialLink, tutorialExit, myDataLink, reset, debug, relayout, setTutorialMode, setHint };
}
