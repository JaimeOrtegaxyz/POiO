import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOCKUP_DIR } from '../server/config';
import { FACE, fitScale, focusRect, layout, panelInHole, panelWidthMm, realScale } from '../src/device/layout';
import { PROFILES } from '../src/screen/profiles';

describe('device face from the frontal render', () => {
  it('ships every layer the geometry points at', () => {
    for (const w of FACE.widths) {
      expect(existsSync(join(MOCKUP_DIR, 'public/face', `face-${w}.webp`))).toBe(true);
      expect(existsSync(join(MOCKUP_DIR, 'public/face', `star-${w}.webp`))).toBe(true);
    }
    expect(FACE.source).toBe('assets/render-frontal.png');
  });

  it('the render\'s screen hole is about 4:3, not the panel\'s 3:2', () => {
    expect(FACE.hole.w / FACE.hole.h).toBeGreaterThan(1.28);
    expect(FACE.hole.w / FACE.hole.h).toBeLessThan(1.38);
  });

  it('letterboxes the panel in the hole, never stretches it', () => {
    const s = PROFILES['spectra6-4in'];
    const r = panelInHole(FACE.hole, s.width, s.height);
    expect(r.w / r.h).toBeCloseTo(1.5, 6);
    expect(r.w).toBeCloseTo(FACE.hole.w, 6); // full width, bands above and below
    expect(r.y).toBeGreaterThan(0);
    const k = PROFILES['kaleido3-6in'];
    expect(panelInHole(FACE.hole, k.width, k.height).w / panelInHole(FACE.hole, k.width, k.height).h).toBeCloseTo(k.width / k.height, 6);
  });

  it('fit: the whole chicken on a big window, a crop around screen and controls on a phone', () => {
    const big = layout({ w: 2560, h: 1600 }, fitScale({ w: 2560, h: 1600 }));
    expect(big.frameW).toBeCloseTo(big.devW, 6);
    expect(big.frameH).toBeCloseTo(big.devH, 6);
    const phone = { w: 390, h: 844 };
    const p = layout(phone, fitScale(phone));
    expect(p.frameW).toBeLessThanOrEqual(390 - 32);
    expect(FACE.hole.w * p.scale).toBeGreaterThanOrEqual(300); // readable
    // The focus (hole + controls) is fully inside the visible window.
    const f = focusRect();
    expect(f.x * p.scale - p.offX).toBeGreaterThanOrEqual(-0.5);
    expect((f.x + f.w) * p.scale - p.offX).toBeLessThanOrEqual(p.frameW + 0.5);
    expect(f.y * p.scale - p.offY).toBeGreaterThanOrEqual(-0.5);
    expect((f.y + f.h) * p.scale - p.offY).toBeLessThanOrEqual(p.frameH + 0.5);
  });

  it('real size: the 4" Spectra panel is 84.5 mm wide at any calibration', () => {
    expect(panelWidthMm(4, 600, 400)).toBeCloseTo(84.53, 1);
    for (const pxPerMm of [3.2, 3.78, 5.5]) {
      const s = realScale(pxPerMm, 4, 600, 400);
      expect(panelInHole(FACE.hole, 600, 400).w * s).toBeCloseTo(84.53 * pxPerMm, 0);
    }
  });
});
