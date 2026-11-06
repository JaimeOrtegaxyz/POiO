/**
 * Device state per invited profile: the source of truth for invited
 * browsers (the browser keeps a cache). Last write wins; the version counts
 * writes so a debug view can tell a stale tab. No node: imports here.
 */
import type { Sql } from './db/sql';

/** Bigger than any real state (pantry ~120 items, history, notes). */
export const MAX_STATE_BYTES = 192 * 1024;

export class ProfileStates {
  constructor(private sql: Sql, private now: () => number = () => Date.now()) {}

  async get(profileId: string): Promise<{ state: unknown; version: number } | null> {
    const r = await this.sql.get<{ state: string; version: number }>('SELECT state, version FROM profile_state WHERE profile_id = ?', [profileId]);
    if (!r) return null;
    try { return { state: JSON.parse(r.state), version: r.version }; } catch { return null; }
  }

  async put(profileId: string, state: object): Promise<number> {
    await this.sql.run(
      `INSERT INTO profile_state (profile_id, state, version, updated_at) VALUES (?, ?, 1, ?)
       ON CONFLICT(profile_id) DO UPDATE SET state = excluded.state, version = profile_state.version + 1, updated_at = excluded.updated_at`,
      [profileId, JSON.stringify(state), this.now()],
    );
    const r = await this.sql.get<{ version: number }>('SELECT version FROM profile_state WHERE profile_id = ?', [profileId]);
    return r?.version ?? 1;
  }

  /** Reset: this profile only. */
  async clear(profileId: string): Promise<void> {
    await this.sql.run('DELETE FROM profile_state WHERE profile_id = ?', [profileId]);
  }
}

/** The client's DeviceState shape, checked loosely: an object, version 1, a device id. */
export function validState(x: unknown): x is { version: 1; deviceId: string } {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return false;
  const s = x as Record<string, unknown>;
  return s.version === 1 && typeof s.deviceId === 'string' && s.deviceId.length <= 64;
}
