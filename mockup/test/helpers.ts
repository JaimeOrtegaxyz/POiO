import { loadBrainFiles } from '../server/allowlist';
import { createApp } from '../server/app';
import { Auth } from '../server/auth';
import type { MessagesClient } from '../server/brain/real';
import { BrainService } from '../server/brain/service';
import { loadConfig, type Config } from '../server/config';
import { buildStaticPrefix, loadAdapter } from '../server/prompt';
import { SqliteSql } from '../server/db/sqlite';
import { FeedbackLog } from '../server/feedback';
import { ProfileStates } from '../server/state';
import { MemoryStore } from '../server/storage';
import { IpLimiter, UsageTracker, type Clock, type Spender } from '../server/usage';

export const files = loadBrainFiles(loadConfig({} as NodeJS.ProcessEnv).brainDir);
export const prefix = buildStaticPrefix(files, loadAdapter());

export function ctx(screen = 'choose', contents?: unknown) {
  return { now: '2026-11-04T19:30:00.000Z', servings: 2, poionotas: [], pantry: [], recentDiscards: [], screen: { id: screen, contents } };
}

export interface Rig {
  config: Config;
  store: MemoryStore;
  sql: SqliteSql;
  usage: UsageTracker;
  auth: Auth;
  states: ProfileStates;
  feedback: FeedbackLog;
  brain: BrainService;
  app: ReturnType<typeof createApp>;
  calls: any[];
}

/** The local spender (localhost / access code) for an app session. */
export const local = (session: string): Spender => ({ profileId: 'local', session, profileDailyUsd: null, profileMonthlyUsd: null });

/**
 * A server with a scripted fake Anthropic client (never the network) and an
 * in-memory database. A reply may be async (to hold calls in flight).
 */
export function rig(opts: { env?: Record<string, string>; replies?: ((params: any) => any)[]; clock?: Clock; ip?: string; staticDir?: string } = {}): Rig {
  const config = { ...loadConfig({ ANTHROPIC_API_KEY: 'test-key-not-real', ...opts.env } as NodeJS.ProcessEnv), staticDir: opts.staticDir };
  const store = new MemoryStore();
  const sql = new SqliteSql(':memory:').migrateSync();
  const usage = new UsageTracker(sql, config, opts.clock, store);
  const auth = new Auth(sql, { sessionMs: config.profileSessionMs, now: opts.clock ? () => opts.clock!().getTime() : undefined });
  const states = new ProfileStates(sql);
  const feedback = new FeedbackLog(sql);
  const calls: any[] = [];
  const replies = [...(opts.replies ?? [])];
  const client: MessagesClient = {
    messages: {
      async create(params: any) {
        calls.push(params);
        const next = replies.shift();
        if (!next) throw new Error('no scripted reply');
        return next(params);
      },
    },
  };
  const limiter = new IpLimiter(config.ipLimit, config.ipWindowMs, opts.clock);
  const brain = new BrainService({ config, files, prefix, usage, limiter, client });
  const app = createApp({ config, brain, usage, store, auth, states, feedback, ipOf: () => opts.ip ?? '127.0.0.1' });
  return { config, store, sql, usage, auth, states, feedback, brain, app, calls };
}

/** Mint an invite, redeem it like a browser would, and return the session cookie header. */
export async function invited(r: Rig, label = 'test'): Promise<{ cookie: string; setCookie: string; profileId: string }> {
  const inv = await r.auth.createInvite(label, 3_600_000);
  const res = await r.app.request(`/invite/${inv.token}`, { method: 'POST' });
  const setCookie = res.headers.get('set-cookie') ?? '';
  const cookie = setCookie.split(';')[0];
  const s = await r.auth.session(cookie.split('=')[1]);
  return { cookie, setCookie, profileId: s!.profileId };
}

/** A request as a remote browser (through the tunnel): proxied, with an optional cookie. */
export async function call(app: Rig['app'], path: string, init: { method?: string; body?: unknown; cookie?: string; session?: string; headers?: Record<string, string> } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json', 'x-poio-session': init.session ?? 'test-session-1', ...init.headers };
  if (init.cookie) headers.cookie = init.cookie;
  const r = await app.request(path, { method: init.method ?? 'GET', headers, body: init.body === undefined ? undefined : JSON.stringify(init.body) });
  let body: any = null;
  try { body = await r.json(); } catch { /* not JSON */ }
  return { status: r.status, body };
}

export function reply(json: unknown, usage = { input_tokens: 120, cache_creation_input_tokens: 0, cache_read_input_tokens: 9000, output_tokens: 80 }) {
  return () => ({ content: [{ type: 'text', text: typeof json === 'string' ? json : JSON.stringify(json) }], usage, stop_reason: 'end_turn' });
}

export async function post(app: Rig['app'], path: string, body: unknown, session = 'test-session-1') {
  const r = await app.request(path, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-poio-session': session } });
  return { status: r.status, body: await r.json() };
}
