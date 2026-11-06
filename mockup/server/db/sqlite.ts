/**
 * The Node side of the database seam: node:sqlite (built into Node 22.13+),
 * one file under mockup/data/ (gitignored). WAL mode so the invites CLI can
 * write while the server runs.
 */
import { readFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { schemaStatements, type RunResult, type Sql, type SqlValue } from './sql';

const here = dirname(fileURLToPath(import.meta.url));
export const SCHEMA_FILE = join(here, 'schema.sql');

export class SqliteSql implements Sql {
  readonly db: DatabaseSync;

  constructor(path: string) {
    if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA busy_timeout = 5000');
    if (path !== ':memory:') this.db.exec('PRAGMA journal_mode = WAL');
    this.db.exec('PRAGMA foreign_keys = ON');
  }

  async run(sql: string, params: SqlValue[] = []): Promise<RunResult> {
    const r = this.db.prepare(sql).run(...params);
    return { changes: Number(r.changes), lastId: r.lastInsertRowid == null ? null : Number(r.lastInsertRowid) };
  }

  async get<T>(sql: string, params: SqlValue[] = []): Promise<T | undefined> {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }

  async all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return this.db.prepare(sql).all(...params) as T[];
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql);
  }

  /** schema.sql in one synchronous go (tests build in-memory databases this way). */
  migrateSync(): this {
    this.db.exec(readFileSync(SCHEMA_FILE, 'utf8'));
    return this;
  }

  close(): void { this.db.close(); }
}

/** Open (or create) the database and apply schema.sql. */
export async function openSqlite(path: string): Promise<SqliteSql> {
  const sql = new SqliteSql(path);
  await migrate(sql);
  return sql;
}

export async function migrate(sql: Sql, schema = readFileSync(SCHEMA_FILE, 'utf8')): Promise<void> {
  for (const stmt of schemaStatements(schema)) await sql.run(stmt);
}
