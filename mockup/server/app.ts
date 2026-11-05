/**
 * The HTTP surface. /api/* sits behind requireAccess. Static files (npm
 * start) come only from the built client; dist/brain is never served.
 */
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import type { UsageSummary } from '../shared/types';
import { requireAccess, socketIp, type IpOf } from './access';
import type { BrainService } from './brain/service';
import type { Config } from './config';
import type { Store } from './storage';
import type { UsageTracker } from './usage';

export interface AppDeps {
  config: Pick<Config, 'accessCode' | 'staticDir' | 'sessionTokenCap' | 'dailyBudgetUsd' | 'monthlyBudgetUsd' | 'model'>;
  brain: BrainService;
  usage: UsageTracker;
  store: Store;
  ipOf?: IpOf;
}

/** Event types the A/B log accepts. No free text, no PII. */
export const EVENT_TYPES = new Set([
  'variant', 'turn_on', 'turn_off', 'onboarding_answer', 'onboarding_skip', 'options_shown', 'discard', 'tweak',
  'pick', 'first_recipe', 'recipe_open', 'missing', 'step_completed', 'checkpoint_fired', 'finish', 'taste',
  'pantry_diff', 'checkin_shown', 'checkin_answered',
]);

const sessionOf = (c: Context) => {
  const s = c.req.header('x-poio-session') ?? c.req.query('session') ?? '';
  return /^[a-z0-9-]{8,64}$/i.test(s) ? s : 'anon';
};

/** Keep event payloads small and scalar: numbers, booleans, short ids. */
function cleanData(raw: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 12)) {
    if (!/^[a-zA-Z_]{1,24}$/.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string' && /^[a-z0-9_-]{1,64}$/i.test(v)) out[k] = v;
  }
  return out;
}

export function createApp(d: AppDeps): Hono {
  const app = new Hono();
  const ipOf = d.ipOf ?? socketIp;

  app.use('/api/*', requireAccess(d.config.accessCode, ipOf));
  app.use('/api/*', bodyLimit({ maxSize: 64 * 1024, onError: (c) => c.json({ error: 'too large' }, 413) }));

  const json = async (c: Context) => {
    try { return await c.req.json(); } catch { return {}; }
  };

  app.get('/api/health', (c) => c.json({ ok: true, fake: d.brain.isFake }));

  app.post('/api/suggest', async (c) => c.json(await d.brain.suggest(sessionOf(c), ipOf(c), await json(c))));
  app.post('/api/recipe', async (c) => c.json(await d.brain.recipe(sessionOf(c), ipOf(c), await json(c))));
  app.post('/api/utterance', async (c) => c.json(await d.brain.utterance(sessionOf(c), ipOf(c), await json(c))));

  app.post('/api/event', async (c) => {
    const b = await json(c);
    const type = typeof b?.type === 'string' ? b.type : '';
    if (!EVENT_TYPES.has(type)) return c.json({ error: 'bad event' }, 400);
    const deviceId = typeof b.deviceId === 'string' && /^[a-z0-9-]{8,64}$/i.test(b.deviceId) ? b.deviceId : 'unknown';
    const variant = b.variant === 'a' || b.variant === 'b' ? b.variant : 'unknown';
    const rec = { time: new Date().toISOString(), deviceId, variant, session: sessionOf(c), type, data: cleanData(b.data) };
    await d.store.append('events', rec);
    return c.json({ ok: true });
  });

  app.get('/api/usage', async (c) => {
    await d.usage.ready();
    const session = sessionOf(c);
    const t = d.usage.totals(session);
    const body: UsageSummary = {
      fake: d.brain.isFake,
      model: d.config.model,
      session: { id: session, tokens: t.sessionTokens, cap: d.config.sessionTokenCap },
      day: { usd: t.dayUsd, cap: d.config.dailyBudgetUsd },
      month: { usd: t.monthUsd, cap: d.config.monthlyBudgetUsd },
      recent: d.usage.recent(8),
    };
    return c.json(body);
  });

  app.all('/api/*', (c) => c.json({ error: 'not found' }, 404));

  if (d.config.staticDir) {
    const root = d.config.staticDir;
    app.use('/brain/*', async (c) => c.text('Not found', 404));
    app.use('/*', serveStatic({ root }));
    app.get('/*', serveStatic({ root, path: 'index.html' }));
  }
  app.notFound((c) => c.text('Not found', 404));
  return app;
}
