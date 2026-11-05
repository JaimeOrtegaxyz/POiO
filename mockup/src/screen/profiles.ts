/**
 * Panel profiles. The panel is TBD (hardware/PROTOTYPE.md bench test), so the
 * emulation runs on profiles, all defined here. Numbers are starting
 * approximations of the on-panel look, to be tuned after the bench test.
 */

export type PigmentName = 'ink' | 'paper' | 'yellow' | 'red' | 'blue' | 'green';
export type ChromeColor = 'ink' | 'paper' | 'yellow' | 'red';
export type ProfileId = 'spectra6-4in' | 'kaleido3-6in';
export type TimingMode = 'fast' | 'real';

export interface Timing {
  /** Total length of a full refresh (ink -> paper -> new frame). */
  fullMs: number;
  /** Length of a partial repaint of the changed rectangle; null = the panel has no partial refresh. */
  partialMs: number | null;
}

export interface Profile {
  id: ProfileId;
  label: string;
  /** Native resolution, landscape. */
  width: number;
  height: number;
  /** palette = snap to discrete pigments; kaleido = color filter over a gray layer. */
  mode: 'palette' | 'kaleido';
  /** Drawing colors. For Spectra these are the only colors the panel pass can output. */
  colors: Record<PigmentName, string>;
  /** Kaleido only: how the panel pass mutes and quantizes. */
  kaleido?: {
    /** Color resolution relative to the text layer. */
    colorScale: number;
    /** 0.4 = keep 60% of the chroma. */
    desaturate: number;
    grayLevels: number;
    /** Bits per channel of the color output (4 -> 4,096 colors). */
    colorBits: number;
    /** On-panel ink and (grayish) paper. */
    ink: string;
    paper: string;
  };
  defaultScale: number;
  timing: Record<TimingMode, Timing>;
}

/** UI chrome uses only these; blue and green appear only in food images. */
export const CHROME: readonly ChromeColor[] = ['ink', 'paper', 'yellow', 'red'];
export const PIGMENTS: readonly PigmentName[] = ['ink', 'paper', 'yellow', 'red', 'blue', 'green'];

const SPECTRA_COLORS: Record<PigmentName, string> = {
  ink: '#1a1816',
  paper: '#f4efe4',
  yellow: '#e9c92a',
  red: '#b8322a',
  blue: '#2d4f9e',
  green: '#3a6b3c',
};

export const PROFILES: Record<ProfileId, Profile> = {
  'spectra6-4in': {
    id: 'spectra6-4in',
    label: 'Spectra 6 · 4" · 600×400',
    width: 600,
    height: 400,
    mode: 'palette',
    colors: SPECTRA_COLORS,
    defaultScale: 2,
    timing: {
      fast: { fullMs: 520, partialMs: 220 },
      // ~15-20 s full refresh and no partial refresh on the real panel.
      real: { fullMs: 16000, partialMs: null },
    },
  },
  'kaleido3-6in': {
    id: 'kaleido3-6in',
    label: 'Kaleido 3 · 6" · 1448×1072',
    width: 1448,
    height: 1072,
    mode: 'kaleido',
    colors: SPECTRA_COLORS,
    kaleido: {
      colorScale: 0.5,
      desaturate: 0.4,
      grayLevels: 16,
      colorBits: 4,
      ink: '#2b2a28',
      paper: '#d6d3ca',
    },
    // 1448 px wide is already large on screen: 1× by default, 2× optional.
    defaultScale: 1,
    timing: {
      fast: { fullMs: 480, partialMs: 200 },
      real: { fullMs: 550, partialMs: 260 },
    },
  },
};

export const DEFAULT_PROFILE: ProfileId = 'spectra6-4in';

/** Design units are authored for 600×400; `u` scales them to the profile. */
export function unitScale(p: Profile): number {
  return p.width / 600;
}

/** Design-unit height of the profile (400 for Spectra, ~444 for Kaleido). */
export function designHeight(p: Profile): number {
  return p.height / unitScale(p);
}

export function partialAllowed(p: Profile, mode: TimingMode): boolean {
  return p.timing[mode].partialMs !== null;
}
