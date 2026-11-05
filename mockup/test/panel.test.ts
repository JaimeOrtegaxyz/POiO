import { describe, expect, it } from 'vitest';
import { makePalette } from '../src/screen/color';
import { ditherToPalette } from '../src/screen/dither';
import { panelPass, palettesFor, type PixelBuffer } from '../src/screen/panel';
import { CHROME, PIGMENTS, PROFILES } from '../src/screen/profiles';
import { diffRect } from '../src/screen/refresh';

const spectra = PROFILES['spectra6-4in'];
const kaleido = PROFILES['kaleido3-6in'];

function buffer(w: number, h: number, fill: (x: number, y: number) => [number, number, number]): PixelBuffer {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const [r, g, b] = fill(x, y);
    const i = (y * w + x) * 4;
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
  }
  return { data, width: w, height: h };
}

function colors(buf: PixelBuffer): Set<string> {
  const s = new Set<string>();
  for (let i = 0; i < buf.data.length; i += 4) {
    s.add(`#${[buf.data[i], buf.data[i + 1], buf.data[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`);
  }
  return s;
}

/** Deterministic noise. */
function rng(seed: number) {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 2 ** 32; };
}

describe('panel pass (Spectra profile)', () => {
  it('outputs only palette colors, whatever goes in', () => {
    const r = rng(7);
    const buf = buffer(120, 80, () => [Math.floor(r() * 256), Math.floor(r() * 256), Math.floor(r() * 256)]);
    panelPass(buf, spectra);
    const allowed = new Set(PIGMENTS.map((p) => spectra.colors[p]));
    for (const c of colors(buf)) expect(allowed.has(c)).toBe(true);
  });

  it('snaps anti-aliased chrome to ink/paper/yellow/red, never to blue or green', () => {
    // Every blend between two chrome colors, as canvas text and hairlines produce.
    const chrome = CHROME.map((c) => spectra.colors[c]);
    const pal = makePalette(chrome);
    const blends: [number, number, number][] = [];
    for (let i = 0; i < pal.length; i++) for (let j = 0; j < pal.length; j++) for (let t = 0; t <= 10; t++) {
      const a = pal[i].rgb, b = pal[j].rgb, k = t / 10;
      blends.push([0, 1, 2].map((c) => Math.round(a[c] + (b[c] - a[c]) * k)) as [number, number, number]);
    }
    const buf = buffer(blends.length, 1, (x) => blends[x]);
    panelPass(buf, spectra);
    const allowed = new Set(chrome);
    for (const c of colors(buf)) expect(allowed.has(c)).toBe(true);
  });

  it('keeps pre-dithered food pixels (exact pigments) as they are', () => {
    const blue = spectra.colors.blue;
    const buf = buffer(4, 4, () => [0x2d, 0x4f, 0x9e]);
    panelPass(buf, spectra);
    expect([...colors(buf)]).toEqual([blue]);
  });

  it('the dither uses only the six pigments', () => {
    const r = rng(3);
    const buf = buffer(64, 48, (x, y) => [Math.min(255, x * 4 + r() * 20), Math.min(255, y * 5), 120]);
    ditherToPalette(buf, palettesFor(spectra).all);
    const allowed = new Set(PIGMENTS.map((p) => spectra.colors[p]));
    const seen = colors(buf);
    for (const c of seen) expect(allowed.has(c)).toBe(true);
    expect(seen.size).toBeGreaterThan(2);
  });
});

describe('panel pass (Kaleido profile)', () => {
  it('quantizes to 4 bits per channel (4,096 colors)', () => {
    const r = rng(11);
    const buf = buffer(40, 30, () => [Math.floor(r() * 256), Math.floor(r() * 256), Math.floor(r() * 256)]);
    panelPass(buf, kaleido);
    for (let i = 0; i < buf.data.length; i += 4) {
      for (let c = 0; c < 3; c++) expect(buf.data[i + c] % 17).toBe(0);
    }
  });

  it('maps drawing paper and ink to the grayish on-panel paper and ink, exactly', () => {
    const paper = buffer(4, 4, () => [0xf4, 0xef, 0xe4]);
    panelPass(paper, kaleido);
    expect([...colors(paper)]).toEqual([kaleido.kaleido!.paper]);
    const ink = buffer(4, 4, () => [0x1a, 0x18, 0x16]);
    panelPass(ink, kaleido);
    expect([...colors(ink)]).toEqual([kaleido.kaleido!.ink]);
  });

  it('mutes color', () => {
    const red = buffer(4, 4, () => [0xb8, 0x32, 0x2a]);
    panelPass(red, kaleido);
    const [r, g] = [red.data[0], red.data[1]];
    expect(r - g).toBeLessThan(0xb8 - 0x32); // less saturated than drawn
    expect(r).toBeGreaterThan(g); // still reads as red
  });
});

describe('refresh diff', () => {
  it('finds the changed rectangle, or null when nothing changed', () => {
    const a = buffer(50, 40, () => [255, 255, 255]);
    const b = buffer(50, 40, (x, y) => (x >= 10 && x < 20 && y >= 5 && y < 8 ? [0, 0, 0] : [255, 255, 255]));
    expect(diffRect(a, b)).toEqual({ x: 10, y: 5, w: 10, h: 3 });
    expect(diffRect(b, b)).toBeNull();
    expect(diffRect(null, b)).toEqual({ x: 0, y: 0, w: 50, h: 40 });
  });
});

describe('profiles', () => {
  it('render at integer scales and default to Spectra at 2×', () => {
    expect(spectra.width).toBe(600);
    expect(spectra.height).toBe(400);
    expect(spectra.defaultScale).toBe(2);
    expect(Number.isInteger(kaleido.defaultScale)).toBe(true);
    expect(spectra.timing.real.partialMs).toBeNull(); // no partial refresh on the real panel
  });
});
