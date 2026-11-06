/**
 * Client for the brain proxy. The key never reaches the browser; this only
 * sends device state as context and reads JSON back.
 */
import type { BrainContext, Me, RecipeResponse, SuggestResponse, UsageSummary, UtteranceResponse } from '../shared/types';

export class Api {
  session = '';
  private access: string | null;
  onCall: ((endpoint: string) => void) | null = null;

  constructor() {
    const q = new URLSearchParams(location.search).get('access');
    if (q) sessionStorage.setItem('poio.access', q);
    this.access = sessionStorage.getItem('poio.access');
  }

  private headers(): Record<string, string> {
    const h: Record<string, string> = { 'content-type': 'application/json' };
    if (this.session) h['x-poio-session'] = this.session;
    if (this.access) h['x-poio-access'] = this.access;
    return h;
  }

  private async post<T>(path: string, body: unknown): Promise<T | null> {
    try {
      const r = await fetch(`/api/${path}`, { method: 'POST', headers: this.headers(), body: JSON.stringify(body) });
      if (!r.ok) return null;
      return (await r.json()) as T;
    } catch {
      return null;
    } finally {
      this.onCall?.(path);
    }
  }

  suggest(context: BrainContext, opts: { tweak?: string; exclude?: string[]; slot?: 'cookbook' } = {}) {
    return this.post<SuggestResponse>('suggest', { context, ...opts });
  }

  recipe(context: BrainContext, title: string) {
    return this.post<RecipeResponse>('recipe', { context, title });
  }

  utterance(context: BrainContext, utterance: string) {
    return this.post<UtteranceResponse>('utterance', { context, utterance });
  }

  async event(body: { deviceId: string; variant: string; type: string; data?: Record<string, unknown> }): Promise<void> {
    try {
      await fetch('/api/event', { method: 'POST', headers: this.headers(), body: JSON.stringify(body), keepalive: true });
    } catch { /* the local log still has it */ }
  }

  /** Who the server thinks this browser is; 'gate' = no access (needs an invite), null = server unreachable. */
  async me(): Promise<Me | 'gate' | null> {
    try {
      const r = await fetch('/api/me', { headers: this.headers() });
      if (r.status === 403) return 'gate';
      return r.ok ? ((await r.json()) as Me) : null;
    } catch {
      return null;
    }
  }

  /** An invited profile's device state from the server (null state = a new profile); null = unreachable. */
  async getState(): Promise<{ state: unknown } | null> {
    try {
      const r = await fetch('/api/state', { headers: this.headers() });
      if (!r.ok) return null;
      const b = (await r.json()) as { mode: string; state?: unknown };
      return b.mode === 'profile' ? { state: b.state ?? null } : null;
    } catch {
      return null;
    }
  }

  async putState(body: string, keepalive: boolean): Promise<boolean> {
    try {
      const r = await fetch('/api/state', { method: 'PUT', headers: this.headers(), body, keepalive });
      return r.ok;
    } catch {
      return false;
    }
  }

  async deleteState(): Promise<boolean> {
    try {
      return (await fetch('/api/state', { method: 'DELETE', headers: this.headers() })).ok;
    } catch {
      return false;
    }
  }

  /** Feedback typed into the demo; true once the server has it. */
  async feedback(text: string, screen: string, variant: string): Promise<boolean> {
    try {
      const r = await fetch('/api/feedback', { method: 'POST', headers: this.headers(), body: JSON.stringify({ text, screen, variant }) });
      return r.ok;
    } catch {
      return false;
    }
  }

  async usage(): Promise<UsageSummary | null> {
    try {
      const r = await fetch(`/api/usage?session=${encodeURIComponent(this.session || 'anon')}`, { headers: this.headers() });
      return r.ok ? ((await r.json()) as UsageSummary) : null;
    } catch {
      return null;
    }
  }
}
