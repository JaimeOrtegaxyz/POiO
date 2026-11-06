import { describe, expect, it } from 'vitest';
import { sha256 } from '../server/auth';
import { call, ctx, invited, reply, rig } from './helpers';

const TUNNEL = { 'cf-connecting-ip': '203.0.113.7' };
const OPTIONS = { options: [
  { title: 'Pollo al chipotle con papas', minutes: 35, difficulty: 'fácil' },
  { title: 'Tacos de pollo con nopales', minutes: 25, difficulty: 'fácil' },
  { title: 'Pollo en mole rápido', minutes: 40, difficulty: 'media' },
], reason: '' };

describe('invites', () => {
  it('stores only hashes: no raw invite or session token at rest', async () => {
    const r = rig();
    const inv = await r.auth.createInvite('Angie', 3_600_000);
    const { cookie } = await invited(r);
    const dump = JSON.stringify([
      await r.sql.all('SELECT * FROM invites'),
      await r.sql.all('SELECT * FROM sessions'),
    ]);
    expect(dump).not.toContain(inv.token);
    expect(dump).not.toContain(cookie.split('=')[1]);
    expect(dump).toContain(await sha256(inv.token));
  });

  it('GET shows the invite and never spends it (chat-app link previews fetch URLs)', async () => {
    const r = rig();
    const inv = await r.auth.createInvite('x', 3_600_000);
    for (let i = 0; i < 3; i++) {
      const res = await r.app.request(`/invite/${inv.token}`);
      expect(res.status).toBe(200);
      expect(await res.text()).toContain('Entrar al demo');
      expect(res.headers.get('referrer-policy')).toBe('no-referrer');
      expect(res.headers.get('cache-control')).toBe('no-store');
      expect(res.headers.get('set-cookie')).toBeNull();
    }
    expect(await r.auth.inviteOpen(inv.token)).toBe(true);
  });

  it('POST redeems once: HttpOnly, Secure, SameSite=Lax cookie, 303 to a token-free /demo', async () => {
    const r = rig();
    const inv = await r.auth.createInvite('x', 3_600_000);
    const res = await r.app.request(`https://poio.example/invite/${inv.token}`, { method: 'POST' });
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('/demo');
    expect(res.headers.get('referrer-policy')).toBe('no-referrer');
    const sc = res.headers.get('set-cookie') ?? '';
    expect(sc).toMatch(/^poio_sid=[A-Za-z0-9_-]{43};/);
    expect(sc).toMatch(/HttpOnly/);
    expect(sc).toMatch(/Secure/);
    expect(sc).toMatch(/SameSite=Lax/);
    expect(sc).toMatch(/Path=\//);
    // Second use: gone.
    const again = await r.app.request(`/invite/${inv.token}`, { method: 'POST' });
    expect(again.status).toBe(410);
    expect(again.headers.get('set-cookie')).toBeNull();
  });

  it('plain-http localhost gets a cookie without Secure (Safari drops Secure cookies on http://localhost)', async () => {
    const r = rig();
    const inv = await r.auth.createInvite('x', 3_600_000);
    const res = await r.app.request(`http://localhost:8787/invite/${inv.token}`, { method: 'POST', headers: { host: 'localhost:8787' } });
    expect(res.headers.get('set-cookie')).not.toMatch(/Secure/);
    // The same host name through the tunnel is still Secure.
    const inv2 = await r.auth.createInvite('x', 3_600_000);
    const res2 = await r.app.request(`http://localhost:8787/invite/${inv2.token}`, { method: 'POST', headers: { host: 'localhost:8787', ...TUNNEL } });
    expect(res2.headers.get('set-cookie')).toMatch(/Secure/);
  });

  it('two racing redeems of one invite: exactly one profile', async () => {
    const r = rig();
    const inv = await r.auth.createInvite('x', 3_600_000);
    const results = await Promise.all(Array.from({ length: 8 }, () => r.auth.redeem(inv.token)));
    expect(results.filter(Boolean)).toHaveLength(1);
    expect((await r.sql.all('SELECT * FROM profiles'))).toHaveLength(1);
  });

  it('expired, revoked and malformed invites never redeem', async () => {
    let now = Date.parse('2026-11-05T12:00:00Z');
    const r = rig({ clock: () => new Date(now) });
    const a = await r.auth.createInvite('a', 60_000);
    now += 61_000;
    expect(await r.auth.redeem(a.token)).toBeNull();
    const b = await r.auth.createInvite('b', 60_000);
    await r.auth.revokeInvite(b.id);
    expect(await r.auth.redeem(b.token)).toBeNull();
    expect(await r.auth.redeem('short')).toBeNull();
    expect(await r.auth.redeem(`${a.token.slice(0, 42)}!`)).toBeNull();
    const page = await r.app.request(`/invite/${b.token}`);
    expect(page.status).toBe(410);
  });

  it('revoking an invite kills the sessions minted from it', async () => {
    const r = rig({ ip: '127.0.0.1' });
    const { cookie } = await invited(r);
    expect((await call(r.app, '/api/me', { cookie, headers: TUNNEL })).body).toMatchObject({ mode: 'profile' });
    const [inv] = await r.auth.listInvites();
    await r.auth.revokeInvite(inv.id);
    expect((await call(r.app, '/api/me', { cookie, headers: TUNNEL })).status).toBe(403);
    expect((await r.auth.listInvites())[0].status).toBe('revoked');
  });

  it('a browser that already redeemed goes straight to /demo from the same link', async () => {
    const r = rig();
    const inv = await r.auth.createInvite('x', 3_600_000);
    const res = await r.app.request(`/invite/${inv.token}`, { method: 'POST' });
    const cookie = (res.headers.get('set-cookie') ?? '').split(';')[0];
    const back = await r.app.request(`/invite/${inv.token}`, { headers: { cookie } });
    expect(back.status).toBe(303);
    expect(back.headers.get('location')).toBe('/demo');
  });
});

describe('access: invite profiles, this machine, the access code', () => {
  it('through the tunnel (proxied loopback) there is no free pass: cookie or code only', async () => {
    const r = rig({ env: { POIO_ACCESS_CODE: 'kitchen-1' }, ip: '127.0.0.1' });
    expect((await call(r.app, '/api/me')).body).toEqual({ mode: 'local' }); // this machine
    expect((await call(r.app, '/api/me', { headers: TUNNEL })).status).toBe(403);
    expect((await call(r.app, '/api/me', { headers: { 'x-forwarded-for': '198.51.100.2' } })).status).toBe(403);
    expect((await call(r.app, '/api/me?access=kitchen-1', { headers: TUNNEL })).body).toEqual({ mode: 'local' });
    expect((await call(r.app, '/api/me', { headers: { ...TUNNEL, 'x-poio-access': 'kitchen-1' } })).body).toEqual({ mode: 'local' });
    const { cookie } = await invited(r);
    expect((await call(r.app, '/api/me', { cookie, headers: TUNNEL })).body).toMatchObject({ mode: 'profile' });
  });

  it('no brain call without access, ever', async () => {
    const r = rig({ ip: '198.51.100.9', replies: [reply(OPTIONS)] });
    const res = await call(r.app, '/api/suggest', { method: 'POST', body: { context: ctx() } });
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ invite: true });
    expect(r.calls).toHaveLength(0);
  });

  it('a forged or garbage cookie is just no access', async () => {
    const r = rig({ ip: '198.51.100.9' });
    for (const cookie of ['poio_sid=AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA', 'poio_sid=../../etc', 'poio_sid=']) {
      expect((await call(r.app, '/api/me', { cookie })).status).toBe(403);
    }
  });
});

