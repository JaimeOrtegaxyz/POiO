/**
 * API entry point. Loads mockup/.env, the allowlisted brain files and the
 * usage log, then serves /api (and the built client with npm start).
 * The API key is read from env only; it's never logged or sent anywhere
 * but the Anthropic API.
 */
import Anthropic from '@anthropic-ai/sdk';
import { serve } from '@hono/node-server';
import { loadBrainFiles } from './allowlist';
import { createApp } from './app';
import { BrainService } from './brain/service';
import { loadConfig, loadDotEnv } from './config';
import { buildStaticPrefix, loadAdapter } from './prompt';
import { FileStore } from './storage';
import { IpLimiter, UsageTracker } from './usage';

loadDotEnv();
const config = loadConfig();
const files = loadBrainFiles(config.brainDir);
const prefix = buildStaticPrefix(files, loadAdapter());
const store = new FileStore(config.dataDir);
const usage = new UsageTracker(store, config);
const limiter = new IpLimiter(config.ipLimit, config.ipWindowMs);
const client = config.fake ? undefined : new Anthropic({ apiKey: config.apiKey });
const brain = new BrainService({ config, files, prefix, usage, limiter, client });
const app = createApp({ config, brain, usage, store });

serve({ fetch: app.fetch, port: config.port }, () => {
  const mode = brain.isFake ? 'fake brain (fixtures, zero API calls)' : `live brain: ${config.model}, recipes ${config.modelRecipe}`;
  console.log(`POiO API on http://localhost:${config.port} · ${mode} · prompt prefix ~${Math.round(prefix.length / 4)} tokens`);
  if (config.staticDir) console.log(`Serving the built client from ${config.staticDir}`);
});
