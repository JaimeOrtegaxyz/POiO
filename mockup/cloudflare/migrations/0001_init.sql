-- POiO mockup database. One schema for SQLite on Node (node:sqlite, today)
-- and Cloudflare D1 (later): plain SQLite, no extensions, every statement
-- idempotent so it can run at every start.

-- Invites: short-lived, single-use, opaque. Only the SHA-256 of the token is
-- stored; the raw token is shown once, by the CLI that mints it.
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL DEFAULT '',
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  redeemed_at INTEGER,
  revoked_at INTEGER
);

-- A browser profile: what one redeemed invite becomes. Not an account.
CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  invite_id TEXT REFERENCES invites(id),
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);

-- Cookie sessions. Only the SHA-256 of the cookie value is stored.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  profile_id TEXT NOT NULL REFERENCES profiles(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX IF NOT EXISTS sessions_by_profile ON sessions(profile_id);

-- The device state of one profile (pantry, poionotas, history, settings):
-- the source of truth for invited profiles. The browser keeps a cache.
CREATE TABLE IF NOT EXISTS profile_state (
  profile_id TEXT PRIMARY KEY REFERENCES profiles(id),
  state TEXT NOT NULL,
  version INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Spend ledger. kind 'call' = a finished model call (actual tokens and USD);
-- kind 'hold' = a reservation for a call in flight, counted at its worst-case
-- estimate until settled or until hold_until passes (a crashed call).
-- profile_id 'local' = localhost or the access code.
CREATE TABLE IF NOT EXISTS ledger (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL,
  time TEXT NOT NULL,
  day TEXT NOT NULL,
  month TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  session TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  cache_creation_input_tokens INTEGER NOT NULL DEFAULT 0,
  cache_read_input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  usd REAL NOT NULL,
  tokens REAL NOT NULL,
  hold_until INTEGER,
  source_key TEXT UNIQUE
);
CREATE INDEX IF NOT EXISTS ledger_by_day ON ledger(day);
CREATE INDEX IF NOT EXISTS ledger_by_month ON ledger(month);
CREATE INDEX IF NOT EXISTS ledger_by_profile_day ON ledger(profile_id, day);
CREATE INDEX IF NOT EXISTS ledger_by_session ON ledger(profile_id, session);

-- Feedback typed into the demo, for review (npm run feedback). Free text the
-- person chose to send; the screen and variant say where they were.
CREATE TABLE IF NOT EXISTS feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  time TEXT NOT NULL,
  profile_id TEXT NOT NULL,
  screen TEXT NOT NULL DEFAULT '',
  variant TEXT NOT NULL DEFAULT '',
  text TEXT NOT NULL
);
