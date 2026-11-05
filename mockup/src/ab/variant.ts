/**
 * The A/B flag. Variant a = images + short frame animations (within panel
 * limits); b = text-led. Random per device on first load, kept in device
 * state; `?variant=a|b` overrides (and sticks). These double as SCOPE's 1-2
 * designer-set adaptive-UI layouts.
 */
export type Variant = 'a' | 'b';

export interface Assignment { variant: Variant; source: 'url' | 'random' | 'stored'; changed: boolean }

export function assignVariant(current: Variant | null, search: string, random: () => number = Math.random): Assignment {
  const q = new URLSearchParams(search).get('variant');
  if (q === 'a' || q === 'b') return { variant: q, source: 'url', changed: q !== current };
  if (current === 'a' || current === 'b') return { variant: current, source: 'stored', changed: false };
  return { variant: random() < 0.5 ? 'a' : 'b', source: 'random', changed: true };
}
