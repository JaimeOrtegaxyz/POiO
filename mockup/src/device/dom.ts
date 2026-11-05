/**
 * The DOM around the screen: POiO's face, not the whole chicken. A rounded
 * yellow panel holds the screen in a recessed frame and, under it, one row
 * of controls (after the Rhino render, hardware/POiO.3dm):
 *
 *   [ back pill ]   ( red star knob )   [ home pill ]
 *                         · LED by the knob
 *                       POiO
 *
 * The face keeps the render's proportions: compact and roughly square,
 * capped in width, with everything on it sized from the face width.
 * The star knob turns, presses and holds to talk (input/knob.ts). Below the
 * device, off the face: the power control, the typed fallback, the hint line
 * and the usage line. The screen itself is only the canvas.
 */
import wordmarkSvg from '../../../assets/logo-bw.svg?raw';
import { DEVICE } from '../copy/es-MX';

export interface DeviceDom {
  root: HTMLElement;
  bezel: HTMLElement;
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
  debug: HTMLElement;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent?: HTMLElement): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  parent?.appendChild(e);
  return e;
}

/**
 * A soft six-point star in a 100×100 box, one point up: a star polygon whose
 * corners (points and valleys) are rounded with quadratic curves.
 */
export function starPath(R = 48, r = 34, tip = 0.5, valley = 0.46): string {
  const n = 6;
  const v: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = (-90 + i * (180 / n)) * (Math.PI / 180);
    const rad = i % 2 === 0 ? R : r;
    v.push([50 + rad * Math.cos(a), 50 + rad * Math.sin(a)]);
  }
  const lerp = (a: [number, number], b: [number, number], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const f = (x: number) => x.toFixed(2);
  let d = '';
  v.forEach((p, i) => {
    const prev = v[(i + v.length - 1) % v.length];
    const next = v[(i + 1) % v.length];
    const t = i % 2 === 0 ? tip : valley;
    const a = lerp(p, prev, t), b = lerp(p, next, t);
    d += `${i === 0 ? 'M' : 'L'}${f(a[0])} ${f(a[1])}Q${f(p[0])} ${f(p[1])} ${f(b[0])} ${f(b[1])}`;
  });
  return `${d}Z`;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function starSvg(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('aria-hidden', 'true');
  // Radial shading centered on the knob, so it reads the same at any angle;
  // the off-center highlight is a separate layer that doesn't turn.
  svg.innerHTML = `
    <defs>
      <radialGradient id="poio-star-top" cx="50" cy="50" r="44" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#da4a43"/>
        <stop offset="0.7" stop-color="#cc3d38"/>
        <stop offset="1" stop-color="#b8322f"/>
      </radialGradient>
    </defs>
    <path class="star-side" d="${starPath()}"/>
    <path class="star-top" d="${starPath(45.5, 32.2)}" fill="url(#poio-star-top)"/>`;
  return svg;
}

export function buildDevice(mount: HTMLElement): DeviceDom {
  mount.innerHTML = '';
  const root = el('div', 'page', mount);
  const stage = el('div', 'stage', root);
  const device = el('div', 'device', stage);

  const bezel = el('div', 'bezel', device);
  const glass = el('div', 'glass', bezel);
  const canvas = el('canvas', 'screen', glass);
  canvas.setAttribute('aria-label', 'Pantalla de POiO');

  const row = el('div', 'control-row', device);
  const back = el('button', 'pill pill-back', row);
  back.type = 'button';
  back.title = DEVICE.backLabel;
  back.setAttribute('aria-label', DEVICE.backLabel);

  const knobWrap = el('div', 'knob-wrap', row);
  const knob = el('div', 'knob', knobWrap);
  knob.title = DEVICE.knobLabel;
  knob.setAttribute('role', 'button');
  knob.setAttribute('aria-label', DEVICE.knobLabel);
  const knobTurn = el('div', 'knob-turn', knob);
  knobTurn.appendChild(starSvg());
  el('span', 'knob-shine', knob);
  const led = el('span', 'led', knobWrap);

  const home = el('button', 'pill pill-home', row);
  home.type = 'button';
  home.title = DEVICE.homeLabel;
  home.setAttribute('aria-label', DEVICE.homeLabel);

  const mark = el('div', 'wordmark', device);
  mark.innerHTML = wordmarkSvg.replace(/fill="black"/g, 'fill="currentColor"');
  mark.setAttribute('aria-hidden', 'true');

  // Off the face: the power control leads the area under the device.
  const under = el('div', 'under', stage);
  const power = el('button', 'power', under);
  power.type = 'button';
  power.textContent = DEVICE.powerOn;
  const typedRow = el('div', 'typed-row', under);
  const typed = el('input', 'typed', typedRow);
  typed.type = 'text';
  typed.placeholder = DEVICE.typedPlaceholder;
  typed.autocomplete = 'off';
  typed.spellcheck = false;
  const hint = el('span', 'typed-hint', typedRow);
  hint.textContent = DEVICE.typedHint;
  const controls = el('div', 'controls-line', under);
  controls.textContent = DEVICE.controlsLine;
  const notice = el('div', 'notice', under);
  const usage = el('div', 'usage', under);
  const debug = el('aside', 'debug', root);
  debug.hidden = true;
  return { root, bezel, canvas, knob, knobTurn, led, back, home, power, typed, notice, usage, debug };
}
