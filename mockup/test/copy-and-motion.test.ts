import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as copy from '../src/copy/es-MX';
import { fakeActions, fakeUtterance, FakeBrain } from '../server/brain/fake';
import { MOCKUP_DIR } from '../server/config';
import { ctx, files } from './helpers';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

/** All string leaves of the screen copy (functions called with sample args). */
function copyStrings(): string[] {
  const out: string[] = [];
  const visit = (v: unknown) => {
    if (typeof v === 'string') out.push(v);
    else if (typeof v === 'function') { try { const r = (v as (...a: unknown[]) => unknown)('crema', 'x', '1', '2', '3'); if (typeof r === 'string') out.push(r); } catch { /* skip */ } }
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === 'object') Object.values(v).forEach(visit);
  };
  for (const [k, v] of Object.entries(copy)) if (k !== 'PANTRY_NAMES' && k !== 'EXTRA_PANTRY_NAMES' && k !== 'PANTRY_CATEGORIES') visit(v);
  return out;
}

describe('screen copy (B-C voice, Mexican Spanish)', () => {
  const strings = copyStrings();
  const fixtures = walk(join(MOCKUP_DIR, 'server/fixtures/recipes')).map((f) => readFileSync(f, 'utf8'));

  it('has no Spain-isms', () => {
    const bad = /\b(vale|vosotros|vuestro|zumo|nevera|patata|patatas|ordenador|coger|tomate rojo)\b/i;
    for (const s of [...strings, ...fixtures]) expect(s).not.toMatch(bad);
  });

  it('has no exclamation marks, no emoji and no filler', () => {
    for (const s of strings) {
      expect(s).not.toMatch(/[!¡]/);
      expect(s).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(s).not.toMatch(/claro que sí|con gusto|excelente elección|qué rico/i);
    }
  });

  it('keeps the canonical lines', () => {
    expect(copy.DONE.line).toBe('Listo. Provecho.');
    expect(copy.DONE.taste).toBe('¿Cómo quedó, del 1 al 10?');
    expect(copy.VOICE_STATE).toEqual({ listening: 'Te escucho.', thinking: 'Pensando…', notUnderstood: 'No te entendí. Mantén el botón y dilo otra vez.' });
    expect(copy.CHECK.heading).toBe('Antes de empezar:');
    expect(copy.COOK.checkpointHere('Revisa el pollo.')).toBe('Ojo · Revisa el pollo.');
    expect(copy.REPLY.forgotten).toBe('Listo, ya no lo tomo en cuenta.');
    expect(copy.DEVICE.typedPlaceholder).toBe('Escribe en lugar de hablar');
    expect(copy.ONBOARDING.map((q) => q.ask)).toEqual([
      '¿En qué ciudad cocinas?',
      '¿Para cuántas personas cocinas normalmente?',
      '¿Comes de todo, o hay algo que no comas?',
      'Supongo que tienes estufa, horno, sartén y licuadora. ¿Así es?',
    ]);
    expect(copy.FIRST_ROUND.waiting).toBe('Van tres ideas para empezar.');
    expect(copy.NOTES.equipment(['estufa', 'sartén'], ['horno'])).toBe('Cocinas con estufa y sartén. Sin horno.');
  });

  it('screen modules draw no string literals of their own (copy lives in es-MX.ts)', () => {
    for (const f of walk(join(MOCKUP_DIR, 'src/flows'))) {
      const src = readFileSync(f, 'utf8');
      // p.text / p.para with a literal Spanish string would bypass the copy file.
      expect(src, f).not.toMatch(/p\.(text|para)\(\s*'[^']*[a-záéíóúñ]{3}/i);
    }
  });
});

describe('no motion while pending', () => {
  it('no CSS animations and no transitions: the knob turns by swapping rendered frames', () => {
    const css = walk(join(MOCKUP_DIR, 'src')).filter((f) => f.endsWith('.css')).map((f) => readFileSync(f, 'utf8')).join('\n');
    expect(css).not.toMatch(/@keyframes|animation\s*:/);
    const transitions = [...css.matchAll(/([^{}]*)\{[^}]*transition\s*:\s*([^;}]*)/g)].map((m) => ({ sel: m[1].trim(), value: m[2].trim() }));
    const moving = transitions.filter((t) => t.value !== 'none');
    expect(moving).toEqual([]);
  });

  it('no requestAnimationFrame loops anywhere in the client', () => {
    for (const f of walk(join(MOCKUP_DIR, 'src'))) {
      if (!/\.(ts|css)$/.test(f)) continue;
      expect(readFileSync(f, 'utf8'), f).not.toMatch(/requestAnimationFrame/);
    }
  });
});

