import { normalizeText } from './slug';

/**
 * Keyword matching of spoken ingredients to pantry keys, for the fake brain
 * and the no-LLM fallbacks. Longest phrase wins ("media crema" before
 * "crema"); one phrase can map to several keys ("pollo" -> both boneless rows).
 */
export function matchItems(utterance: string, names: Record<string, string[]>): { key: string; phrase: string }[] {
  const text = ` ${normalizeText(utterance)} `;
  const phrases: { phrase: string; keys: string[] }[] = [];
  const byPhrase = new Map<string, string[]>();
  for (const [key, list] of Object.entries(names)) {
    for (const p of list) {
      const n = normalizeText(p);
      if (!n) continue;
      const arr = byPhrase.get(n) ?? [];
      if (!arr.includes(key)) arr.push(key);
      byPhrase.set(n, arr);
    }
  }
  for (const [phrase, keys] of byPhrase) phrases.push({ phrase, keys });
  phrases.sort((a, b) => b.phrase.length - a.phrase.length);

  let rest = text;
  const out: { key: string; phrase: string }[] = [];
  const seen = new Set<string>();
  for (const { phrase, keys } of phrases) {
    const needle = ` ${phrase} `;
    const at = rest.indexOf(needle);
    if (at < 0) continue;
    rest = rest.slice(0, at) + ' '.repeat(needle.length - 1) + rest.slice(at + needle.length - 1);
    for (const k of keys) if (!seen.has(k)) { seen.add(k); out.push({ key: k, phrase }); }
  }
  return out;
}
