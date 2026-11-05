/**
 * Model prices in USD per million tokens. Checked 2026-11-04 against
 * https://platform.claude.com/docs/en/about-claude/pricing. Haiku 5.5 rows
 * are the "prompts up to 100,000 tokens" tier; this app's prompts are ~10k.
 * Cache writes use the 5-minute TTL price.
 */
export const PRICING_CHECKED = '2026-11-04';
export const PRICING_SOURCE = 'https://platform.claude.com/docs/en/about-claude/pricing';

export interface Price { input: number; cacheWrite: number; cacheRead: number; output: number }

export const PRICES: Record<string, Price> = {
  'claude-haiku-5-5': { input: 0.1, cacheWrite: 0.125, cacheRead: 0.01, output: 0.5 },
  'claude-sonnet-5-5': { input: 2, cacheWrite: 2.5, cacheRead: 0.1, output: 10 },
};

export interface TokenUsage {
  input_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  output_tokens: number;
}

/** Unknown models are priced as Sonnet 5.5, so the guard errs on the safe side. */
export function priceFor(model: string): Price {
  return PRICES[model] ?? PRICES['claude-sonnet-5-5'];
}

export function costUsd(model: string, u: TokenUsage): number {
  const p = priceFor(model);
  return (
    (u.input_tokens * p.input +
      u.cache_creation_input_tokens * p.cacheWrite +
      u.cache_read_input_tokens * p.cacheRead +
      u.output_tokens * p.output) / 1_000_000
  );
}

/** Session-cap accounting: input, cache writes and output count fully; cache reads at 10%. */
export function sessionTokens(u: TokenUsage): number {
  return u.input_tokens + u.cache_creation_input_tokens + u.output_tokens + 0.1 * u.cache_read_input_tokens;
}
