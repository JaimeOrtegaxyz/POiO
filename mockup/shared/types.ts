import type { PantryStatus } from './pantry';

export type Difficulty = 'fácil' | 'media' | 'difícil';

export interface SuggestOption {
  title: string;
  minutes: number;
  difficulty: Difficulty;
}

export interface Checkpoint { afterSec: number; message: string }

export interface RecipeStep {
  n: number;
  text: string;
  glyph?: 'pan' | 'pot' | 'griddle' | 'bowl' | 'oven' | 'knife' | 'none';
  checkpoint?: Checkpoint;
  uses?: string[];
}

export type Depletes = 'none' | 'light' | 'some' | 'heavy' | 'finishes';

export interface RecipeIngredient {
  item: string;
  display?: string;
  qty: string;
  group: 'Protein' | 'Veg & Aromatics' | 'Pantry & Spices' | 'Sauce' | 'Dairy & Finish' | 'Starch';
  star?: boolean;
  required?: boolean;
  depletes?: Depletes;
}

/** Mirrors reference/recipe.schema.json (the schema is the source of truth; ajv validates). */
export interface Recipe {
  id: string;
  name: string;
  vibe: string;
  serves: number;
  time: { activeMin: number; totalMin: number };
  flavor?: string;
  tags?: string[];
  season?: string[];
  cut?: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  finish?: string;
  notes?: string[];
}

/** What the client knows and sends with every brain call (the dynamic prompt part). */
export interface BrainContext {
  /** ISO date-time of the device clock (debug can advance it). */
  now: string;
  city?: string;
  servings: number;
  poionotas: string[];
  /** Known pantry items only; unknown items are simply absent. `assumed` = the device guessed it, the user never said. */
  pantry: { item: string; status: PantryStatus; display?: string; assumed?: boolean }[];
  recentDiscards: string[];
  /** No recipe cooked to the end yet: the brain knows almost nothing about this kitchen. */
  firstRound?: boolean;
  screen: { id: string; contents?: unknown };
}

export interface MissingOption {
  label: string;
  kind: 'drop' | 'swap';
  swapItem?: string;
  swapDisplay?: string;
}

export interface PantryChange { item: string; status: PantryStatus; display?: string }

export type ActionName =
  | 'pick' | 'discard' | 'tweak' | 'recipe_request' | 'missing'
  | 'pantry' | 'poionotas' | 'answer' | 'not_understood';

/**
 * One thing an utterance asks for. An utterance becomes 1-4 actions, applied
 * in order: what to remember (pantry, poionotas) first, then at most one
 * thing to do. Fields beyond `action` depend on the action.
 */
export interface Action {
  action: ActionName;
  index?: number;
  title?: string;
  tweak?: string;
  item?: string;
  display?: string;
  line?: string;
  options?: MissingOption[];
  changes?: PantryChange[];
  add?: string[];
  remove?: string[];
  reply?: string;
  text?: string;
}

/** Why a response came from fixtures instead of the model. */
export type LimitReason = 'session' | 'daily' | 'monthly' | 'profile' | 'rate';

export interface BrainMeta {
  fake: boolean;
  limited?: LimitReason;
  fallback?: boolean;
}

export interface SuggestResponse extends BrainMeta { options: SuggestOption[]; reason?: string }
export interface RecipeResponse extends BrainMeta { recipe: Recipe | null }
export interface UtteranceResponse extends BrainMeta { actions: Action[] }

/** Actions that change what POiO knows; everything else moves the device. */
export const STATE_ACTIONS: readonly ActionName[] = ['pantry', 'poionotas'];

export interface UsageSummary {
  fake: boolean;
  model: string;
  session: { id: string; tokens: number; cap: number };
  day: { usd: number; cap: number };
  month: { usd: number; cap: number };
  recent: UsageRecord[];
}

/** Who the server thinks this browser is (GET /api/me). */
export interface Me {
  /** 'profile' = an invited browser profile (state lives on the server); 'local' = localhost or the access code (state stays in this browser). */
  mode: 'profile' | 'local';
  /** A short, non-secret tag for the profile (the debug panel shows it). */
  tag?: string;
}

export interface UsageRecord {
  time: string;
  session: string;
  endpoint: string;
  model: string;
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
  usd: number;
}
