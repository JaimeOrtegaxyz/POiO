/**
 * The sleep image: what the panel holds with the power off. E-paper keeps
 * its last image without power, so turning off paints this once (a full
 * refresh) and the page opens on it. The hen's silhouette in ink on paper,
 * centered, nothing else: the same hen as the first-round wait.
 */
import { chickenAspect } from '../screen/chicken';
import type { Painter } from '../screen/painter';

export function drawSleep(p: Painter): void {
  p.clear('paper');
  const h = Math.round(p.H * 0.5);
  const w = h * chickenAspect('alone');
  p.chicken('alone', (p.W - w) / 2, (p.H - h) / 2, h, 'ink');
}
