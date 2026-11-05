import { slugify } from './slug';

export type PantryStatus = 'plenty' | 'low' | 'out';
export const PANTRY_STATUSES: readonly PantryStatus[] = ['plenty', 'low', 'out'];

export interface PantryTemplateItem {
  key: string;
  /** English row name from pantry.example.md (the key's source). */
  name: string;
  /** English `##` heading from pantry.example.md. */
  category: string;
}

/**
 * Parse the committed pantry template into item keys. Only the structure is
 * used (headings + item column); the template's statuses are ignored, since
 * every item starts unknown on the device. Duplicate rows (e.g. "Potatoes"
 * appears twice) keep their first category.
 */
export function parsePantryTemplate(md: string): PantryTemplateItem[] {
  const out: PantryTemplateItem[] = [];
  const seen = new Set<string>();
  let category = '';
  for (const raw of md.split('\n')) {
    const line = raw.trim();
    const h2 = /^##\s+(.+)$/.exec(line);
    if (h2 && !line.startsWith('###')) { category = h2[1].trim(); continue; }
    if (!line.startsWith('|') || !category) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    const name = cells[0];
    if (!name || name === 'Item' || /^-+$/.test(name)) continue;
    const key = slugify(name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ key, name, category });
  }
  return out;
}
