/** Color math shared by the dither and the panel pass. Pure functions, no DOM. */

export type RGB = [number, number, number];

export function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

/** sRGB 0-255 -> linear 0-1, via a lookup table. */
export const SRGB_TO_LINEAR = (() => {
  const t = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    const c = i / 255;
    t[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  }
  return t;
})();

export function linearToSrgb(v: number): number {
  const c = v <= 0 ? 0 : v >= 1 ? 1 : v;
  const s = c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.round(s * 255);
}

/** Linear RGB -> OKLab (Björn Ottosson). */
export function linearToOklab(r: number, g: number, b: number): RGB {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function packRgb(r: number, g: number, b: number): number {
  return (r << 16) | (g << 8) | b;
}

export interface PaletteEntry {
  rgb: RGB;
  lin: RGB;
  lab: RGB;
  packed: number;
}

export function makePalette(hexes: string[]): PaletteEntry[] {
  return hexes.map((hex) => {
    const rgb = hexToRgb(hex);
    const lin: RGB = [SRGB_TO_LINEAR[rgb[0]], SRGB_TO_LINEAR[rgb[1]], SRGB_TO_LINEAR[rgb[2]]];
    return { rgb, lin, lab: linearToOklab(lin[0], lin[1], lin[2]), packed: packRgb(rgb[0], rgb[1], rgb[2]) };
  });
}

/** Nearest palette entry in OKLab (perceptual) for a linear-RGB color. */
export function nearestOklab(pal: PaletteEntry[], r: number, g: number, b: number): PaletteEntry {
  const [L, A, B] = linearToOklab(Math.max(0, r), Math.max(0, g), Math.max(0, b));
  let best = pal[0];
  let bd = Infinity;
  for (const p of pal) {
    const d = (L - p.lab[0]) ** 2 + (A - p.lab[1]) ** 2 + (B - p.lab[2]) ** 2;
    if (d < bd) { bd = d; best = p; }
  }
  return best;
}

/**
 * Snap an anti-aliased pixel to one of two chrome colors. Canvas text and lines
 * blend the foreground into the background, so every off-palette pixel lies
 * near the segment between two palette colors. Find that segment and take the
 * nearer end. (Plain nearest-color would turn the gray edge between ink and
 * paper into red or green fringes.)
 */
export function snapToPair(pal: PaletteEntry[], r: number, g: number, b: number): PaletteEntry {
  let best = pal[0];
  let bd = Infinity;
  for (let i = 0; i < pal.length; i++) {
    for (let j = i + 1; j < pal.length; j++) {
      const a = pal[i].lin, c = pal[j].lin;
      const dx = c[0] - a[0], dy = c[1] - a[1], dz = c[2] - a[2];
      const len2 = dx * dx + dy * dy + dz * dz || 1;
      let t = ((r - a[0]) * dx + (g - a[1]) * dy + (b - a[2]) * dz) / len2;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const px = a[0] + t * dx, py = a[1] + t * dy, pz = a[2] + t * dz;
      const d = (r - px) ** 2 + (g - py) ** 2 + (b - pz) ** 2;
      if (d < bd) { bd = d; best = t < 0.5 ? pal[i] : pal[j]; }
    }
  }
  return best;
}
