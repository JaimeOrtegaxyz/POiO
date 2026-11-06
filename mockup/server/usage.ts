/**
 * Spend ledger and budget guard, in the database (server/db/schema.sql).
 *
 * Before a model call the brain asks for a hold: one conditional INSERT that
 * only lands if every cap still has room, counting finished calls plus holds
 * still in flight at their worst-case estimate. Because the check and the
 * insert are a single statement, two tabs (or two processes) can't both slip
 * under the same cap. After the call the hold is swapped for the actual usage;
 * on an error it's released; if the process dies, it lapses at hold_until.
 *
 * Caps: global $/day and $/month, tokens per app session, and $/day and
 * $/month per invited profile. A cap is "reached" once committed + in-flight
 * spend is at or over it, so overshoot is bounded by the calls already in
 * flight (the same rule as before, now safe under concurrency).
 *
 * Every finished call is also appended to data/usage.jsonl (the audit log).
 * The guard only sees this app's spend, so the Console workspace limit stays
 * the hard backstop. No node: imports here.
 */
import type { LimitReason, UsageRecord } from '../shared/types';
import type { Sql } from './db/sql';
import { costUsd, sessionTokens, type TokenUsage } from './pricing';
import type { Store } from './storage';

export interface GuardLimits {
  sessionTokenCap: number;
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  timeZone: string;
}

export type Clock = () => Date;

/** Who is spending: the profile ('local' for localhost / the access code), the app session, and that profile's own caps. */
export interface Spender {
  profileId: string;
  session: string;
  profileDailyUsd: number | null;
  profileMonthlyUsd: number | null;
}

export interface Estimate { usd: number; tokens: number }

export type Hold = { ok: true; id: number } | { ok: false; reason: LimitReason };

export interface Totals {
  sessionTokens: number;
  dayUsd: number;
  monthUsd: number;
  profileDayUsd: number;
  profileMonthUsd: number;
}

/** A hold outlives any real call (two attempts of ~30 s at most). */
export const HOLD_MS = 3 * 60 * 1000;
const NO_CAP = 1e15;

export class UsageTracker {
  private loaded: Promise<void>;

  constructor(private sql: Sql, private limits: GuardLimits, private clock: Clock = () => new Date(), private log?: Store) {
    this.loaded = log ? this.importLog(log) : Promise.resolve();
  }

  ready(): Promise<void> { return this.loaded; }

