/**
 * Server sync for an invited profile: the database holds the device state,
 * this browser a cache. Saves are debounced into one PUT; leaving the page
 * flushes with keepalive so the last change lands. Last write wins.
 */
import type { Api } from '../api';
import type { DeviceState } from './store';

/** keepalive requests are capped at 64 KB by browsers. */
const KEEPALIVE_MAX = 60 * 1024;

export class StateSync {
  private pending: DeviceState | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(private api: Api, private delayMs = 700) {
    const leave = () => this.flush(true);
    addEventListener('pagehide', leave);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leave(); });
  }

  schedule(s: DeviceState): void {
    this.pending = s;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.flush(false), this.delayMs);
  }

  flush(leaving: boolean): void {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (!this.pending) return;
    const body = JSON.stringify({ state: this.pending });
    this.pending = null;
    void this.api.putState(body, leaving && body.length < KEEPALIVE_MAX);
  }

  /** Drop anything queued (a reset is about to clear the server copy). */
  cancel(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.pending = null;
  }
}
