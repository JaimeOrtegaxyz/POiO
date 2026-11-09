import { describe, expect, it } from 'vitest';
import { LIMIT_LINE } from '../src/copy/es-MX';
import { costUsd, sessionTokens } from '../server/pricing';
import { MAX_TOKENS } from '../server/brain/service';
import { ctx, local, post, reply, rig } from './helpers';

const OPTIONS = { options: [
  { title: 'Pollo al chipotle con papas', minutes: 35, difficulty: 'fácil' },
  { title: 'Tacos de pollo con nopales', minutes: 25, difficulty: 'fácil' },
  { title: 'Pollo en mole rápido', minutes: 40, difficulty: 'media' },
], reason: '' };

describe('real brain request shape', () => {
  it('caches the static prefix, asks for JSON-schema output at low effort, and sets max_tokens per endpoint', async () => {
    const r = rig({ replies: [reply(OPTIONS)] });
    const res = await post(r.app, '/api/suggest', { context: ctx() });
    expect(res.body.options).toHaveLength(3);
    const p = r.calls[0];
    expect(p.model).toBe('claude-haiku-5-5');
    expect(p.max_tokens).toBe(MAX_TOKENS.suggest);
    expect(p.system).toHaveLength(1);
    expect(p.system[0].cache_control).toEqual({ type: 'ephemeral', ttl: '1h' });
    expect(p.system[0].text).toContain('# SKILL.md');
    expect(p.system[0].text).toContain('# VOICE.md');
    expect(p.system[0].text).toContain('chicken-thighs-boneless');
    expect(p.output_config.effort).toBe('low');
    expect(p.output_config.format.type).toBe('json_schema');
    expect(p.thinking).toEqual({ type: 'disabled' });
    // The dynamic part carries the context, not the prefix.
    expect(p.messages[0].content).toContain('endpoint: suggest');
    expect(p.messages[0].content).toContain('ciudad: desconocida');
    expect(MAX_TOKENS).toEqual({ utterance: 500, suggest: 400, recipe: 3000 });
  });

  it('logs the four token counts and USD per call', async () => {
    const r = rig({ replies: [reply(OPTIONS, { input_tokens: 200, cache_creation_input_tokens: 10000, cache_read_input_tokens: 0, output_tokens: 100 })] });
    await post(r.app, '/api/suggest', { context: ctx() });
    const rec = r.store.data.usage[0];
    expect(rec).toMatchObject({ endpoint: 'suggest', model: 'claude-haiku-5-5', input_tokens: 200, cache_creation_input_tokens: 10000, cache_read_input_tokens: 0, output_tokens: 100 });
    expect(rec.usd).toBeCloseTo((200 * 0.1 + 10000 * 0.2 + 100 * 0.5) / 1e6, 10);
    const u = await (await r.app.request('/api/usage?session=test-session-1')).json();
    expect(u.session.tokens).toBe(1300);
    expect(u.day.usd).toBeCloseTo(rec.usd, 10);
  });

  it('retries once on invalid output, then falls back', async () => {
    const r = rig({ replies: [reply('not json'), reply({ options: [{ title: 'x' }] })] });
    const res = await post(r.app, '/api/suggest', { context: ctx() });
    expect(r.calls).toHaveLength(2);
    expect(r.calls[1].messages[0].content).toContain('previous reply');
    expect(res.body.fallback).toBe(true);
    expect(res.body.options).toHaveLength(3); // fixtures
    expect(r.store.data.usage).toHaveLength(2); // both attempts are logged
  });

  it('validates every recipe before use; an invalid one never reaches the client', async () => {
    const bad = { id: 'pollo-x', name: 'Pollo X', vibe: 'v', serves: 2, time: { activeMin: 1, totalMin: 2 }, ingredients: [], steps: [] };
    const r = rig({ replies: [reply(bad), reply(bad)] });
    const res = await post(r.app, '/api/recipe', { context: ctx(), title: 'Pollo X' });
    expect(res.body.fallback).toBe(true);
    expect(res.body.recipe).toBeNull(); // no fixture matches: the client says "No te entendí"
    // With a fixture-like title, the fallback is that (valid) fixture.
    const r2 = rig({ replies: [reply(bad), reply(bad)] });
    const res2 = await post(r2.app, '/api/recipe', { context: ctx(), title: 'Pollo en salsa verde' });
    expect(res2.body.recipe.id).toBe('pollo-en-salsa-verde');
    expect(r2.brain.validateRecipe(res2.body.recipe)).toBeNull();
  });

  it('a sample-recipe title returns the fixture with no call', async () => {
    const r = rig({ replies: [] });
    const res = await post(r.app, '/api/recipe', { context: ctx(), title: 'Tinga de pollo' });
    expect(res.body.recipe.id).toBe('tinga-de-pollo');
    expect(r.calls).toHaveLength(0);
  });

  it('an utterance with an invalid action falls back to not_understood', async () => {
    const r = rig({ replies: [reply({ actions: [{ action: 'pick' }] }), reply({ actions: [{ action: 'dance' }] })] });
    const res = await post(r.app, '/api/utterance', { context: ctx(), utterance: 'algo raro' });
    expect(res.body.actions).toEqual([{ action: 'not_understood' }]);
  });

  it('an utterance can come back as several actions, in order', async () => {
    const actions = [
      { action: 'pantry', changes: [{ item: 'flat-leaf-parsley', status: 'out', display: 'perejil' }] },
      { action: 'pick', index: 1 },
    ];
    const r = rig({ replies: [reply({ actions })] });
    const res = await post(r.app, '/api/utterance', { context: ctx('choose', { options: OPTIONS.options }), utterance: 'me gusta la primera pero no tengo perejil' });
    expect(res.body.actions).toEqual(actions);
    expect(r.calls[0].output_config.format.schema.required).toEqual(['actions']);
    expect(r.calls[0].max_tokens).toBe(MAX_TOKENS.utterance);
  });

  it('tells the brain which pantry items are guesses, and whether it is the first round', async () => {
    const r = rig({ replies: [reply(OPTIONS)] });
    const context = { ...ctx(), firstRound: true, pantry: [{ item: 'garlic', status: 'plenty', display: 'ajo', assumed: true }, { item: 'ham', status: 'plenty', display: 'jamón' }] };
    await post(r.app, '/api/suggest', { context });
    const user = r.calls[0].messages[0].content as string;
    expect(user).toContain('- garlic: plenty (ajo) [supuesto]');
    expect(user).toContain('- ham: plenty (jamón)\n');
    expect(user).toContain('primera vez: sí');
  });

  it('a recipe can be rewritten with a change, even a sample one', async () => {
    const tinga = { replies: [] as any[] };
    const r = rig(tinga);
    const plain = await post(r.app, '/api/recipe', { context: ctx(), title: 'Tinga de pollo' });
    expect(plain.body.recipe.id).toBe('tinga-de-pollo');
    expect(r.calls).toHaveLength(0);
    const r2 = rig({ replies: [reply(plain.body.recipe)] });
    await post(r2.app, '/api/recipe', { context: ctx('intro'), title: 'Tinga de pollo', tweak: 'sin picante' });
    expect(r2.calls).toHaveLength(1);
    expect(r2.calls[0].messages[0].content).toContain('ajuste: sin picante');
    expect(r2.calls[0].max_tokens).toBe(MAX_TOKENS.recipe);
  });
});

