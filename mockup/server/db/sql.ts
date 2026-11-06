/**
 * The one database seam. Everything that touches the database (invites,
 * sessions, profile state, the spend ledger) speaks this small async
 * interface, so the same code runs on node:sqlite today and on Cloudflare D1
 * later (server/db/d1.ts). No node: imports here.
 *
 * Rules that keep the SQL portable to D1: one statement per call, no
 * interactive transactions (anything that must be atomic is a single
 * conditional statement), positional `?` parameters only.
 */
export type SqlValue = string | number | null;

export interface RunResult {
  changes: number;
  lastId: number | null;
}

export interface Sql {
  run(sql: string, params?: SqlValue[]): Promise<RunResult>;
  get<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): Promise<T | undefined>;
  all<T = Record<string, unknown>>(sql: string, params?: SqlValue[]): Promise<T[]>;
  /** Several statements at once, for the schema only. */
  exec(sql: string): Promise<void>;
}

/** Split schema.sql into statements (no semicolons inside its statements). */
export function schemaStatements(schema: string): string[] {
  return schema
    .split('\n')
    .filter((l) => !l.trim().startsWith('--'))
    .join('\n')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean);
}
