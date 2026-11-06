/**
 * API entry point. Loads mockup/.env, the allowlisted brain files, the
 * database (invites, profiles, profile state, the spend ledger; usage.jsonl
 * is folded into the ledger at start), then serves /api, /invite (and the
 * built client with npm start).
 * The API key is read from env only; it's never logged or sent anywhere
 * but the Anthropic API.
 */
import Anthropic from '@anthropic-ai/sdk';
import { serve } from '@hono/node-server';
import { loadBrainFiles } from './allowlist';
import { createApp } from './app';
import { Auth } from './auth';
import { BrainService } from './brain/service';
import { loadConfig, loadDotEnv } from './config';
import { openSqlite } from './db/sqlite';
import { buildStaticPrefix, loadAdapter } from './prompt';
import { FeedbackLog } from './feedback';
import { ProfileStates } from './state';
import { FileStore } from './storage';
import { IpLimiter, UsageTracker } from './usage';

loadDotEnv();
const config = loadConfig();
const files = loadBrainFiles(config.brainDir);
const prefix = buildStaticPrefix(files, loadAdapter());
const store = new FileStore(config.dataDir);
const sql = await openSqlite(config.dbPath);
const usage = new UsageTracker(sql, config, undefined, store);
await usage.ready();
const auth = new Auth(sql, { sessionMs: config.profileSessionMs });
const states = new ProfileStates(sql);
const feedback = new FeedbackLog(sql);
const limiter = new IpLimiter(config.ipLimit, config.ipWindowMs);
const client = config.fake ? undefined : new Anthropic({ apiKey: config.apiKey });
const brain = new BrainService({ config, files, prefix, usage, limiter, client });
const app = createApp({ config, brain, usage, store, auth, states, feedback });

serve({ fetch: app.fetch, port: config.port }, () => {
  const mode = brain.isFake ? 'fake brain (fixtures, zero API calls)' : `live brain: ${config.model}, recipes ${config.modelRecipe}`;
  console.log(`POiO API on http://localhost:${config.port} · ${mode} · prompt prefix ~${Math.round(prefix.length / 4)} tokens`);
  if (config.staticDir) console.log(`Serving the built client from ${config.staticDir}`);
});
