/**
 * The prompt. A static prefix (cached): the English adapter, then SKILL.md,
 * VOICE.md, the style guide, the recipe schema and the pantry item keys.
 * Then a short dynamic part per call: date and season, city, servings,
 * poionotas, known pantry items, recent discards, the screen, the utterance.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePantryTemplate, PANTRY_STATUSES, type PantryStatus } from '../shared/pantry';
import type { BrainContext } from '../shared/types';
import type { BrainFiles } from './allowlist';

const here = dirname(fileURLToPath(import.meta.url));

export function loadAdapter(): string {
  return readFileSync(join(here, 'prompts/adapter.md'), 'utf8');
}

export function buildStaticPrefix(files: BrainFiles, adapter: string): string {
  const keys = parsePantryTemplate(files.pantryTemplate).map((i) => `${i.key} (${i.name})`).join('\n');
  return [
    adapter.trim(),
    '---\n\n# SKILL.md (base brain)\n\n' + files.skill.trim(),
    '---\n\n# VOICE.md\n\n' + files.voice.trim(),
    '---\n\n# references/style-guide.md\n\n' + files.styleGuide.trim(),
    '---\n\n# reference/recipe.schema.json\n\n```json\n' + files.recipeSchema.trim() + '\n```',
    '---\n\n# Pantry item keys (from pantry.example.md)\n\n' + keys,
  ].join('\n\n');
}

const MONTHS_ES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** Northern-hemisphere season for Mexico, from the month (0-11). */
export function seasonFor(month: number): string {
  if (month === 11 || month <= 1) return 'invierno';
  if (month <= 4) return 'primavera';
  if (month <= 7) return 'verano';
  return 'otoño';
}

const clip = (s: unknown, n: number) => (typeof s === 'string' ? s.slice(0, n) : '');

/** Coerce whatever the client sent into a bounded BrainContext. */
export function sanitizeContext(raw: any): BrainContext {
  const now = typeof raw?.now === 'string' && !Number.isNaN(Date.parse(raw.now)) ? raw.now : new Date().toISOString();
  const servings = Number.isInteger(raw?.servings) && raw.servings > 0 && raw.servings <= 30 ? raw.servings : 2;
  const pantry = Array.isArray(raw?.pantry)
    ? raw.pantry
        .filter((p: any) => p && typeof p.item === 'string' && PANTRY_STATUSES.includes(p.status))
        .slice(0, 300)
        .map((p: any) => ({ item: clip(p.item, 60), status: p.status as PantryStatus, display: p.display ? clip(p.display, 60) : undefined }))
    : [];
  const strings = (a: any, n: number, len: number) => (Array.isArray(a) ? a.filter((s) => typeof s === 'string').slice(-n).map((s: string) => s.slice(0, len)) : []);
  let contents: unknown;
  try {
    const json = JSON.stringify(raw?.screen?.contents ?? null);
    contents = json.length <= 4000 ? JSON.parse(json) : undefined;
  } catch { contents = undefined; }
  return {
    now,
    city: raw?.city ? clip(raw.city, 80) : undefined,
    servings,
    poionotas: strings(raw?.poionotas, 40, 200),
    pantry,
    recentDiscards: strings(raw?.recentDiscards, 15, 80),
    screen: { id: clip(raw?.screen?.id, 40) || 'unknown', contents },
  };
}

/** Local calendar date of the device clock in the given time zone. */
export function localDate(iso: string, timeZone: string): { y: number; m: number; d: number; hour: number } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' })
    .formatToParts(new Date(iso));
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: get('year'), m: get('month') - 1, d: get('day'), hour: get('hour') };
}

export function buildUserMessage(
  endpoint: 'suggest' | 'recipe' | 'utterance',
  ctx: BrainContext,
  extra: Record<string, unknown>,
  timeZone = 'America/Mexico_City',
): string {
  const t = localDate(ctx.now, timeZone);
  const lines = [
    `endpoint: ${endpoint}`,
    `fecha: ${t.d} de ${MONTHS_ES[t.m]} de ${t.y}, ${t.hour}:00`,
    `temporada: ${seasonFor(t.m)}`,
    `ciudad: ${ctx.city || 'desconocida'}`,
    `porciones: ${ctx.servings}`,
    `poionotas:\n${ctx.poionotas.length ? ctx.poionotas.map((n) => `- ${n}`).join('\n') : '- (ninguna)'}`,
    `despensa conocida:\n${ctx.pantry.length ? ctx.pantry.map((p) => `- ${p.item}: ${p.status}${p.display ? ` (${p.display})` : ''}`).join('\n') : '- (nada conocido)'}`,
    `descartes recientes: ${ctx.recentDiscards.length ? ctx.recentDiscards.join(' | ') : '(ninguno)'}`,
    `pantalla: ${ctx.screen.id}`,
  ];
  if (ctx.screen.contents !== undefined && ctx.screen.contents !== null) lines.push(`contenido de la pantalla: ${JSON.stringify(ctx.screen.contents)}`);
  for (const [k, v] of Object.entries(extra)) {
    if (v === undefined || v === null || (Array.isArray(v) && !v.length) || v === '') continue;
    lines.push(`${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
  }
  return lines.join('\n');
}
