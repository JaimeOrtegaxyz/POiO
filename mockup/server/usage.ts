/**
 * Usage log and budget guard. Every model call appends to usage.jsonl; the
 * guard runs server-side before every call and blocks once the session cap,
 * the daily budget or the monthly budget is reached. It only sees this app's
 * spend, so the Console workspace limit stays the hard backstop.
 */
import type { LimitReason, UsageRecord } from '../shared/types';
import { costUsd, sessionTokens, type TokenUsage } from './pricing';
import type { Store } from './storage';

export interface GuardLimits {
  sessionTokenCap: number;
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  timeZone: string;
}

export type Clock = () => Date;

export class UsageTracker {
  private records: UsageRecord[] = [];
  private loaded: Promise<void>;

  constructor(private store: Store, private limits: GuardLimits, private clock: Clock = () => new Date()) {
    this.loaded = store.readAll('usage').then((r) => { this.records = r as UsageRecord[]; });
  }

  ready(): Promise<void> { return this.loaded; }

  private dayKey(d: Date): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: this.limits.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }

  async record(session: string, endpoint: string, model: string, u: TokenUsage): Promise<UsageRecord> {
    await this.loaded;
    const rec: UsageRecord = {
      time: this.clock().toISOString(),
      session,
      endpoint,
      model,
      input_tokens: u.input_tokens ?? 0,
      cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
      output_tokens: u.output_tokens ?? 0,
      usd: 0,
    };
    rec.usd = costUsd(model, rec);
    this.records.push(rec);
    await this.store.append('usage', rec);
    return rec;
  }

  totals(session: string): { sessionTokens: number; dayUsd: number; monthUsd: number } {
    const now = this.clock();
    const today = this.dayKey(now);
    const month = today.slice(0, 7);
    let s = 0, day = 0, mon = 0;
    for (const r of this.records) {
      const k = this.dayKey(new Date(r.time));
      if (r.session === session) s += sessionTokens(r);
      if (k === today) day += r.usd;
      if (k.slice(0, 7) === month) mon += r.usd;
    }
    return { sessionTokens: Math.round(s), dayUsd: day, monthUsd: mon };
  }

  /** null = OK to call; otherwise why not. */
  async guard(session: string): Promise<LimitReason | null> {
    await this.loaded;
    const t = this.totals(session);
    if (t.monthUsd >= this.limits.monthlyBudgetUsd) return 'monthly';
    if (t.dayUsd >= this.limits.dailyBudgetUsd) return 'daily';
    if (t.sessionTokens >= this.limits.sessionTokenCap) return 'session';
    return null;
  }

  recent(n = 10): UsageRecord[] {
    return this.records.slice(-n).reverse();
  }
}

/** Per-IP limit on model calls (~30 per 10 minutes by default). */
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
