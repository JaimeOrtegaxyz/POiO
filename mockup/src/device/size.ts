/**
 * The size line under the device and its ruler calibration. Fit-to-window
 * is the default and says it's uncalibrated. "Real size" draws the panel at
 * the candidate panel's real size once the viewer has matched an on-screen
 * bar to 5 cm on a real ruler. When the panel fills the shell's opening (the
 * profile it was modeled for) the body is to scale too, and the label says
 * so. Only a length: no card numbers, no forms.
 * The calibration is a per-viewer convenience kept in this browser.
 */
import { SIZE } from '../copy/es-MX';

export interface SizePref { mode: 'fit' | 'real'; pxPerMm?: number }

const KEY = 'poio.size.v1';
const BAR_MM = 50;
/** CSS's nominal 96 px per inch, the starting point of the ruler. */
export const NOMINAL_PX_PER_MM = 96 / 25.4;

export function loadSize(): SizePref {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as SizePref | null;
    if (s && (s.mode === 'fit' || s.mode === 'real')) {
      const ok = typeof s.pxPerMm === 'number' && s.pxPerMm >= 1 && s.pxPerMm <= 12;
      return ok ? s : { mode: 'fit' };
    }
  } catch { /* fall through */ }
  return { mode: 'fit' };
}

function saveSize(s: SizePref): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private window: fine for this visit */ }
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, parent: HTMLElement, text?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = cls;
  if (text) e.textContent = text;
  parent.appendChild(e);
  return e;
}

/**
 * Builds the size line into `host`. `apply` is called with the current
 * preference whenever it changes (and once now); `diagonal` gives the active
 * profile's panel diagonal for the label.
 */
export function sizeControls(host: HTMLElement, apply: (s: SizePref) => void, diagonal: () => number, fills: () => boolean): { refresh(): void } {
  let pref = loadSize();
  const line = el('div', 'size-line', host);
  const label = el('span', 'size-label', line);
  const toggle = el('button', 'link-button', line);
  toggle.type = 'button';
  const again = el('button', 'link-button', line, SIZE.recalibrate);
  again.type = 'button';

  const ruler = el('div', 'ruler', host);
  ruler.hidden = true;
  // Everything you touch sits above the bar; the bar comes last, at the
  // bottom edge, so a ruler held under it doesn't cover the slider.
  el('p', 'ruler-hint', ruler, SIZE.rulerHint);
  const note = el('p', 'ruler-note', ruler, SIZE.letterbox);
  const range = el('input', 'ruler-range', ruler);
  range.type = 'range';
  range.step = '0.01';
  range.setAttribute('aria-label', SIZE.rulerLabel);
  const buttons = el('div', 'ruler-buttons', ruler);
  const done = el('button', 'ruler-done', buttons, SIZE.done);
  done.type = 'button';
  const cancel = el('button', 'link-button', buttons, SIZE.cancel);
  cancel.type = 'button';
  const bar = el('div', 'ruler-bar', ruler);

  const draw = () => {
    const real = pref.mode === 'real' && !!pref.pxPerMm;
    const d = diagonal();
    label.textContent = real ? SIZE.real(Number.isInteger(d) ? String(d) : d.toFixed(1), fills()) : SIZE.fit;
    note.hidden = fills();
    toggle.textContent = real ? SIZE.toFit : SIZE.toReal;
    again.hidden = !real;
  };

  const openRuler = () => {
    const max = Math.max(3, Math.min(10, (window.innerWidth - 2 * 16) / BAR_MM));
    range.min = '2';
    range.max = max.toFixed(2);
    range.value = String(Math.min(pref.pxPerMm ?? NOMINAL_PX_PER_MM, max));
    bar.style.width = `${Number(range.value) * BAR_MM}px`;
    ruler.hidden = false;
    range.focus();
  };

  range.addEventListener('input', () => { bar.style.width = `${Number(range.value) * BAR_MM}px`; });
  toggle.addEventListener('click', () => {
    if (pref.mode === 'real') {
      pref = { ...pref, mode: 'fit' };
      saveSize(pref);
      draw();
      apply(pref);
    } else if (pref.pxPerMm) {
      pref = { ...pref, mode: 'real' };
      saveSize(pref);
      draw();
      apply(pref);
    } else {
      openRuler();
    }
  });
  again.addEventListener('click', openRuler);
  done.addEventListener('click', () => {
    pref = { mode: 'real', pxPerMm: Number(range.value) };
    saveSize(pref);
    ruler.hidden = true;
    draw();
    apply(pref);
  });
  cancel.addEventListener('click', () => { ruler.hidden = true; });

  draw();
  apply(pref);
  return { refresh: () => { draw(); apply(pref); } };
}
