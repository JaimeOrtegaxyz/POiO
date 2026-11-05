import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALLOWED_FILES, FIXTURE_FILES, NotAllowedError, PROMPT_FILES, readAllowed } from '../server/allowlist';
import { loadConfig } from '../server/config';
import { post, rig } from './helpers';

describe('brain allowlist', () => {
  it('is pinned to exactly the brief §4.2 files', () => {
    expect([...PROMPT_FILES]).toEqual([
      'SKILL.md',
      'VOICE.md',
      'references/style-guide.md',
      'reference/recipe.schema.json',
      'pantry.example.md',
    ]);
    expect([...FIXTURE_FILES]).toEqual([
      'reference/recipes/tinga-de-pollo.json',
      'reference/recipes/pollo-a-la-crema-con-rajas.json',
      'reference/recipes/gochujang-glazed-thighs.json',
    ]);
  });

  it('never lists a personal file', () => {
    const personal = ['pantry.md', 'references/regional-context.md', 'references/equipment.md', 'poionotas.md', 'pantry.json', '.env', 'mockup/.env'];
    for (const p of personal) expect(ALLOWED_FILES).not.toContain(p);
  });

  it('refuses any other path, including traversal', () => {
    const dir = loadConfig({} as NodeJS.ProcessEnv).brainDir;
    for (const p of ['pantry.md', 'references/equipment.md', 'references/regional-context.md', 'poionotas.md', '../SKILL.md', './SKILL.md', 'reference/../pantry.md', '/etc/passwd', 'mockup/.env']) {
      expect(() => readAllowed(dir, p)).toThrow(NotAllowedError);
    }
  });
});

describe('no request can make the server read another path', () => {
  const staticDir = mkdtempSync(join(tmpdir(), 'poio-static-'));
  writeFileSync(join(staticDir, 'index.html'), '<!doctype html><title>POiO</title>');

  const attempts = [
    '/../pantry.md', '/..%2fpantry.md', '/%2e%2e/pantry.md', '/%2e%2e%2f%2e%2e%2fpantry.md', '/..\\pantry.md',
    '/brain/SKILL.md', '/brain/../../pantry.md', '/api/../pantry.md', '/references/equipment.md', '/pantry.md',
    '/api/file?path=pantry.md', '/api/recipe/../../pantry.md', '//etc/passwd',
  ];

  it('static serving and the API never return repo files', async () => {
    const r = rig({ staticDir, replies: [] });
    for (const a of attempts) {
      const res = await r.app.request(a);
      const text = await res.text();
      expect(text).not.toMatch(/\| Item \| Status \|/); // pantry markdown
      expect(text).not.toMatch(/name: poio/); // SKILL.md front matter
      expect([200, 400, 403, 404]).toContain(res.status);
    }
  });

  it('body fields that look like paths are just text', async () => {
    const r = rig({ env: { ANTHROPIC_API_KEY: '' }, replies: [] });
    const res = await post(r.app, '/api/recipe', { context: { screen: { id: '../../pantry.md' } }, title: '../../pantry.md' });
    expect(JSON.stringify(res.body)).not.toMatch(/\| Item \| Status \|/);
  });

  it('requireAccess: localhost passes, others need POIO_ACCESS_CODE', async () => {
    const remote = rig({ ip: '203.0.113.9', replies: [] });
    expect((await remote.app.request('/api/usage')).status).toBe(403);
    const coded = rig({ ip: '203.0.113.9', env: { POIO_ACCESS_CODE: 'pollo-123' }, replies: [] });
    expect((await coded.app.request('/api/usage')).status).toBe(403);
    expect((await coded.app.request('/api/usage', { headers: { 'x-poio-access': 'pollo-123' } })).status).toBe(200);
    expect((await coded.app.request('/api/usage?access=pollo-123')).status).toBe(200);
    const local = rig({ ip: '::1', replies: [] });
    expect((await local.app.request('/api/usage')).status).toBe(200);
  });

  it('the event log accepts only known types and scalar data', async () => {
    const r = rig({ replies: [] });
    expect((await post(r.app, '/api/event', { type: 'rm -rf', deviceId: 'abcdefgh' })).status).toBe(400);
    await post(r.app, '/api/event', { type: 'discard', deviceId: 'abcdefgh-1', variant: 'a', data: { count: 3, name: 'Someone', note: 'free text here', source: 'url' } });
    expect(r.store.data.events[0]).toMatchObject({ type: 'discard', variant: 'a', data: { count: 3, source: 'url' } });
    expect(r.store.data.events[0].data.name).toBeUndefined();
    expect(r.store.data.events[0].data.note).toBeUndefined();
  });
});
