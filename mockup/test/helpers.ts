import { loadBrainFiles } from '../server/allowlist';
import { createApp } from '../server/app';
import type { MessagesClient } from '../server/brain/real';
import { BrainService } from '../server/brain/service';
import { loadConfig, type Config } from '../server/config';
import { buildStaticPrefix, loadAdapter } from '../server/prompt';
import { MemoryStore } from '../server/storage';
import { IpLimiter, UsageTracker, type Clock } from '../server/usage';

export const files = loadBrainFiles(loadConfig({} as NodeJS.ProcessEnv).brainDir);
export const prefix = buildStaticPrefix(files, loadAdapter());

export function ctx(screen = 'choose', contents?: unknown) {
  return { now: '2026-11-04T19:30:00.000Z', servings: 2, poionotas: [], pantry: [], recentDiscards: [], screen: { id: screen, contents } };
}

export interface Rig {
  config: Config;
  store: MemoryStore;
  usage: UsageTracker;
  brain: BrainService;
  app: ReturnType<typeof createApp>;
  calls: any[];
}

/** A server with a scripted fake Anthropic client (never the network). */
export function rig(opts: { env?: Record<string, string>; replies?: ((params: any) => any)[]; clock?: Clock; ip?: string; staticDir?: string } = {}): Rig {
  const config = { ...loadConfig({ ANTHROPIC_API_KEY: 'test-key-not-real', ...opts.env } as NodeJS.ProcessEnv), staticDir: opts.staticDir };
  const store = new MemoryStore();
  const usage = new UsageTracker(store, config, opts.clock);
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
  const app = createApp({ config, brain, usage, store, ipOf: () => opts.ip ?? '127.0.0.1' });
  return { config, store, usage, brain, app, calls };
}

export function reply(json: unknown, usage = { input_tokens: 120, cache_creation_input_tokens: 0, cache_read_input_tokens: 9000, output_tokens: 80 }) {
  return () => ({ content: [{ type: 'text', text: typeof json === 'string' ? json : JSON.stringify(json) }], usage, stop_reason: 'end_turn' });
}

export async function post(app: Rig['app'], path: string, body: unknown, session = 'test-session-1') {
  const r = await app.request(path, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json', 'x-poio-session': session } });
  return { status: r.status, body: await r.json() };
}
