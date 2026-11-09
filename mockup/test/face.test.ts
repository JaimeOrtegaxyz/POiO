import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOCKUP_DIR } from '../server/config';
import { FACE, fitScale, focusRect, layout, panelInHole, panelWidthMm, realScale } from '../src/device/layout';
import { DEFAULT_PROFILE, PROFILES } from '../src/screen/profiles';
import { normalizeState, freshState } from '../src/state/store';

describe('device face from the frontal renders', () => {
  it('ships every layer the geometry points at', () => {
    const names = ['face'];
    for (const p of ['back', 'home']) names.push(`pill-${p}-up`, `pill-${p}-down`);
    for (let i = 0; i < FACE.knob.frames; i++) names.push(`knob-${i}`, `knob-shadow-${i}`);
    for (const w of FACE.widths) {
      for (const n of names) expect(existsSync(join(MOCKUP_DIR, 'public/face', `${n}-${w}.webp`)), `${n}-${w}`).toBe(true);
    }
    expect(FACE.source).toBe('assets/render/');
  });

  it('the knob: four frames 15° apart cover the six-pointed star\'s 60° symmetry', () => {
    expect(FACE.knob.frames * FACE.knob.stepDeg).toBe(60);
  });

  it('pills: the hit target sits inside its render layer; the knob sits between the pills', () => {
    for (const p of [FACE.pills.back, FACE.pills.home]) {
      expect(p.x).toBeGreaterThanOrEqual(p.layer.x);
      expect(p.y).toBeGreaterThanOrEqual(p.layer.y);
      expect(p.x + p.w).toBeLessThanOrEqual(p.layer.x + p.layer.w);
      expect(p.y + p.h).toBeLessThanOrEqual(p.layer.y + p.layer.h);
    }
    expect(FACE.pills.back.x + FACE.pills.back.w).toBeLessThan(FACE.knob.x + FACE.knob.w / 2);
    expect(FACE.pills.home.x).toBeGreaterThan(FACE.knob.x + FACE.knob.w / 2);
  });

  it('the screen opening was modeled for the Kaleido 3 6" panel: the default fills it', () => {
    expect(DEFAULT_PROFILE).toBe('kaleido3-6in');
    const k = PROFILES[DEFAULT_PROFILE];
    const r = panelInHole(FACE.hole, k.width, k.height);
    expect(r.w * r.h).toBeGreaterThan(0.98 * FACE.hole.w * FACE.hole.h);
  });

  it('a saved state carries the default it was saved with; only a deliberate pick survives', () => {
    const old = { ...freshState(), settings: { ...freshState().settings, profile: 'spectra6-4in' as const } };
    expect(normalizeState(old)!.settings.profile).toBe(DEFAULT_PROFILE);
    const picked = { ...old, settings: { ...old.settings, profilePicked: true } };
    expect(normalizeState(picked)!.settings.profile).toBe('spectra6-4in');
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

  it('fit: a window too short for a readable screen grows the face to the width, uncut, and the page scrolls', () => {
    for (const vp of [{ w: 757, h: 950 }, { w: 1400, h: 700 }, { w: 1100, h: 820 }]) {
      const l = layout(vp, fitScale(vp));
      expect(l.frameW, `${vp.w}×${vp.h}`).toBeCloseTo(l.devW, 6);
      expect(l.frameH, `${vp.w}×${vp.h}`).toBeCloseTo(l.devH, 6);
      expect(FACE.hole.w * l.scale).toBeGreaterThanOrEqual(340);
    }
  });

  it('real size larger than the window: never cut vertically on a desktop, only as wide as the window', () => {
    for (const pxPerMm of [3.8, 5, 6.5]) {
      const vp = { w: 1100, h: 800 };
      const l = layout(vp, realScale(pxPerMm, 6, 1448, 1072));
      expect(l.frameH).toBeCloseTo(l.devH, 6);
      expect(l.frameW).toBeLessThanOrEqual(vp.w - 32 + 1e-6);
    }
  });

  it('real size: the 6" Kaleido panel is about 122.5 mm wide, the 4" Spectra 84.5 mm, at any calibration', () => {
    expect(panelWidthMm(6, 1448, 1072)).toBeCloseTo(122.5, 0);
    for (const pxPerMm of [3.2, 3.78, 5.5]) {
      const s = realScale(pxPerMm, 6, 1448, 1072);
      expect(panelInHole(FACE.hole, 1448, 1072).w * s).toBeCloseTo(panelWidthMm(6, 1448, 1072) * pxPerMm, 0);
    }
    expect(panelWidthMm(4, 600, 400)).toBeCloseTo(84.53, 1);
    for (const pxPerMm of [3.2, 3.78, 5.5]) {
      const s = realScale(pxPerMm, 4, 600, 400);
      expect(panelInHole(FACE.hole, 600, 400).w * s).toBeCloseTo(84.53 * pxPerMm, 0);
    }
  });
});

describe('the chicken (assets/chicken-*.svg)', () => {
  it('parses to the panel colors: red hen on yellow, and an ink silhouette', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { parseSvg, chickenFill } = await import('../src/screen/chicken');
    const { REPO_DIR } = await import('../server/config');
    const color = parseSvg(readFileSync(join(REPO_DIR, 'assets/chicken-color.svg'), 'utf8'));
    expect(color.w / color.h).toBe(1);
    expect(color.shapes.map((s) => chickenFill(s.fill))).toEqual(['yellow', 'red', 'red']);
    expect(color.shapes[0].circle).toBeDefined();
    // The body has the eye cut out (even-odd), so the yellow shows through as the eye ring.
    expect(color.shapes.some((s) => s.evenOdd)).toBe(true);
    const alone = parseSvg(readFileSync(join(REPO_DIR, 'assets/chicken-alone.svg'), 'utf8'));
    expect(alone.shapes.map((s) => chickenFill(s.fill))).toEqual(['ink', 'ink']);
  });
});