describe('cost controls', () => {
  it('session tokens count the cached prompt at 10%, written or read', () => {
    expect(sessionTokens({ input_tokens: 100, cache_creation_input_tokens: 1000, cache_read_input_tokens: 10000, output_tokens: 50 })).toBe(1250);
    expect(costUsd('claude-haiku-5-5', { input_tokens: 1e6, cache_creation_input_tokens: 0, cache_read_input_tokens: 1e6, output_tokens: 1e6 })).toBeCloseTo(0.61, 6);
    expect(costUsd('claude-sonnet-5-5', { input_tokens: 1e6, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 1e6 })).toBeCloseTo(12, 6);
  });

  it('blocks a session over POIO_SESSION_TOKEN_CAP with no call, serving fixtures', async () => {
    const r = rig({ env: { POIO_SESSION_TOKEN_CAP: '1000' }, replies: [reply(OPTIONS, { input_tokens: 900, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 200 })] });
    await post(r.app, '/api/suggest', { context: ctx() });
    const res = await post(r.app, '/api/suggest', { context: ctx() });
    expect(r.calls).toHaveLength(1);
    expect(res.body.limited).toBe('session');
    expect(res.body.options).toHaveLength(3);
    // Another session still works.
    expect(await r.usage.guard(local('other-session'))).toBeNull();
  });

  it('blocks over the daily budget', async () => {
    const r = rig({ env: { POIO_DAILY_BUDGET_USD: '0.001' }, replies: [reply(OPTIONS, { input_tokens: 20000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 })] });
    await post(r.app, '/api/suggest', { context: ctx() }, 'session-aaaa');
    const res = await post(r.app, '/api/utterance', { context: ctx(), utterance: 'algo' }, 'session-bbbb');
    expect(res.body.limited).toBe('daily');
    expect(r.calls).toHaveLength(1);
  });

  it('blocks over the monthly budget, counting earlier days of the month', async () => {
    let now = new Date('2026-11-02T18:00:00Z');
    const r = rig({ env: { POIO_MONTHLY_BUDGET_USD: '0.002', POIO_DAILY_BUDGET_USD: '3' }, clock: () => now, replies: [reply(OPTIONS, { input_tokens: 25000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 })] });
    await post(r.app, '/api/suggest', { context: ctx() });
    now = new Date('2026-11-04T18:00:00Z');
    expect(await r.usage.guard(local('fresh-session'))).toBe('monthly');
    now = new Date('2026-12-01T18:00:00Z');
    expect(await r.usage.guard(local('fresh-session'))).toBeNull();
  });

  it('limits calls per IP', async () => {
    const r = rig({ env: { POIO_IP_LIMIT: '2' }, replies: [reply(OPTIONS), reply(OPTIONS), reply(OPTIONS)] });
    await post(r.app, '/api/suggest', { context: ctx() });
    await post(r.app, '/api/suggest', { context: ctx() });
    const res = await post(r.app, '/api/suggest', { context: ctx() });
    expect(res.body.limited).toBe('rate');
    expect(r.calls).toHaveLength(2);
  });

  it('the blocked line is the B-C one', () => {
    expect(LIMIT_LINE).toBe('Por hoy llegué a mi límite. Las recetas guardadas siguen aquí.');
  });

  it('runs fake with no key: zero calls', async () => {
    const r = rig({ env: { ANTHROPIC_API_KEY: '' }, replies: [] });
    expect(r.brain.isFake).toBe(true);
    const res = await post(r.app, '/api/suggest', { context: ctx() });
    expect(res.body.fake).toBe(true);
    expect(r.calls).toHaveLength(0);
  });
});
