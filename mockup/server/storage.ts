/**
 * Storage behind a small interface. The file version appends JSONL to
 * mockup/data/ (gitignored); a hosted deploy can swap in a database or KV
 * store without touching the routes.
 */
import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export type Stream = 'usage' | 'events';

export interface Store {
  append(stream: Stream, record: object): Promise<void>;
  readAll(stream: Stream): Promise<any[]>;
}

export class FileStore implements Store {
  private ready: Promise<unknown>;
  constructor(private dir: string) {
    this.ready = mkdir(dir, { recursive: true });
  }
  private file(stream: Stream): string {
    return join(this.dir, `${stream}.jsonl`);
  }
  async append(stream: Stream, record: object): Promise<void> {
    await this.ready;
    await appendFile(this.file(stream), `${JSON.stringify(record)}\n`, 'utf8');
  }
  async readAll(stream: Stream): Promise<any[]> {
    await this.ready;
    const f = this.file(stream);
    if (!existsSync(f)) return [];
    const out: any[] = [];
    for (const line of (await readFile(f, 'utf8')).split('\n')) {
      if (!line.trim()) continue;
      try { out.push(JSON.parse(line)); } catch { /* skip a torn line */ }
    }
    return out;
  }
}

export class MemoryStore implements Store {
  readonly data: Record<Stream, any[]> = { usage: [], events: [] };
  async append(stream: Stream, record: object): Promise<void> { this.data[stream].push(record); }
  async readAll(stream: Stream): Promise<any[]> { return [...this.data[stream]]; }
}