describe('profile isolation', () => {
  it('two profiles never see each other: state, reset, usage, session ids', async () => {
    const r = rig({ ip: '198.51.100.9', replies: [reply(OPTIONS), reply(OPTIONS)] });
    const a = await invited(r, 'a');
    const b = await invited(r, 'b');
    expect(a.profileId).not.toBe(b.profileId);

    const stateA = { version: 1, deviceId: 'dev-aaaaaaaa', pantry: { eggs: { status: 'plenty', at: 1 } } };
    const stateB = { version: 1, deviceId: 'dev-bbbbbbbb', pantry: {} };
    expect((await call(r.app, '/api/state', { method: 'PUT', cookie: a.cookie, body: { state: stateA } })).body.ok).toBe(true);
    expect((await call(r.app, '/api/state', { method: 'PUT', cookie: b.cookie, body: { state: stateB } })).body.ok).toBe(true);
    expect((await call(r.app, '/api/state', { cookie: a.cookie })).body.state).toEqual(stateA);
    expect((await call(r.app, '/api/state', { cookie: b.cookie })).body.state).toEqual(stateB);

    // Reset clears only the current profile.
    await call(r.app, '/api/state', { method: 'DELETE', cookie: a.cookie });
    expect((await call(r.app, '/api/state', { cookie: a.cookie })).body.state).toBeNull();
    expect((await call(r.app, '/api/state', { cookie: b.cookie })).body.state).toEqual(stateB);

    // Usage: the same app-session id in two profiles is two sessions, each with its own spend.
    await call(r.app, '/api/suggest', { method: 'POST', cookie: a.cookie, session: 'same-session-id', body: { context: ctx() } });
    const ta = await r.usage.totals({ profileId: a.profileId, session: 'same-session-id' });
    const tb = await r.usage.totals({ profileId: b.profileId, session: 'same-session-id' });
    expect(ta.sessionTokens).toBeGreaterThan(0);
    expect(tb.sessionTokens).toBe(0);
    expect(ta.profileDayUsd).toBeGreaterThan(0);
    expect(tb.profileDayUsd).toBe(0);
  });

  it('invitees never see spend or token numbers; local mode does', async () => {
    const r = rig({ ip: '127.0.0.1' });
    const a = await invited(r);
    const res = await call(r.app, '/api/usage', { cookie: a.cookie, headers: TUNNEL });
    expect(res.status).toBe(403);
    expect(JSON.stringify(res.body)).not.toMatch(/usd|tokens/i);
    expect((await call(r.app, '/api/usage')).body.day).toBeDefined();
  });

  it('local mode keeps state in the browser: the server stores none', async () => {
    const r = rig({ ip: '127.0.0.1' });
    expect((await call(r.app, '/api/state')).body).toEqual({ mode: 'local' });
    expect((await call(r.app, '/api/state', { method: 'PUT', body: { state: { version: 1, deviceId: 'x' } } })).status).toBe(409);
  });

  it('rejects state that is not a device state', async () => {
    const r = rig({ ip: '198.51.100.9' });
    const a = await invited(r);
    for (const state of [null, [], 'x', { version: 2, deviceId: 'x' }, { version: 1 }]) {
      expect((await call(r.app, '/api/state', { method: 'PUT', cookie: a.cookie, body: { state } })).status).toBe(400);
    }
  });
});

