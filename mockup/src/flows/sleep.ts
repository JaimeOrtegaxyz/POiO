/**
 * The sleep image: what the panel holds with the power off. E-paper keeps
 * its last image without power, so turning off paints this once (a full
 * refresh) and the page opens on it. The color hen, centered, nothing else.
 */
import { chickenAspect } from '../screen/chicken';
import type { Painter } from '../screen/painter';

export function drawSleep(p: Painter): void {
  const h = Math.round(p.H * 0.62);
  const w = h * chickenAspect('color');
  p.chicken('color', (p.W - w) / 2, (p.H - h) / 2, h);
}
