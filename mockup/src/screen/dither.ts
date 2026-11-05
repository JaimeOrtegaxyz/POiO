/**
 * Floyd-Steinberg dithering of food images to the panel's pigments. Error is
 * diffused in linear RGB; the nearest pigment is picked in OKLab. A mild
 * contrast and saturation boost first, since pigment panels read flat.
 * Pure, no DOM.
 */
import { SRGB_TO_LINEAR, nearestOklab, type PaletteEntry } from './color';
import type { PixelBuffer } from './panel';

export interface DitherOptions {
  contrast?: number;
  saturation?: number;
}

export function boost(buf: PixelBuffer, { contrast = 1.12, saturation = 1.3 }: DitherOptions = {}): void {
  const d = buf.data;
  for (let i = 0; i < d.length; i += 4) {
    let r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    r = y + (r - y) * saturation; g = y + (g - y) * saturation; b = y + (b - y) * saturation;
    r = (r - 0.5) * contrast + 0.5; g = (g - 0.5) * contrast + 0.5; b = (b - 0.5) * contrast + 0.5;
    d[i] = r * 255; d[i + 1] = g * 255; d[i + 2] = b * 255; // Uint8ClampedArray clamps
  }
}

/** Dither `buf` in place so every pixel is exactly one of `pal`. */
export function ditherToPalette(buf: PixelBuffer, pal: PaletteEntry[], opts: DitherOptions = {}): PixelBuffer {
  boost(buf, opts);
  const { data: d, width: w, height: h } = buf;
  const err = new Float32Array(w * h * 3);
  for (let i = 0, p = 0; i < d.length; i += 4, p += 3) {
    err[p] = SRGB_TO_LINEAR[d[i]]; err[p + 1] = SRGB_TO_LINEAR[d[i + 1]]; err[p + 2] = SRGB_TO_LINEAR[d[i + 2]];
  }
  const push = (x: number, y: number, er: number, eg: number, eb: number, f: number) => {
    if (x < 0 || x >= w || y >= h) return;
    const q = (y * w + x) * 3;
    err[q] += er * f; err[q + 1] += eg * f; err[q + 2] += eb * f;
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const q = (y * w + x) * 3;
      const r = err[q], g = err[q + 1], b = err[q + 2];
      const e = nearestOklab(pal, r, g, b);
      const er = r - e.lin[0], eg = g - e.lin[1], eb = b - e.lin[2];
      push(x + 1, y, er, eg, eb, 7 / 16);
      push(x - 1, y + 1, er, eg, eb, 3 / 16);
      push(x, y + 1, er, eg, eb, 5 / 16);
      push(x + 1, y + 1, er, eg, eb, 1 / 16);
      const i = (y * w + x) * 4;
      d[i] = e.rgb[0]; d[i + 1] = e.rgb[1]; d[i + 2] = e.rgb[2]; d[i + 3] = 255;
    }
  }
  return buf;
}
