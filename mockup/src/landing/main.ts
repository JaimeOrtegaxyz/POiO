/**
 * The public landing (/): the Vaivén hero (the POiO wordmark as a looping
 * figure, preset "poio-hero" in public/vaiven.presets.json; tune it with
 * `npx vaiven`), the static wordmark, a few lines of copy and the way into
 * the demo. Static: the only request is /api/me, to pick the call to action.
 * Nothing here can reach the brain.
 */
import '@jaimeortega/vaiven/element';
import wordmarkSvg from '../../../assets/logo-bw.svg?raw';
import { GATE } from '../copy/es-MX';

const mark = document.querySelector<HTMLElement>('.mark');
if (mark) mark.insertAdjacentHTML('beforeend', wordmarkSvg.replace(/fill="black"/g, 'fill="currentColor"').replace('<svg ', '<svg aria-hidden="true" focusable="false" '));

const button = document.querySelector<HTMLAnchorElement>('.cta-button');
const invite = document.querySelector<HTMLElement>('.cta-invite');

async function cta(): Promise<void> {
  try {
    const r = await fetch('/api/me', { headers: { accept: 'application/json' } });
    if (!r.ok) return; // 403: no invite yet, the invite line stays
    if (button) { button.textContent = GATE.open; button.hidden = false; }
    if (invite) invite.hidden = true;
  } catch { /* offline: the invite line stays */ }
}

void cta();
