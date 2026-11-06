/**
 * Prep for a later Cloudflare Workers + D1 cutover (docs/CLOUDFLARE.md).
 * Nothing here deploys anything: it pins the parts that must port unchanged.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it } from 'vitest';
import { Auth } from '../server/auth';
import { MOCKUP_DIR } from '../server/config';
import { D1Sql, type D1Like, type D1StatementLike } from '../server/db/d1';
import { SCHEMA_FILE } from '../server/db/sqlite';
import type { SqlValue } from '../server/db/sql';
import { ProfileStates } from '../server/state';
import { UsageTracker } from '../server/usage';

/** A D1-shaped binding over node:sqlite: prepare → bind → run/first/all, all async, results as D1 returns them. */
function d1Shim(): D1Like {
  const db = new DatabaseSync(':memory:');
  const statement = (sql: string, params: SqlValue[] = []): D1StatementLike => ({
    bind: (...values) => statement(sql, values),
    run: async () => {
      const r = db.prepare(sql).run(...params);
      return { meta: { changes: Number(r.changes), last_row_id: Number(r.lastInsertRowid) } };
    },
    first: async <T>() => (db.prepare(sql).get(...params) as T) ?? null,
    all: async <T>() => ({ results: db.prepare(sql).all(...params) as T[] }),
  });
  return { prepare: (sql) => statement(sql) };
}

describe('Cloudflare prep: D1 adapter', () => {
  it('runs the schema and the whole invite → profile → state → ledger flow through D1-shaped calls', async () => {
    const sql = new D1Sql(d1Shim());
    await sql.exec(readFileSync(SCHEMA_FILE, 'utf8'));
    const auth = new Auth(sql, { sessionMs: 86_400_000 });
    const inv = await auth.createInvite('d1', 3_600_000);
    const [a, b] = await Promise.all([auth.redeem(inv.token), auth.redeem(inv.token)]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
    const red = (a ?? b)!;
    expect(await auth.session(red.sessionToken)).toEqual({ profileId: red.profileId });

    const states = new ProfileStates(sql);
    expect(await states.put(red.profileId, { version: 1, deviceId: 'd1-device' })).toBe(1);
    expect(await states.put(red.profileId, { version: 1, deviceId: 'd1-device', onboarded: true })).toBe(2);
    expect((await states.get(red.profileId))?.state).toMatchObject({ onboarded: true });

    const usage = new UsageTracker(sql, { sessionTokenCap: 60000, dailyBudgetUsd: 3, monthlyBudgetUsd: 100, timeZone: 'America/Mexico_City' });
    const who = { profileId: red.profileId, session: 'd1-session-1', profileDailyUsd: 0.5, profileMonthlyUsd: 5 };
    const hold = await usage.reserve(who, 'suggest', 'claude-haiku-5-5', { usd: 0.003, tokens: 23000 });
    expect(hold.ok).toBe(true);
    if (!hold.ok) return;
    await usage.settle(hold.id, who, 'suggest', [{ model: 'claude-haiku-5-5', usage: { input_tokens: 200, cache_creation_input_tokens: 0, cache_read_input_tokens: 9000, output_tokens: 80 } }]);
    expect((await usage.totals(who)).sessionTokens).toBe(200 + 80 + 900);
    expect(await usage.recent(5, red.profileId)).toHaveLength(1);

    await auth.revokeInvite(inv.id);
    expect(await auth.session(red.sessionToken)).toBeNull();
  });
});

describe('Cloudflare prep: Workers-safe modules', () => {
  // These carry auth, budgets, state and the database seam. They must not
  // reach for Node built-ins, so a Worker can import them as they are.
  const PORTABLE = ['server/auth.ts', 'server/usage.ts', 'server/state.ts', 'server/db/sql.ts', 'server/db/d1.ts', 'server/pricing.ts', 'server/pages.ts', 'server/feedback.ts'];

  for (const f of PORTABLE) {
    it(`${f} imports no node: modules and no Node-only packages`, () => {
      const src = readFileSync(join(MOCKUP_DIR, f), 'utf8');
      expect(src).not.toMatch(/from ['"]node:/);
      expect(src).not.toMatch(/from ['"](fs|path|os|crypto|url)['"]/);
      expect(src).not.toMatch(/@hono\/node-server/);
      expect(src).not.toMatch(/\bprocess\.(env|argv|cwd|exit)/);
    });
  }

  it('the D1 migration file is the same schema the Node server runs', () => {
    const migration = readFileSync(join(MOCKUP_DIR, 'cloudflare/migrations/0001_init.sql'), 'utf8');
    expect(migration).toBe(readFileSync(SCHEMA_FILE, 'utf8'));
  });
});