describe('budgets under concurrency (atomic holds)', () => {
  /** A scripted reply that waits until released, so calls pile up in flight. */
  function gated() {
    let open: () => void = () => {};
    const gate = new Promise<void>((res) => { open = res; });
    const usage = { input_tokens: 400, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 100 };
    const fn = async () => { await gate; return reply(OPTIONS, usage)(); };
    return { fn, open: () => open() };
  }

  it('parallel tabs cannot double-spend the session cap', async () => {
    const g = gated();
    // Cap below two in-flight worst-case estimates: only one call may be in flight.
    const r = rig({ env: { POIO_SESSION_TOKEN_CAP: '30000', POIO_IP_LIMIT: '100' }, ip: '127.0.0.1', replies: Array.from({ length: 10 }, () => g.fn) });
    expect(r.brain.estimate('claude-haiku-5-5', 300).tokens).toBeGreaterThan(15000);
    const tabs = Array.from({ length: 10 }, () => call(r.app, '/api/suggest', { method: 'POST', session: 'one-session-xyz', body: { context: ctx() } }));
    await new Promise((res) => setTimeout(res, 20));
    g.open();
    const results = await Promise.all(tabs);
    const live = results.filter((x) => !x.body.limited);
    expect(r.calls.length).toBe(live.length);
    expect(r.calls.length).toBeLessThanOrEqual(2);
    expect(results.filter((x) => x.body.limited === 'session').length).toBe(10 - live.length);
    // Holds are gone once the calls settle: only actual usage stays.
    expect(await r.sql.all("SELECT * FROM ledger WHERE kind = 'hold'")).toHaveLength(0);
  });

  it('parallel tabs cannot double-spend the daily budget either', async () => {
    const g = gated();
    const r = rig({ env: { POIO_DAILY_BUDGET_USD: '0.004', POIO_IP_LIMIT: '100' }, ip: '127.0.0.1', replies: Array.from({ length: 12 }, () => g.fn) });
    const est = r.brain.estimate('claude-haiku-5-5', 300).usd;
    const tabs = Array.from({ length: 12 }, (_, i) => call(r.app, '/api/suggest', { method: 'POST', session: `session-${i}-abcdef`, body: { context: ctx() } }));
    await new Promise((res) => setTimeout(res, 20));
    g.open();
    const results = await Promise.all(tabs);
    expect(r.calls.length).toBe(Math.ceil(0.004 / est));
    expect(results.filter((x) => x.body.limited === 'daily').length).toBe(12 - r.calls.length);
  });

  it('one invited profile hits its own cap; the others keep going', async () => {
    const usage = { input_tokens: 20000, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 0 }; // $0.002 each
    const r = rig({ env: { POIO_PROFILE_DAILY_USD: '0.003' }, ip: '198.51.100.9', replies: Array.from({ length: 5 }, () => reply(OPTIONS, usage)) });
    const a = await invited(r, 'a');
    const b = await invited(r, 'b');
    const post = (cookie: string) => call(r.app, '/api/suggest', { method: 'POST', cookie, body: { context: ctx() } });
    expect((await post(a.cookie)).body.limited).toBeUndefined();
    expect((await post(a.cookie)).body.limited).toBeUndefined();
    expect((await post(a.cookie)).body.limited).toBe('profile');
    expect((await post(b.cookie)).body.limited).toBeUndefined();
    expect(r.calls).toHaveLength(3);
  });

  it('a call that throws releases its hold', async () => {
    const r = rig({ ip: '127.0.0.1', replies: [() => { throw new Error('network'); }, () => { throw new Error('network'); }] });
    await call(r.app, '/api/suggest', { method: 'POST', body: { context: ctx() } });
    expect(await r.sql.all("SELECT * FROM ledger WHERE kind = 'hold'")).toHaveLength(0);
  });

  it('a crashed call\'s hold lapses on its own', async () => {
    let now = Date.parse('2026-11-05T18:00:00Z');
    const r = rig({ env: { POIO_SESSION_TOKEN_CAP: '30000' }, clock: () => new Date(now), replies: [reply(OPTIONS)] });
    const who = { profileId: 'local', session: 'crash-session-1', profileDailyUsd: null, profileMonthlyUsd: null };
    const h = await r.usage.reserve(who, 'suggest', 'claude-haiku-5-5', { usd: 0.01, tokens: 31000 });
    expect(h.ok).toBe(true);
    expect(await r.usage.guard(who)).toBe('session');
    now += 4 * 60 * 1000;
    expect(await r.usage.guard(who)).toBeNull();
  });

  it('usage.jsonl rows from before the ledger count toward today and the month, once', async () => {
    const { MemoryStore } = await import('../server/storage');
    const { SqliteSql } = await import('../server/db/sqlite');
    const { UsageTracker } = await import('../server/usage');
    const { loadConfig } = await import('../server/config');
    const store = new MemoryStore();
    store.data.usage.push({ time: '2026-11-05T06:00:11.077Z', session: 's-1', endpoint: 'utterance', model: 'claude-haiku-5-5', input_tokens: 237, cache_creation_input_tokens: 20736, cache_read_input_tokens: 0, output_tokens: 54, usd: 0.0026427 });
    const sql = new SqliteSql(':memory:').migrateSync();
    const clock = () => new Date('2026-11-05T20:00:00Z');
    const t1 = new UsageTracker(sql, loadConfig({} as NodeJS.ProcessEnv), clock, store);
    await t1.ready();
    const t2 = new UsageTracker(sql, loadConfig({} as NodeJS.ProcessEnv), clock, store); // a restart
    await t2.ready();
    const t = await t2.totals({ profileId: 'local', session: 's-1' });
    expect(t.dayUsd).toBeCloseTo(0.0026427, 8);
    expect(t.sessionTokens).toBe(237 + 20736 + 54);
  });
});

