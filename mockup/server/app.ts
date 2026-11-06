/**
 * The HTTP surface.
 *
 *   /                 public landing (static, no brain)
 *   /invite/:token    GET shows the invite, POST redeems it: mints a browser
 *                     profile + an HttpOnly session cookie, 303 to /demo
 *   /demo             the device mockup (the page itself is public; it asks
 *                     /api/me and shows the invite gate when it has no access)
 *   /api/*            behind requireAccess (profile cookie, this machine, or
 *                     the access code); budgets are enforced here, server-side.
 *                     Spend numbers (/api/usage) are for local mode only: an
 *                     invitee never sees costs or token counts.
 *
 * Static files (npm start) come only from the built client; dist/brain is
 * never served.
 */
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono, type Context } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { getCookie, setCookie } from 'hono/cookie';
import type { Me, UsageSummary } from '../shared/types';
import { accessOf, clientIp, isProxied, LOCAL_PROFILE, requireAccess, SESSION_COOKIE, socketIp, type Access, type IpOf } from './access';
import type { Auth } from './auth';
import type { BrainService } from './brain/service';
import type { Config } from './config';
import { cleanFeedback, type FeedbackLog } from './feedback';
import { invitePage, inviteUsedPage } from './pages';
import { MAX_STATE_BYTES, validState, type ProfileStates } from './state';
import type { Store } from './storage';
import { IpLimiter, type Spender, type UsageTracker } from './usage';

