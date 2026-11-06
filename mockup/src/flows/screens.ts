/** The screen registry: one module per screen, all driven by flows/app.ts. */
import type { Action } from '../../shared/types';
import type { Intent } from '../input/intent';
import type { Painter } from '../screen/painter';
import type { App, Area } from './app';
import { check } from './check';
import { choose } from './choose';
import { cook } from './cook';
import { cookbook } from './cookbook';
import { done } from './done';
import { intro } from './intro';
import { missing } from './missing';
import { notes } from './notes';
import { onboarding } from './onboarding';
import { pantry } from './pantry';
import { tutorial, type Control } from './tutorial';

export type ScreenId = 'off' | 'onboarding' | 'choose' | 'intro' | 'check' | 'missing' | 'cook' | 'done' | 'cookbook' | 'pantry' | 'notes' | 'tutorial';

export interface ScreenDef {
  /** Masthead context. */
  context(app: App): string;
  /** Masthead meta, mono, right-aligned. */
  meta?(app: App): string;
  /** Affordance band for this screen and state. */
  afford(app: App): string;
  draw(p: Painter, app: App, body: Area): void;
  enter?(app: App): void;
  rotate?(app: App, dir: 1 | -1): void;
  press?(app: App): void;
  /** A locally parsed intent; return true if handled. */
  intent?(app: App, i: Intent): boolean;
  /** Raw utterance before the brain (onboarding answers); return true if handled. */
  utterance?(app: App, text: string): boolean | Promise<boolean>;
  /** An action from the brain; return true if handled. */
  action?(app: App, a: Action): boolean;
  /** What's on screen, for the brain's context. */
  contents?(app: App): unknown;
  /** Called by the scheduler; return true to repaint. */
  tick?(app: App, now: number): boolean;
  /** The right pill, when this screen handles it itself (the tutorial). */
  home?(app: App): boolean;
  /** Every utterance, before the intent parser and the brain; return true to stop there (the tutorial). */
  hear?(app: App, text: string): boolean;
  /** The control this screen is asking for, ringed on the face (the tutorial). */
  hint?(app: App): Control | null;
}

const off: ScreenDef = { context: () => '', afford: () => '', draw: () => {} };

export const SCREENS: Record<ScreenId, ScreenDef> = {
  off, onboarding, choose, intro, check, missing, cook, done, cookbook, pantry, notes, tutorial,
};
