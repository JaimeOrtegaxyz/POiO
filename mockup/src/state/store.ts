/**
 * Device state: pantry, poionotas, discards, history and check-ins are the
 * brain's context; the settings are the debug panel's.
 *
 * Local mode (localhost, the access code): localStorage is the store, as
 * always. Invited profile: the server is the source of truth (state/sync.ts)
 * and localStorage is a cache under a per-profile key, so a second invite in
 * the same browser starts empty instead of inheriting the first one's data.
 */
import type { PantryStatus } from '../../shared/pantry';
import type { SuggestOption } from '../../shared/types';
import type { ProfileId, TimingMode } from '../screen/profiles';

export interface PantryEntry {
  status: PantryStatus;
  display?: string;
  /** Set by onboarding defaults ("supuesto"), cleared once the user confirms anything about it. */
  assumed?: boolean;
  at: number;
}

export interface Note { text: string; at: number }
export interface Checkin { dish: string; dueAt: number; shownAt?: number; done?: boolean }

export interface Settings {
  profile: ProfileId;
  timing: TimingMode;
  scale?: number;
  muted: boolean;
  /** Checkpoint / check-in speed multiplier (?speed=10). */
  speed: number;
  /** Debug "advance clock": added to Date.now(). */
  clockOffsetMs: number;
  /** Check-ins stay hidden this long after turn-on (10 min by default; divided by speed). */
  checkinQuietMs: number;
}

export interface DeviceState {
  version: 1;
  deviceId: string;
  variant: 'a' | 'b' | null;
  onboarded: boolean;
  /** The tutorial ran to the end or was closed once (the first turn-on of an invited profile starts it). */
  tutorialSeen?: boolean;
  firstTurnOnAt?: number;
  firstRecipeAt?: number;
  prefs: { city?: string; servings: number };
  pantry: Record<string, PantryEntry>;
  poionotas: Note[];
  discards: { titles: string[]; at: number }[];
  history: { id: string; name: string; finishedAt: number }[];
  checkins: Checkin[];
  cookbook: { key: string; option: SuggestOption; reason?: string } | null;
  lastFullRefreshDay?: string;
  settings: Settings;
}

const BASE_KEY = 'poio.device.v1';
let key = BASE_KEY;
let onSave: ((s: DeviceState) => void) | null = null;

/** Switch to an invited profile's cache key, and hand every save to the server sync. */
export function useProfileStore(tag: string, save: (s: DeviceState) => void): void {
  key = `${BASE_KEY}.p.${tag}`;
  onSave = save;
}

export function storageKey(): string { return key; }

export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c?.randomUUID) return c.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

export function freshState(): DeviceState {
  return {
    version: 1,
    deviceId: newId(),
    variant: null,
    onboarded: false,
    prefs: { servings: 2 },
    pantry: {},
    poionotas: [],
    discards: [],
    history: [],
    checkins: [],
    cookbook: null,
    settings: { profile: 'spectra6-4in', timing: 'fast', muted: false, speed: 1, clockOffsetMs: 0, checkinQuietMs: 10 * 60 * 1000 },
  };
}

/** A stored state (cache or server copy) merged over a fresh one, or null if it isn't one. */
export function normalizeState(raw: unknown): DeviceState | null {
  const s = raw as DeviceState | null;
  if (!s || s.version !== 1 || !s.deviceId) return null;
  const f = freshState();
  return { ...f, ...s, prefs: { ...f.prefs, ...s.prefs }, settings: { ...f.settings, ...s.settings } };
}

export function loadState(storage: Storage = localStorage): DeviceState {
  try {
    const raw = storage.getItem(key);
    if (raw) return normalizeState(JSON.parse(raw)) ?? freshState();
  } catch { /* fall through */ }
  return freshState();
}

export function saveState(s: DeviceState, storage: Storage = localStorage): void {
  try { storage.setItem(key, JSON.stringify(s)); } catch { /* storage full or blocked: the server copy still lands */ }
  onSave?.(s);
}

export function clearState(storage: Storage = localStorage): void {
  storage.removeItem(key);
}