export interface AppDeps {
  config: Pick<Config, 'accessCode' | 'staticDir' | 'sessionTokenCap' | 'dailyBudgetUsd' | 'monthlyBudgetUsd' | 'model' | 'profileDailyUsd' | 'profileMonthlyUsd'>;
  brain: BrainService;
  usage: UsageTracker;
  store: Store;
  auth: Auth;
  states: ProfileStates;
  feedback: FeedbackLog;
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

/** String fields an event may carry, each a short lowercase code. Everything else is numbers or flags. */
const STRING_KEYS = new Set(['variant', 'source', 'kind']);

/** Keep event payloads small and scalar: numbers, booleans, a couple of codes. No free text. */
function cleanData(raw: unknown): Record<string, string | number | boolean> {
  const out: Record<string, string | number | boolean> = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [k, v] of Object.entries(raw as Record<string, unknown>).slice(0, 12)) {
    if (!/^[a-zA-Z_]{1,24}$/.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string' && STRING_KEYS.has(k) && /^[a-z]{1,12}$/.test(v)) out[k] = v;
  }
  return out;
}

/** Plain http only for this machine's own host name; anything else (the tunnel, a host) gets a Secure cookie. */
function cookieSecure(c: Context): boolean {
  const host = (c.req.header('host') ?? '').replace(/:\d+$/, '').toLowerCase();
  const localName = host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  return !(localName && !isProxied(c) && new URL(c.req.url).protocol === 'http:');
}

export function createApp(d: AppDeps): Hono {
  const app = new Hono();
  const ipOf = d.ipOf ?? socketIp;

  app.use('*', async (c, next) => {
    await next();
    c.header('X-Content-Type-Options', 'nosniff');
    c.header('X-Frame-Options', 'DENY');
    if (!c.res.headers.has('Referrer-Policy')) c.header('Referrer-Policy', 'same-origin');
  });

  // --- Invites -----------------------------------------------------------
  // The token sits in the path; these responses never cache, never send a
  // Referer, and the redirect goes to a token-free /demo. The server keeps
  // no request log, so the token isn't written anywhere at rest.
  const inviteHeaders = (c: Context) => {
    c.header('Cache-Control', 'no-store');
    c.header('Referrer-Policy', 'no-referrer');
    c.header('X-Robots-Tag', 'noindex');
  };

  app.get('/invite/:token', async (c) => {
    inviteHeaders(c);
    // Already in (this browser redeemed it before): straight to the demo.
    if (await d.auth.session(getCookie(c, SESSION_COOKIE))) return c.redirect('/demo', 303);
    const open = await d.auth.inviteOpen(c.req.param('token'));
    return c.html(open ? invitePage() : inviteUsedPage(), open ? 200 : 410);
  });

  app.post('/invite/:token', async (c) => {
    inviteHeaders(c);
    const r = await d.auth.redeem(c.req.param('token'));
    if (!r) return c.html(inviteUsedPage(), 410);
    // Lax, not Strict: the invite arrives as a link from another site (a chat
    // app); Strict would drop the cookie on the redirect that follows it.
    // Cross-site POSTs (CSRF) still go without it.
    setCookie(c, SESSION_COOKIE, r.sessionToken, {
      httpOnly: true,
      secure: cookieSecure(c),
      sameSite: 'Lax',
      path: '/',
      maxAge: Math.floor((r.expiresAt - Date.now()) / 1000),
    });
    return c.redirect('/demo', 303);
  });

  // --- API -----------------------------------------------------------------
  app.use('/api/*', requireAccess({ auth: d.auth, accessCode: d.config.accessCode, ipOf }));
  app.use('/api/*', async (c, next) => {
    const max = c.req.path === '/api/state' ? MAX_STATE_BYTES + 1024 : 64 * 1024;
    return bodyLimit({ maxSize: max, onError: (cc) => cc.json({ error: 'too large' }, 413) })(c, next);
  });

  const json = async (c: Context) => {
    try { return await c.req.json(); } catch { return {}; }
  };

  const spender = (c: Context): Spender => {
    const a = accessOf(c);
    return a.kind === 'profile'
      ? { profileId: a.profileId, session: sessionOf(c), profileDailyUsd: d.config.profileDailyUsd, profileMonthlyUsd: d.config.profileMonthlyUsd }
      : { profileId: LOCAL_PROFILE, session: sessionOf(c), profileDailyUsd: null, profileMonthlyUsd: null };
  };

  const profileOf = (c: Context): string | null => {
    const a: Access = accessOf(c);
    return a.kind === 'profile' ? a.profileId : null;
  };

  app.get('/api/health', (c) => c.json({ ok: true, fake: d.brain.isFake }));

  app.get('/api/me', (c) => {
    const p = profileOf(c);
    const body: Me = p ? { mode: 'profile', tag: p.slice(4, 10) } : { mode: 'local' };
    c.header('Cache-Control', 'no-store');
    return c.json(body);
  });

  app.post('/api/suggest', async (c) => c.json(await d.brain.suggest(spender(c), clientIp(c, ipOf), await json(c))));
  app.post('/api/recipe', async (c) => c.json(await d.brain.recipe(spender(c), clientIp(c, ipOf), await json(c))));
  app.post('/api/utterance', async (c) => c.json(await d.brain.utterance(spender(c), clientIp(c, ipOf), await json(c))));

  // Device state: on the server for invited profiles; local mode keeps it in the browser.
  app.get('/api/state', async (c) => {
    c.header('Cache-Control', 'no-store');
    const p = profileOf(c);
    if (!p) return c.json({ mode: 'local' });
    const s = await d.states.get(p);
    return c.json({ mode: 'profile', state: s?.state ?? null, version: s?.version ?? 0 });
  });
  app.put('/api/state', async (c) => {
    const p = profileOf(c);
    if (!p) return c.json({ error: 'local mode keeps state in the browser' }, 409);
    const b = await json(c);
    if (!validState(b?.state)) return c.json({ error: 'bad state' }, 400);
    return c.json({ ok: true, version: await d.states.put(p, b.state) });
  });
  app.delete('/api/state', async (c) => {
    const p = profileOf(c);
    if (!p) return c.json({ error: 'local mode keeps state in the browser' }, 409);
    await d.states.clear(p);
    return c.json({ ok: true });
  });

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

  // Feedback from the demo, for review (npm run feedback). A few per profile per 10 minutes.
  const feedbackLimit = new IpLimiter(8, 10 * 60 * 1000);
  app.post('/api/feedback', async (c) => {
    const b = await json(c);
    const text = cleanFeedback(b?.text);
    if (!text) return c.json({ error: 'bad feedback' }, 400);
    const who = profileOf(c) ?? LOCAL_PROFILE;
    if (!feedbackLimit.allow(who)) return c.json({ error: 'too many' }, 429);
    await d.feedback.add(who, text, typeof b?.screen === 'string' ? b.screen : '', typeof b?.variant === 'string' ? b.variant : '');
    return c.json({ ok: true });
  });

  // Spend and tokens: for local mode (Jaime) only. An invitee might read
  // costs as something they'd have to pay; their caps still apply silently.
  app.get('/api/usage', async (c) => {
    await d.usage.ready();
    const p = profileOf(c);
    if (p) return c.json({ error: 'local mode only' }, 403);
    const who = spender(c);
    const t = await d.usage.totals(who);
    const body: UsageSummary = {
      fake: d.brain.isFake,
      model: d.config.model,
      session: { id: who.session, tokens: t.sessionTokens, cap: d.config.sessionTokenCap },
      day: { usd: t.dayUsd, cap: d.config.dailyBudgetUsd },
      month: { usd: t.monthUsd, cap: d.config.monthlyBudgetUsd },
      recent: await d.usage.recent(8),
    };
    return c.json(body);
  });

  app.all('/api/*', (c) => c.json({ error: 'not found' }, 404));

  // --- Static (npm start) ----------------------------------------------------
  if (d.config.staticDir) {
    const root = d.config.staticDir;
    app.use('/brain/*', async (c) => c.text('Not found', 404));
    // Old kitchen-test links opened the device at /?access=…; keep them working.
    app.get('/', async (c, next) => {
      const q = new URL(c.req.url).search;
      if (c.req.query('access')) return c.redirect(`/demo${q}`, 302);
      return next();
    });
    app.get('/demo', serveStatic({ root, path: 'demo/index.html' }));
    app.get('/demo/', serveStatic({ root, path: 'demo/index.html' }));
    app.use('/*', serveStatic({ root }));
  }
  app.notFound((c) => c.text('Not found', 404));
  return app;
}
