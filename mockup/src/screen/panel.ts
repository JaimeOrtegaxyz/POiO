/**
 * The panel pass: what the e-paper can actually show. Runs on every frame
 * after drawing, before the frame reaches the visible canvas. Pure, no DOM:
 * it takes anything shaped like ImageData, so it unit-tests in Node.
 */
import { CHROME, PIGMENTS, type Profile } from './profiles';
import { SRGB_TO_LINEAR, hexToRgb, linearToSrgb, makePalette, snapToPair, type PaletteEntry } from './color';

export interface PixelBuffer {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

const cache = new Map<string, { all: PaletteEntry[]; chrome: PaletteEntry[]; exact: Set<number> }>();

export function palettesFor(p: Profile) {
  let c = cache.get(p.id);
  if (!c) {
    const all = makePalette(PIGMENTS.map((n) => p.colors[n]));
    const chrome = makePalette(CHROME.map((n) => p.colors[n]));
    c = { all, chrome, exact: new Set(all.map((e) => e.packed)) };
    cache.set(p.id, c);
  }
  return c;
}

/** Snap every pixel to what the profile's panel can display. Mutates and returns `buf`. */
export function panelPass(buf: PixelBuffer, p: Profile): PixelBuffer {
  return p.mode === 'kaleido' ? kaleidoPass(buf, p) : palettePass(buf, p);
}

/**
 * Spectra-style: six discrete pigments. Pixels already on the palette (the
 * pre-dithered food images) are kept as they are; everything else is chrome
 * (text, hairlines, patterns) and snaps to ink / paper / yellow / red. Text
 * comes out aliased, the way the panel shows it.
 */
function palettePass(buf: PixelBuffer, p: Profile): PixelBuffer {
  const { chrome, exact } = palettesFor(p);
  const d = buf.data;
  const memo = new Map<number, PaletteEntry>();
  for (let i = 0; i < d.length; i += 4) {
    const packed = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2];
    if (exact.has(packed)) { d[i + 3] = 255; continue; }
    let e = memo.get(packed);
    if (!e) {
      e = snapToPair(chrome, SRGB_TO_LINEAR[d[i]], SRGB_TO_LINEAR[d[i + 1]], SRGB_TO_LINEAR[d[i + 2]]);
      memo.set(packed, e);
    }
    d[i] = e.rgb[0]; d[i + 1] = e.rgb[1]; d[i + 2] = e.rgb[2]; d[i + 3] = 255;
  }
  return buf;
}

/**
 * Kaleido-style: a color filter over a 16-level gray e-ink layer. Luminance
 * keeps full resolution (that's why text stays sharp); chroma comes from a
 * half-resolution grid and is muted; the paper is grayish. Output is
 * quantized to 4 bits per channel (4,096 colors).
 */
function kaleidoPass(buf: PixelBuffer, p: Profile): PixelBuffer {
  const k = p.kaleido!;
  const { data: d, width: w, height: h } = buf;
  const inkL = hexToRgb(k.ink).map((v) => SRGB_TO_LINEAR[v]);
  const paperL = hexToRgb(k.paper).map((v) => SRGB_TO_LINEAR[v]);
  // White balance: the drawing paper is the panel's white, so it maps to on-panel paper exactly.
  const wp = hexToRgb(p.colors.paper).map((v) => SRGB_TO_LINEAR[v]);
  const block = Math.max(1, Math.round(1 / k.colorScale));
  const levels = k.grayLevels - 1;
  const qmax = (1 << k.colorBits) - 1;
  const step = 255 / qmax;
  const keep = 1 - k.desaturate;

  // Chroma grid: per-block average linear color and its luminance.
  const bw = Math.ceil(w / block), bh = Math.ceil(h / block);
  const tint = new Float32Array(bw * bh * 3);
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++) {
      let r = 0, g = 0, b = 0, n = 0;
      for (let y = by * block; y < Math.min(h, (by + 1) * block); y++) {
        for (let x = bx * block; x < Math.min(w, (bx + 1) * block); x++) {
          const i = (y * w + x) * 4;
          r += SRGB_TO_LINEAR[d[i]] / wp[0]; g += SRGB_TO_LINEAR[d[i + 1]] / wp[1]; b += SRGB_TO_LINEAR[d[i + 2]] / wp[2]; n++;
        }
      }
      r /= n; g /= n; b /= n;
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      const o = (by * bw + bx) * 3;
      if (lum < 0.02) { tint[o] = tint[o + 1] = tint[o + 2] = 1; continue; } // too dark to carry color
      tint[o] = Math.max(0, 1 + keep * (r / lum - 1));
      tint[o + 1] = Math.max(0, 1 + keep * (g / lum - 1));
      tint[o + 2] = Math.max(0, 1 + keep * (b / lum - 1));
    }
  }

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lr = SRGB_TO_LINEAR[d[i]] / wp[0], lg = SRGB_TO_LINEAR[d[i + 1]] / wp[1], lb = SRGB_TO_LINEAR[d[i + 2]] / wp[2];
      const lum = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
      // Gray layer: 16 levels, perceptually spaced, between on-panel ink and paper.
      const t = Math.round(Math.cbrt(Math.min(1, lum)) * levels) / levels;
      const o = (Math.floor(y / block) * bw + Math.floor(x / block)) * 3;
      for (let c = 0; c < 3; c++) {
        const gray = inkL[c] + (paperL[c] - inkL[c]) * t * t * t;
        const v = linearToSrgb(gray * tint[o + c]);
        d[i + c] = Math.round(Math.round(v / step) * step);
      }
      d[i + 3] = 255;
    }
  }
  return buf;
}
