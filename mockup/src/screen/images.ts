/**
 * Food images: static sources in public/food/<recipe-id>.jpg, dithered to the
 * panel at runtime (no runtime image generation, never hotlinked). Dishes
 * without an image fall back to a glyph or the text layout.
 */
import { ditherToPalette } from './dither';
import { palettesFor } from './panel';
import type { Profile } from './profiles';

const pending = new Map<string, Promise<HTMLImageElement | null>>();
const loaded = new Map<string, HTMLImageElement | null>();
const rendered = new Map<string, HTMLCanvasElement>();

/** Load the source for `id` once; resolves true if the file exists. */
export function ensureFood(id: string): Promise<boolean> {
  if (loaded.has(id)) return Promise.resolve(loaded.get(id) !== null);
  let p = pending.get(id);
  if (!p) {
    p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = `/food/${encodeURIComponent(id)}.jpg`;
    });
    pending.set(id, p);
  }
  return p.then((img) => { loaded.set(id, img); return img !== null; });
}

/**
 * The dithered image for `id` at w×h design units, or null if it isn't loaded
 * (or doesn't exist). Synchronous so screens can draw it; call ensureFood first.
 */
export function foodImage(id: string, p: Profile, wUnits: number, hUnits: number): HTMLCanvasElement | null {
  const img = loaded.get(id);
  if (!img) return null;
  const u = p.width / 600;
  const w = Math.round(wUnits * u), h = Math.round(hUnits * u);
  const key = `${p.id}:${id}:${w}x${h}`;
  const hit = rendered.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  // Cover-fit crop, food large in frame.
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const s = Math.max(w / iw, h / ih);
  const sw = w / s, sh = h / s;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
  if (p.mode === 'palette') {
    const data = ctx.getImageData(0, 0, w, h);
    ditherToPalette(data, palettesFor(p).all);
    ctx.putImageData(data, 0, 0);
  }
  rendered.set(key, c);
  return c;
}
