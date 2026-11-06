/**
 * DRAFT, not wired: the Cloudflare D1 side of the database seam, for the
 * Workers cutover described in docs/CLOUDFLARE.md. The D1 types are declared
 * here (structurally) so the mockup needs no Cloudflare dependency; the test
 * suite runs this adapter against a D1-shaped shim over node:sqlite to prove
 * the SQL and the call shapes line up.
 */
import { schemaStatements, type RunResult, type Sql, type SqlValue } from './sql';

/** The slice of the D1 binding this adapter uses. */
export interface D1Like {
  prepare(sql: string): D1StatementLike;
}
export interface D1StatementLike {
  bind(...values: SqlValue[]): D1StatementLike;
  run(): Promise<{ meta: { changes?: number; last_row_id?: number } }>;
  first<T>(): Promise<T | null>;
  all<T>(): Promise<{ results: T[] }>;
}

export class D1Sql implements Sql {
  constructor(private db: D1Like) {}

  private stmt(sql: string, params: SqlValue[]): D1StatementLike {
    const s = this.db.prepare(sql);
    return params.length ? s.bind(...params) : s;
  }

  async run(sql: string, params: SqlValue[] = []): Promise<RunResult> {
    const r = await this.stmt(sql, params).run();
    return { changes: r.meta.changes ?? 0, lastId: r.meta.last_row_id ?? null };
  }

  async get<T>(sql: string, params: SqlValue[] = []): Promise<T | undefined> {
    return (await this.stmt(sql, params).first<T>()) ?? undefined;
  }

  async all<T>(sql: string, params: SqlValue[] = []): Promise<T[]> {
    return (await this.stmt(sql, params).all<T>()).results;
  }

  /** On D1 the schema is applied by `wrangler d1 migrations apply`; this is for tests. */
  async exec(sql: string): Promise<void> {
    for (const s of schemaStatements(sql)) await this.run(s);
  }
}
