import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
export const MOCKUP_DIR = resolve(here, '..');
export const REPO_DIR = resolve(MOCKUP_DIR, '..');

export interface Config {
  /** Never logged, never sent to the client. */
  apiKey: string | undefined;
  model: string;
  modelRecipe: string;
  /** Fixtures only, zero API calls. Automatic when no key is set. */
  fake: boolean;
  sessionTokenCap: number;
  dailyBudgetUsd: number;
  monthlyBudgetUsd: number;
  accessCode: string | undefined;
  port: number;
  /** Where the allowlisted brain files are read from (repo root in dev, dist/brain once built). */
  brainDir: string;
  dataDir: string;
  /** Built client to serve (npm start); unset in dev, where Vite serves it. */
  staticDir: string | undefined;
  timeZone: string;
  ipLimit: number;
  ipWindowMs: number;
}

/** Load mockup/.env (if present) into process.env without overriding the shell. */
export function loadDotEnv(file = join(MOCKUP_DIR, '.env')): void {
  if (!existsSync(file)) return;
  const loader = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (loader) {
    const before = { ...process.env };
    loader(file);
    // loadEnvFile overrides; restore anything the shell already set.
    for (const [k, v] of Object.entries(before)) if (v !== undefined) process.env[k] = v;
  }
}

const num = (v: string | undefined, d: number) => (v !== undefined && v !== '' && Number.isFinite(Number(v)) ? Number(v) : d);
const str = (v: string | undefined) => (v && v.trim() ? v.trim() : undefined);

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const apiKey = str(env.ANTHROPIC_API_KEY);
  const abs = (p: string | undefined, d: string) => (p ? resolve(MOCKUP_DIR, p) : d);
  return {
    apiKey,
    model: str(env.POIO_MODEL) ?? 'claude-haiku-5-5',
    modelRecipe: str(env.POIO_MODEL_RECIPE) ?? str(env.POIO_MODEL) ?? 'claude-haiku-5-5',
    fake: env.POIO_FAKE_BRAIN === '1' || !apiKey,
    sessionTokenCap: num(env.POIO_SESSION_TOKEN_CAP, 60000),
    dailyBudgetUsd: num(env.POIO_DAILY_BUDGET_USD, 3),
    monthlyBudgetUsd: num(env.POIO_MONTHLY_BUDGET_USD, 100),
    accessCode: str(env.POIO_ACCESS_CODE),
    port: num(env.PORT, 8787),
    brainDir: abs(env.POIO_BRAIN_DIR, REPO_DIR),
    dataDir: abs(env.POIO_DATA_DIR, join(MOCKUP_DIR, 'data')),
    staticDir: env.POIO_STATIC_DIR ? resolve(MOCKUP_DIR, env.POIO_STATIC_DIR) : undefined,
    timeZone: str(env.POIO_TZ) ?? 'America/Mexico_City',
    ipLimit: num(env.POIO_IP_LIMIT, 30),
    ipWindowMs: num(env.POIO_IP_WINDOW_MS, 10 * 60 * 1000),
  };
}