describe('fake brain', () => {
  const brain = new FakeBrain(files.fixtures);
  const tingaIngredients = { ingredients: brain.recipe('Tinga de pollo')!.ingredients.map((i) => ({ item: i.item, display: i.display })) };

  it('serves three options, then three new ones, honoring tweaks', () => {
    const first = brain.suggest(ctx() as any, {}).options.map((o) => o.title);
    expect(first).toEqual(['Tinga de pollo', 'Pollo a la crema con rajas', 'Muslos glaseados con gochujang']);
    const next = brain.suggest(ctx() as any, { exclude: first }).options.map((o) => o.title);
    expect(next.some((t) => first.includes(t))).toBe(false);
    const noChicken = brain.suggest(ctx() as any, { tweak: 'no hay pollo' }).options;
    expect(noChicken).toHaveLength(3);
    expect(noChicken.every((o) => !/pollo/i.test(o.title))).toBe(true);
    const noOven = brain.suggest(ctx() as any, { tweak: 'sin horno' }).options;
    expect(noOven.some((o) => /gochujang/.test(o.title))).toBe(false);
  });

  it('maps speech to actions', () => {
    const a = (screen: string, u: string, contents: unknown = tingaIngredients) => fakeUtterance(ctx(screen, contents) as any, u, brain);
    expect(a('check', 'no hay crema')).toMatchObject({ action: 'missing', item: 'crema-mexican-sour-cream', line: 'No hay crema. ¿La quitamos o usamos yogur? Queda menos espesa.' });
    expect(a('cook', 'se acabó la crema')).toMatchObject({ action: 'pantry', changes: [{ item: 'crema-mexican-sour-cream', status: 'out' }] });
    expect(a('cookbook', 'compré poblanos y media crema')).toMatchObject({ action: 'pantry', changes: [{ item: 'media-crema', status: 'plenty' }, { item: 'poblano-peppers', status: 'plenty' }] });
    expect(a('choose', 'algo más rápido')).toMatchObject({ action: 'tweak' });
    expect(a('cookbook', 'hazme unas tostadas de tinga')).toMatchObject({ action: 'recipe_request', title: 'Tinga de pollo' });
    expect(a('cook', 'cántame algo')).toEqual({ action: 'not_understood' });
    const withNote = { ...ctx('notes'), poionotas: ['No le gusta el cilantro.'] } as any;
    expect(fakeUtterance(withNote, 'Olvida lo del cilantro', brain)).toMatchObject({ action: 'poionotas', remove: ['No le gusta el cilantro.'] });
  });

  it('one sentence can ask for several things: state first, then one move', () => {
    const options = { options: [{ title: 'Tinga de pollo' }, { title: 'Pollo a la crema con rajas' }, { title: 'Muslos glaseados con gochujang' }] };
    expect(fakeActions(ctx('choose', options) as any, 'me gusta la primera pero no tengo perejil', brain)).toEqual([
      { action: 'pantry', changes: [{ item: 'flat-leaf-parsley', status: 'out', display: 'perejil' }], reply: 'Anotado.' },
      { action: 'pick', index: 1 },
    ]);
    expect(fakeActions(ctx('cook', tingaIngredients) as any, 'cántame algo', brain)).toEqual([{ action: 'not_understood' }]);
  });

  it('first-run answers become notes: diet and equipment', () => {
    expect(fakeActions(ctx('onboarding-3') as any, 'soy vegetariana', brain)).toMatchObject([{ action: 'poionotas', add: ['Dieta vegetariana: sin carne, pollo ni pescado.'] }]);
    expect(fakeActions(ctx('onboarding-3') as any, 'no como cerdo', brain)).toMatchObject([{ action: 'poionotas', add: ['No comes cerdo.'] }]);
    expect(fakeActions(ctx('onboarding-4') as any, 'tengo freidora de aire pero no tengo horno', brain))
      .toMatchObject([{ action: 'poionotas', add: ['Cocinas con estufa, sartén, licuadora y freidora de aire. Sin horno.'] }]);
    expect(fakeActions(ctx('onboarding-4') as any, 'mmm', brain)).toEqual([{ action: 'not_understood' }]);
  });
});
