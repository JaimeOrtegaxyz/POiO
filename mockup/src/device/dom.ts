/**
 * The DOM around the screen: yellow bezel, the canvas, the red push-to-talk
 * button with its LED, the encoder, the power control, the typed fallback
 * and the usage line. The screen itself is only the canvas.
 */
import { DEVICE } from '../copy/es-MX';

export interface DeviceDom {
  root: HTMLElement;
  bezel: HTMLElement;
  canvas: HTMLCanvasElement;
  ptt: HTMLButtonElement;
  led: HTMLElement;
  knob: HTMLElement;
  dial: HTMLElement;
  power: HTMLButtonElement;
  typed: HTMLInputElement;
  notice: HTMLElement;
  usage: HTMLElement;
  debug: HTMLElement;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent?: HTMLElement): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  parent?.appendChild(e);
  return e;
}

export function buildDevice(mount: HTMLElement): DeviceDom {
  mount.innerHTML = '';
  const root = el('div', 'page', mount);
  const stage = el('div', 'stage', root);
  const device = el('div', 'device', stage);
  const bezel = el('div', 'bezel', device);
  const canvas = el('canvas', 'screen', bezel);
  canvas.setAttribute('aria-label', 'Pantalla de POiO');

  const controls = el('div', 'controls', device);
  const pttWrap = el('div', 'ptt-wrap', controls);
  const led = el('span', 'led', pttWrap);
  const ptt = el('button', 'ptt', pttWrap);
  ptt.type = 'button';
  ptt.title = DEVICE.pttLabel;
  ptt.setAttribute('aria-label', DEVICE.pttLabel);

  const knob = el('div', 'knob', controls);
  knob.title = DEVICE.knobLabel;
  knob.setAttribute('role', 'slider');
  knob.setAttribute('aria-label', DEVICE.knobLabel);
  const dial = el('div', 'knob-dial', knob);
  el('span', 'knob-mark', dial);

  const power = el('button', 'power', device);
  power.type = 'button';
  power.textContent = DEVICE.powerOn;

  const under = el('div', 'under', stage);
  const typedRow = el('div', 'typed-row', under);
  const typed = el('input', 'typed', typedRow);
  typed.type = 'text';
  typed.placeholder = DEVICE.typedPlaceholder;
  typed.autocomplete = 'off';
  typed.spellcheck = false;
  const hint = el('span', 'typed-hint', typedRow);
  hint.textContent = DEVICE.typedHint;
  const notice = el('div', 'notice', under);
  const usage = el('div', 'usage', under);
  const debug = el('aside', 'debug', root);
  debug.hidden = true;
  return { root, bezel, canvas, ptt, led, knob, dial, power, typed, notice, usage, debug };
}
