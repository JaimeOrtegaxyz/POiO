/**
 * The brain reads exactly these repo files, once, at startup. Nothing a
 * request sends can name a path: there is no route that reads a file by name,
 * and readAllowed refuses anything not on the list. Personal files
 * (pantry.md, references/regional-context.md, references/equipment.md,
 * poionotas.md, pantry.json, .env) are never on it.
 */
import { readFileSync } from 'node:fs';
import { join, normalize } from 'node:path';
import list from './allowlist.json';

/** The prompt's base brain, per the brief §4.2. */
export const PROMPT_FILES = list.prompt as readonly string[];
/** The sample recipes served as fixtures (a sample title returns its fixture). */
export const FIXTURE_FILES = list.fixtures as readonly string[];
export const ALLOWED_FILES: readonly string[] = [...PROMPT_FILES, ...FIXTURE_FILES];

export class NotAllowedError extends Error {}

export function readAllowed(brainDir: string, rel: string): string {
  if (!ALLOWED_FILES.includes(rel) || normalize(rel) !== rel || rel.includes('..')) {
    throw new NotAllowedError(`not on the brain allowlist: ${rel}`);
  }
  return readFileSync(join(brainDir, rel), 'utf8');
}

export interface BrainFiles {
  skill: string;
  voice: string;
  styleGuide: string;
  recipeSchema: string;
  pantryTemplate: string;
  fixtures: string[];
}

export function loadBrainFiles(brainDir: string): BrainFiles {
  const [skill, voice, styleGuide, recipeSchema, pantryTemplate] = PROMPT_FILES.map((f) => readAllowed(brainDir, f));
  return { skill, voice, styleGuide, recipeSchema, pantryTemplate, fixtures: FIXTURE_FILES.map((f) => readAllowed(brainDir, f)) };
}
