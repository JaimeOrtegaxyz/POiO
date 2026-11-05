import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parsePantryTemplate } from '../shared/pantry';
import { slugify } from '../shared/slug';
import type { Recipe } from '../shared/types';
import { assignVariant } from '../src/ab/variant';
import { COOKBOOK, DONE, PANTRY_NAMES, REPLY } from '../src/copy/es-MX';
import { stepDisplayText } from '../src/flows/cook';
import { applyMissing, keyIngredients, predictDiff } from '../src/flows/pantry-logic';
import { parseIntent, parseServings } from '../src/input/intent';
import { REPO_DIR } from '../server/config';

const template = parsePantryTemplate(readFileSync(join(REPO_DIR, 'pantry.example.md'), 'utf8'));
const tinga = JSON.parse(readFileSync(join(REPO_DIR, 'reference/recipes/tinga-de-pollo.json'), 'utf8')) as Recipe;

describe('pantry keys', () => {
  it('slugify follows the adapter rule', () => {
    expect(slugify('Chicken thighs (boneless)')).toBe('chicken-thighs-boneless');
    expect(slugify('Crema (Mexican sour cream)')).toBe('crema-mexican-sour-cream');
    expect(slugify('Jalapeños')).toBe('jalapenos');
    expect(slugify("Za'atar")).toBe('za-atar');
  });

  it('parses the template, de-duplicating repeated rows', () => {
    const keys = template.map((t) => t.key);
    expect(keys).toContain('chicken-thighs-boneless');
    expect(keys.filter((k) => k === 'potatoes')).toHaveLength(1);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('every template key has a Spanish name, and every name is a template key', () => {
    const keys = new Set(template.map((t) => t.key));
    for (const k of keys) expect(PANTRY_NAMES[k], k).toBeDefined();
    for (const k of Object.keys(PANTRY_NAMES)) expect(keys.has(k), k).toBe(true);
  });

  it('the sample recipes use template keys (plus tostadas)', () => {
    const keys = new Set([...template.map((t) => t.key), 'tostadas']);
    for (const i of tinga.ingredients) expect(keys.has(i.item), i.item).toBe(true);
  });
});

describe('local intent parser', () => {
  const cases: [string, unknown][] = [
    ['Siguiente', { kind: 'next' }],
    ['listo', { kind: 'next' }],
    ['ya', { kind: 'next' }],
    ['atrás', { kind: 'back' }],
    ['otras', { kind: 'discard' }],
    ['Ninguna', { kind: 'discard' }],
    ['la primera', { kind: 'pick', index: 1 }],
    ['la última', { kind: 'pick', index: -1 }],
    ['2', { kind: 'number', value: 2 }],
    ['la dos', { kind: 'number', value: 2 }],
    ['ocho', { kind: 'number', value: 8 }],
    ['10', { kind: 'number', value: 10 }],
    ['sáltalo', { kind: 'skip' }],
    ['luego', { kind: 'skip' }],
    ['sí', { kind: 'yes' }],
    ['no', { kind: 'no' }],
    ['despensa', { kind: 'nav', to: 'pantry' }],
    ['Recetario', { kind: 'nav', to: 'cookbook' }],
    ['¿Qué sabes de mí?', { kind: 'nav', to: 'notes' }],
    ['¿Qué hago de cenar?', { kind: 'nav', to: 'choose' }],
    ['pregúntame todo', { kind: 'askAll' }],
  ];
  for (const [text, want] of cases) it(`"${text}"`, () => expect(parseIntent(text)).toEqual(want));

  it('is anchored: sentences go to the brain', () => {
    for (const t of ['no hay crema', 'se acabó la crema', 'compré poblanos y media crema', 'algo más rápido', 'ya no hay tortillas', 'olvida lo del cilantro']) {
      expect(parseIntent(t), t).toBeNull();
    }
  });

  it('servings from an answer', () => {
    expect(parseServings('para cuatro')).toBe(4);
    expect(parseServings('somos 3')).toBe(3);
    expect(parseServings('solo para mí')).toBe(1);
    expect(parseServings('qué')).toBeNull();
  });
});

describe('predicted pantry diff (no LLM)', () => {
  it('follows the depletes transitions', () => {
    const pantry = {
      'chicken-thighs-boneless': { status: 'plenty' as const, at: 0 },
      'white-onion': { status: 'low' as const, at: 0 },
      'chipotle-in-adobo-canned': { status: 'low' as const, at: 0 },
      'vegetable-oil': { status: 'plenty' as const, at: 0 },
    };
    const d = Object.fromEntries(predictDiff(tinga, pantry).map((r) => [r.item, r.to]));
    expect(d['chicken-thighs-boneless']).toBe('low'); // heavy: plenty -> low
    expect(d['white-onion']).toBe('out'); // some: low -> out
    expect(d['chipotle-in-adobo-canned']).toBe('out'); // heavy: low -> out
    expect(d.tostadas).toBe('out'); // finishes
    expect(d['crema-mexican-sour-cream']).toBe('out'); // finishes
    expect(d['vegetable-oil']).toBeUndefined(); // light: no change
    expect(d['salt-kosher-table']).toBeUndefined(); // none
    expect(d['queso-fresco']).toBeUndefined(); // some, unknown: no change
  });

  it('drop and swap rewrite ingredients and every step', () => {
    const dropped = applyMissing(tinga, 'crema-mexican-sour-cream', { kind: 'drop' });
    expect(dropped.ingredients.some((i) => i.item === 'crema-mexican-sour-cream')).toBe(false);
    expect(dropped.steps.flatMap((s) => s.uses ?? [])).not.toContain('crema-mexican-sour-cream');
    const swapped = applyMissing(tinga, 'crema-mexican-sour-cream', { kind: 'swap', swapItem: 'greek-yoghurt', swapDisplay: 'yogur griego' });
    expect(swapped.ingredients.find((i) => i.item === 'greek-yoghurt')?.display).toBe('yogur griego');
    expect(swapped.steps[5].uses).toContain('greek-yoghurt');
  });

  it('the ingredient check shows 3-6 key ingredients', () => {
    const k = keyIngredients(tinga);
    expect(k.length).toBeGreaterThanOrEqual(3);
    expect(k.length).toBeLessThanOrEqual(6);
    expect(k[0].star).toBe(true);
  });
});

describe('no time drawn while cooking', () => {
  it('hides the "A los N min, checkpoint:" clause from step text', () => {
    expect(stepDisplayText('Cocina la cebolla sin prisa. A los 5 min, checkpoint: debe estar suave y apenas dorada.', true)).toBe('Cocina la cebolla sin prisa.');
    expect(stepDisplayText('Sala las tiras y dóralas. A los 6 min, checkpoint: doradas por fuera. Apártalas.', true)).toBe('Sala las tiras y dóralas. Apártalas.');
    expect(stepDisplayText('Barniza y regresa al horno. A los 8 o 10 min, checkpoint: pegajoso.', true)).toBe('Barniza y regresa al horno.');
    expect(stepDisplayText('Precalienta el horno a 220 °C.', false)).toBe('Precalienta el horno a 220 °C.');
  });

  it('no sample step shows a minute count once cleaned', () => {
    for (const f of ['tinga-de-pollo', 'pollo-a-la-crema-con-rajas', 'gochujang-glazed-thighs']) {
      const r = JSON.parse(readFileSync(join(REPO_DIR, `reference/recipes/${f}.json`), 'utf8')) as Recipe;
      for (const s of r.steps) expect(stepDisplayText(s.text, !!s.checkpoint), s.text).not.toMatch(/\b\d+\s*min\b/);
    }
  });
});

describe('copy agreement', () => {
  it('reads as natural Mexican Spanish', () => {
    expect(REPLY.notedOut('crema')).toBe('Anotado: crema, agotada.');
    expect(REPLY.notedOut('tortillas de maíz')).toBe('Anotado: tortillas de maíz, agotadas.');
    expect(REPLY.notedOut('queso fresco')).toBe('Anotado: queso fresco, agotado.');
    expect(DONE.diffOut(['crema', 'tostadas'])).toBe('Usaste crema y tostadas. ¿Las marco como agotadas?');
    expect(COOKBOOK.checkin('Tinga de pollo')).toBe('¿Qué tal la tinga de pollo?');
    expect(COOKBOOK.checkin('Pollo a la crema con rajas')).toBe('¿Qué tal el pollo a la crema con rajas?');
    expect(COOKBOOK.checkin('Muslos glaseados con gochujang')).toBe('¿Qué tal los muslos glaseados con gochujang?');
  });
});

describe('A/B variant', () => {
  it('is random per device, sticky, and ?variant= overrides', () => {
    expect(assignVariant(null, '', () => 0.1).variant).toBe('a');
    expect(assignVariant(null, '', () => 0.9).variant).toBe('b');
    expect(assignVariant('b', '', () => 0.1)).toEqual({ variant: 'b', source: 'stored', changed: false });
    expect(assignVariant('b', '?variant=a')).toEqual({ variant: 'a', source: 'url', changed: true });
  });
});