describe('pages', () => {
  it('the landing is public and static; old /?access= links still open the device', async () => {
    const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const { join } = await import('node:path');
    const dir = mkdtempSync(join(tmpdir(), 'poio-static-'));
    writeFileSync(join(dir, 'index.html'), '<h1>landing</h1>');
    mkdirSync(join(dir, 'demo'));
    writeFileSync(join(dir, 'demo', 'index.html'), '<h1>device</h1>');
    const r = rig({ staticDir: dir, ip: '198.51.100.9' });
    expect(await (await r.app.request('/')).text()).toContain('landing');
    expect(await (await r.app.request('/demo')).text()).toContain('device');
    expect(await (await r.app.request('/demo/')).text()).toContain('device');
    const old = await r.app.request('/?access=kitchen-1&debug=1');
    expect(old.status).toBe(302);
    expect(old.headers.get('location')).toBe('/demo?access=kitchen-1&debug=1');
    expect((await r.app.request('/nope')).status).toBe(404);
  });
});

describe('feedback', () => {
  it('stores what an invitee sends, with where they were, under their invite label', async () => {
    const r = rig({ ip: '198.51.100.9' });
    const a = await invited(r, 'Angie');
    const res = await call(r.app, '/api/feedback', { method: 'POST', cookie: a.cookie, body: { text: '  La estrella  se siente   bien. ', screen: 'cook', variant: 'b' } });
    expect(res.body).toEqual({ ok: true });
    const [row] = await r.feedback.list();
    expect(row).toMatchObject({ text: 'La estrella se siente bien.', screen: 'cook', variant: 'b', label: 'Angie', profile_id: a.profileId });
  });

  it('rejects empty or overlong text, odd fields, floods, and anyone without access', async () => {
    const r = rig({ ip: '198.51.100.9' });
    const a = await invited(r);
    for (const text of ['', '   ', 'x'.repeat(1001), 42]) {
      expect((await call(r.app, '/api/feedback', { method: 'POST', cookie: a.cookie, body: { text } })).status).toBe(400);
    }
    await call(r.app, '/api/feedback', { method: 'POST', cookie: a.cookie, body: { text: 'ok', screen: '../etc', variant: 'zzz' } });
    expect((await r.feedback.list())[0]).toMatchObject({ screen: '', variant: '' });
    const statuses = [];
    for (let i = 0; i < 9; i++) statuses.push((await call(r.app, '/api/feedback', { method: 'POST', cookie: a.cookie, body: { text: `n${i}` } })).status);
    expect(statuses).toContain(429);
    expect((await call(r.app, '/api/feedback', { method: 'POST', body: { text: 'hola' } })).status).toBe(403);
  });
});
