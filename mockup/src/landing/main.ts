/**
 * The public landing (/): a red hero with the Vaivén ring of wordmarks
 * (preset "poio-hero" in public/vaiven.presets.json; tune it with `npx
 * vaiven`; press it and it runs), what POiO does, the device, and the way
 * into the demo. Static: the only request is /api/me, to pick the call to
 * action. Nothing here can reach the brain.
 *
 * Marks and icons are inlined as SVG so they take the text color: the
 * wordmark and the hen from assets/, the icons from Phosphor (bold).
 */
import '@jaimeortega/vaiven/element';
import arrowDown from '@phosphor-icons/core/assets/bold/arrow-down-bold.svg?raw';
import basket from '@phosphor-icons/core/assets/bold/basket-bold.svg?raw';
import bowlSteam from '@phosphor-icons/core/assets/bold/bowl-steam-bold.svg?raw';
import cookingPot from '@phosphor-icons/core/assets/bold/cooking-pot-bold.svg?raw';
import microphone from '@phosphor-icons/core/assets/bold/microphone-bold.svg?raw';
import henSvg from '../../../assets/chicken-color.svg?raw';
import wordmarkSvg from '../../../assets/logo-bw.svg?raw';
import { GATE } from '../copy/es-MX';

const decorative = (svg: string) => svg.replace('<svg ', '<svg aria-hidden="true" focusable="false" ');

const mark = document.querySelector<HTMLElement>('.mark');
if (mark) mark.insertAdjacentHTML('beforeend', decorative(wordmarkSvg.replace(/fill="black"/g, 'fill="currentColor"')));

const hen = document.querySelector<HTMLElement>('.hen');
if (hen) hen.insertAdjacentHTML('beforeend', decorative(henSvg));

const ICONS: Record<string, string> = { 'arrow-down': arrowDown, basket, 'bowl-steam': bowlSteam, 'cooking-pot': cookingPot, microphone };
for (const el of document.querySelectorAll<HTMLElement>('[data-icon]')) {
  const svg = ICONS[el.dataset.icon ?? ''];
  if (svg) el.insertAdjacentHTML('beforeend', decorative(svg));
}

const buttons = document.querySelectorAll<HTMLAnchorElement>('.cta-button');
const invite = document.querySelector<HTMLElement>('.cta-invite');

async function cta(): Promise<void> {
  try {
    const r = await fetch('/api/me', { headers: { accept: 'application/json' } });
    if (!r.ok) return; // 403: no invite yet, the invite line stays
    for (const b of buttons) { b.textContent = GATE.open; b.hidden = false; }
    if (invite) invite.hidden = true;
  } catch { /* offline: the invite line stays */ }
}

void cta();
