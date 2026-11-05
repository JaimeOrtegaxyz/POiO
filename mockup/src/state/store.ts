/**
 * Device state, in localStorage: the device works without the app. Pantry,
 * poionotas, discards, history and check-ins are the brain's context; the
 * settings are the debug panel's.
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

const KEY = 'poio.device.v1';

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

export function loadState(storage: Storage = localStorage): DeviceState {
  try {
    const raw = storage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as DeviceState;
      if (s?.version === 1 && s.deviceId) {
        const f = freshState();
        return { ...f, ...s, prefs: { ...f.prefs, ...s.prefs }, settings: { ...f.settings, ...s.settings } };
      }
    }
  } catch { /* fall through */ }
  return freshState();
}

export function saveState(s: DeviceState, storage: Storage = localStorage): void {
  storage.setItem(KEY, JSON.stringify(s));
}

export function clearState(storage: Storage = localStorage): void {
  storage.removeItem(KEY);
}
