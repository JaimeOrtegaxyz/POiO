/**
 * Pantry item keys are slugs of the `pantry.example.md` rows: lowercase ASCII,
 * every run of non-alphanumerics becomes "-", trimmed.
 * "Chicken thighs (boneless)" -> "chicken-thighs-boneless".
 */
export function slugify(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Accent- and case-insensitive text for matching speech ("¿Qué sabes de mí?" -> "que sabes de mi"). */
export function normalizeText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[¿?¡!.,;:"'()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
