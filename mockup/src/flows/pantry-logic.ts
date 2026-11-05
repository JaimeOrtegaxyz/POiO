/**
 * Pantry rules that run locally, with no LLM call: the predicted post-cook
 * diff from `depletes` (transitions per reference/recipe.schema.json), and
 * the order the Despensa screen lists things in.
 */
import type { PantryStatus, PantryTemplateItem } from '../../shared/pantry';
import type { Recipe } from '../../shared/types';
import { pantryName } from '../copy/es-MX';
import type { PantryEntry } from '../state/store';

export interface DiffRow { item: string; display: string; from: PantryStatus | null; to: PantryStatus }

/** Items that never go in the pantry (a swap to "agua con sal"). */
const NOT_STOCK = new Set(['water', 'agua']);

/**
 * none/light -> no change; some -> low->out; heavy -> plenty->low, low->out;
 * finishes -> out. Unknown items: heavy -> low (you just cooked with it),
 * finishes -> out, the rest unchanged.
 */
export function predictDiff(recipe: Recipe, pantry: Record<string, PantryEntry>): DiffRow[] {
  const rows: DiffRow[] = [];
  const seen = new Set<string>();
  for (const ing of recipe.ingredients) {
    if (seen.has(ing.item) || NOT_STOCK.has(ing.item)) continue;
    seen.add(ing.item);
    const from = pantry[ing.item]?.status ?? null;
    let to: PantryStatus | null = null;
    switch (ing.depletes ?? 'none') {
      case 'some': if (from === 'low') to = 'out'; break;
      case 'heavy': to = from === 'plenty' || from === null ? 'low' : 'out'; break;
      case 'finishes': to = 'out'; break;
      default: break;
    }
    if (to && to !== from) rows.push({ item: ing.item, display: ing.display || pantryName(ing.item), from, to });
  }
  // Used-up items first: that's what the line leads with.
  return rows.sort((a, b) => (a.to === b.to ? 0 : a.to === 'out' ? -1 : 1));
}

const ORDER: Record<PantryStatus, number> = { out: 0, low: 1, plenty: 2 };

/** Known items only: no hay first, then poco, then the rest by template category. */
export function pantryRows(pantry: Record<string, PantryEntry>, template: PantryTemplateItem[]) {
  const catIndex = new Map<string, number>();
  const cats: string[] = [];
  for (const t of template) {
    if (!cats.includes(t.category)) cats.push(t.category);
    catIndex.set(t.key, cats.indexOf(t.category));
  }
  return Object.entries(pantry)
    .map(([key, e]) => ({ key, ...e, display: e.display || pantryName(key), cat: catIndex.get(key) ?? 99 }))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.cat - b.cat || a.display.localeCompare(b.display, 'es'));
}

export const NEXT_STATUS: Record<PantryStatus, PantryStatus> = { plenty: 'low', low: 'out', out: 'plenty' };

/** Apply a drop or swap to the recipe (ingredients and every step's `uses`). */
export function applyMissing(recipe: Recipe, item: string, choice: { kind: 'drop' | 'swap'; swapItem?: string; swapDisplay?: string }): Recipe {
  if (choice.kind === 'drop' || !choice.swapItem) {
    return {
      ...recipe,
      ingredients: recipe.ingredients.filter((i) => i.item !== item),
      steps: recipe.steps.map((s) => ({ ...s, uses: (s.uses ?? []).filter((u) => u !== item) })),
    };
  }
  const to = choice.swapItem;
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((i) => (i.item === item ? { ...i, item: to, display: choice.swapDisplay || pantryName(to) } : i)),
    steps: recipe.steps.map((s) => ({ ...s, uses: (s.uses ?? []).map((u) => (u === item ? to : u)) })),
  };
}

/** The 3-6 key ingredients for the check: required ones, star first, then protein. */
export function keyIngredients(recipe: Recipe) {
  const req = recipe.ingredients.filter((i) => i.required !== false && i.item !== 'salt-kosher-table');
  const rank = (i: Recipe['ingredients'][number]) => (i.star ? 0 : i.group === 'Protein' ? 1 : 2);
  const sorted = [...req].sort((a, b) => rank(a) - rank(b));
  const list = sorted.slice(0, 6);
  if (list.length < 3) {
    for (const i of recipe.ingredients) if (list.length < 3 && !list.includes(i)) list.push(i);
  }
  return list;
}
