import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { MOCKUP_DIR, REPO_DIR } from '../server/config';

const hexes = (s: string) => [...s.matchAll(/#[0-9A-Fa-f]{6}\b/g)].map((m) => m[0].toUpperCase());

describe('brand colors: one palette, everywhere', () => {
  const css = readFileSync(join(MOCKUP_DIR, 'src/brand.css'), 'utf8');
  const palette = new Set(hexes(css));

  it('assets/BRAND.md and src/brand.css list the same colors', () => {
    const doc = readFileSync(join(REPO_DIR, 'assets/BRAND.md'), 'utf8');
    const table = doc.split('## Colors')[1].split('\n## ')[0];
    expect(new Set(hexes(table))).toEqual(palette);
    expect([...palette]).toEqual(expect.arrayContaining(['#E7E7E7', '#E50001', '#FFC700']));
  });

  it('the hens and the hero ring use only brand colors', () => {
    for (const f of ['chicken-color.svg', 'chicken-alone.svg']) {
      for (const h of hexes(readFileSync(join(REPO_DIR, 'assets', f), 'utf8'))) expect(palette.has(h), `${f} ${h}`).toBe(true);
    }
    const hero = JSON.parse(readFileSync(join(MOCKUP_DIR, 'public/vaiven.presets.json'), 'utf8'))['poio-hero'];
    for (const h of [hero.colors.fill, hero.colors.stroke]) expect(palette.has(h.toUpperCase()), h).toBe(true);
  });

  it('the landing and the page around the device take their colors from brand.css', () => {
    for (const f of ['src/landing/landing.css', 'src/styles.css']) {
      const src = readFileSync(join(MOCKUP_DIR, f), 'utf8');
      expect(src, f).toMatch(/@import '\.{1,2}\/brand\.css'/);
    }
    // The landing has no colors of its own.
    expect(hexes(readFileSync(join(MOCKUP_DIR, 'src/landing/landing.css'), 'utf8'))).toEqual([]);
  });
});