  private keys(d: Date): { day: string; month: string } {
    const day = new Intl.DateTimeFormat('en-CA', { timeZone: this.limits.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
    return { day, month: day.slice(0, 7) };
  }

  /**
   * A record's identity, so re-importing usage.jsonl at every start never
   * double-counts. New records carry it as `key`; older lines get one from
   * their fields.
   */
  private static sourceKey(r: Pick<UsageRecord, 'time' | 'session' | 'endpoint' | 'input_tokens' | 'output_tokens'> & { key?: string }): string {
    return typeof r.key === 'string' ? r.key : `${r.time}|${r.session}|${r.endpoint}|${r.input_tokens}|${r.output_tokens}`;
  }

  /** Bring usage.jsonl rows (including ones written before the ledger existed) into the ledger. */
  private async importLog(log: Store): Promise<void> {
    for (const r of (await log.readAll('usage')) as (UsageRecord & { profile?: string; key?: string })[]) {
      if (!r?.time || typeof r.usd !== 'number') continue;
      const { day, month } = this.keys(new Date(r.time));
      await this.sql.run(
        `INSERT OR IGNORE INTO ledger (kind, time, day, month, profile_id, session, endpoint, model,
           input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens, usd, tokens, source_key)
         VALUES ('call', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [r.time, day, month, r.profile ?? 'local', r.session ?? 'anon', r.endpoint ?? '', r.model ?? '',
          r.input_tokens ?? 0, r.cache_creation_input_tokens ?? 0, r.cache_read_input_tokens ?? 0, r.output_tokens ?? 0,
          r.usd, sessionTokens(r), UsageTracker.sourceKey(r)],
      );
    }
  }

  /** Reserve room for one call, atomically, or say which cap is in the way. */
  async reserve(who: Spender, endpoint: string, model: string, est: Estimate): Promise<Hold> {
    await this.loaded;
    const now = this.clock();
    const t = now.getTime();
    const { day, month } = this.keys(now);
    const live = '(kind = \'call\' OR hold_until > ?)';
    const r = await this.sql.run(
      `INSERT INTO ledger (kind, time, day, month, profile_id, session, endpoint, model, usd, tokens, hold_until)
       SELECT 'hold', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       WHERE (SELECT COALESCE(SUM(usd), 0) FROM ledger WHERE month = ? AND ${live}) < ?
         AND (SELECT COALESCE(SUM(usd), 0) FROM ledger WHERE day = ? AND ${live}) < ?
         AND (SELECT COALESCE(SUM(usd), 0) FROM ledger WHERE profile_id = ? AND day = ? AND ${live}) < ?
         AND (SELECT COALESCE(SUM(usd), 0) FROM ledger WHERE profile_id = ? AND month = ? AND ${live}) < ?
         AND (SELECT COALESCE(SUM(tokens), 0) FROM ledger WHERE profile_id = ? AND session = ? AND ${live}) < ?`,
      [
        now.toISOString(), day, month, who.profileId, who.session, endpoint, model, est.usd, est.tokens, t + HOLD_MS,
        month, t, this.limits.monthlyBudgetUsd,
        day, t, this.limits.dailyBudgetUsd,
        who.profileId, day, t, who.profileDailyUsd ?? NO_CAP,
        who.profileId, month, t, who.profileMonthlyUsd ?? NO_CAP,
        who.profileId, who.session, t, this.limits.sessionTokenCap,
      ],
    );
    if (r.changes === 1 && r.lastId != null) return { ok: true, id: r.lastId };
    return { ok: false, reason: (await this.guard(who)) ?? 'daily' };
  }

  /** Swap a hold for what the call actually used (one row per attempt). The hold goes last, so the ledger never under-counts. */
  async settle(holdId: number, who: Spender, endpoint: string, usages: { model: string; usage: Partial<TokenUsage> }[]): Promise<UsageRecord[]> {
    const out: UsageRecord[] = [];
    for (const u of usages) out.push(await this.record(who, endpoint, u.model, u.usage));
    await this.release(holdId);
    return out;
  }

  async release(holdId: number): Promise<void> {
    await this.sql.run('DELETE FROM ledger WHERE id = ? AND kind = \'hold\'', [holdId]);
  }

  /** One finished call: into the ledger and the audit log. */
  async record(who: Pick<Spender, 'profileId' | 'session'>, endpoint: string, model: string, u: Partial<TokenUsage>): Promise<UsageRecord> {
    await this.loaded;
    const now = this.clock();
    const rec: UsageRecord = {
      time: now.toISOString(),
      session: who.session,
      endpoint,
      model,
      input_tokens: u.input_tokens ?? 0,
      cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      usd: 0,
    };
    rec.usd = costUsd(model, rec);
    const key = `${rec.time}|${crypto.randomUUID()}`;
    const { day, month } = this.keys(now);
    await this.sql.run(
      `INSERT INTO ledger (kind, time, day, month, profile_id, session, endpoint, model,
         input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens, usd, tokens, source_key)
       VALUES ('call', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [rec.time, day, month, who.profileId, who.session, endpoint, model, rec.input_tokens, rec.cache_creation_input_tokens,
        rec.cache_read_input_tokens, rec.output_tokens, rec.usd, sessionTokens(rec), key],
    );
    await this.log?.append('usage', { ...rec, profile: who.profileId, key });
    return rec;
  }

  /** Spend so far; `inFlight` also counts live holds (what the guard sees). */
  async totals(who: Pick<Spender, 'profileId' | 'session'>, inFlight = false): Promise<Totals> {
    await this.loaded;
    const now = this.clock();
    const { day, month } = this.keys(now);
    const live = inFlight ? '(kind = \'call\' OR hold_until > ?)' : '(kind = \'call\' AND ? IS NOT NULL)';
    const t = now.getTime();
    const row = await this.sql.get<Record<string, number>>(
      `SELECT
         (SELECT COALESCE(SUM(tokens), 0) FROM ledger WHERE profile_id = ? AND session = ? AND ${live}) AS s,
         (SELECT COALESCE(SUM(usd), 0) FROM ledger WHERE day = ? AND ${live}) AS d,
         (SELECT COALESCE(SUM(usd), 0) FROM ledger WHERE month = ? AND ${live}) AS m,
         (SELECT COALESCE(SUM(usd), 0) FROM ledger WHERE profile_id = ? AND day = ? AND ${live}) AS pd,
         (SELECT COALESCE(SUM(usd), 0) FROM ledger WHERE profile_id = ? AND month = ? AND ${live}) AS pm`,
      [who.profileId, who.session, t, day, t, month, t, who.profileId, day, t, who.profileId, month, t],
    );
    return {
      sessionTokens: Math.round(row?.s ?? 0),
      dayUsd: row?.d ?? 0,
      monthUsd: row?.m ?? 0,
      profileDayUsd: row?.pd ?? 0,
      profileMonthUsd: row?.pm ?? 0,
    };
  }

  /** null = OK to call; otherwise which cap is reached (in-flight holds count). */
  async guard(who: Spender): Promise<LimitReason | null> {
    const t = await this.totals(who, true);
    if (t.monthUsd >= this.limits.monthlyBudgetUsd) return 'monthly';
    if (t.dayUsd >= this.limits.dailyBudgetUsd) return 'daily';
    if (who.profileMonthlyUsd != null && t.profileMonthUsd >= who.profileMonthlyUsd) return 'profile';
    if (who.profileDailyUsd != null && t.profileDayUsd >= who.profileDailyUsd) return 'profile';
    if (t.sessionTokens >= this.limits.sessionTokenCap) return 'session';
    return null;
  }

  /** Latest finished calls, newest first; one profile's only, when given. */
  async recent(n = 10, profileId?: string): Promise<UsageRecord[]> {
    await this.loaded;
    const cols = 'time, session, endpoint, model, input_tokens, cache_creation_input_tokens, cache_read_input_tokens, output_tokens, usd';
    return profileId
      ? this.sql.all<UsageRecord>(`SELECT ${cols} FROM ledger WHERE kind = 'call' AND profile_id = ? ORDER BY id DESC LIMIT ?`, [profileId, n])
      : this.sql.all<UsageRecord>(`SELECT ${cols} FROM ledger WHERE kind = 'call' ORDER BY id DESC LIMIT ?`, [n]);
  }
}

/** Per-IP limit on model calls (~30 per 10 minutes by default). In memory, one per server process. */
export class IpLimiter {
  private hits = new Map<string, number[]>();
  constructor(private limit: number, private windowMs: number, private clock: Clock = () => new Date()) {}

  /** Records the hit and returns true if under the limit. */
  allow(ip: string): boolean {
    const now = this.clock().getTime();
    const list = (this.hits.get(ip) ?? []).filter((t) => now - t < this.windowMs);
    if (list.length >= this.limit) { this.hits.set(ip, list); return false; }
    list.push(now);
    this.hits.set(ip, list);
    return true;
  }
}
