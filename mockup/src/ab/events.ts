/**
 * The A/B event log: anonymous device id, variant, event type and a few
 * numbers or flags. No names, no free text, no PII. Kept locally (a tail,
 * for the debug panel) and appended server-side to data/events.jsonl.
 *
 * Events: variant, turn_on/off, onboarding_answer/skip, options_shown,
 * discard, tweak, pick, first_recipe (ms from first turn-on), recipe_open,
 * missing, step_completed, checkpoint_fired, finish, taste, pantry_diff,
 * checkin_shown, checkin_answered.
 */
import type { Api } from '../api';

export interface LoggedEvent { time: string; type: string; variant: string; data?: Record<string, string | number | boolean> }

const KEY = 'poio.events.v1';
const KEEP = 200;

export class EventLog {
  private tailBuf: LoggedEvent[];

  constructor(private api: Api, private deviceId: () => string, private variant: () => string, private storage: Storage = localStorage) {
    try { this.tailBuf = JSON.parse(storage.getItem(KEY) ?? '[]'); } catch { this.tailBuf = []; }
  }

  log(type: string, data?: Record<string, string | number | boolean>): void {
    const e: LoggedEvent = { time: new Date().toISOString(), type, variant: this.variant(), data };
    this.tailBuf.push(e);
    if (this.tailBuf.length > KEEP) this.tailBuf = this.tailBuf.slice(-KEEP);
    try { this.storage.setItem(KEY, JSON.stringify(this.tailBuf)); } catch { /* storage full: the server copy still lands */ }
    void this.api.event({ deviceId: this.deviceId(), variant: e.variant, type, data });
  }

  tail(): LoggedEvent[] { return this.tailBuf; }

  clear(): void { this.tailBuf = []; this.storage.removeItem(KEY); }
}
