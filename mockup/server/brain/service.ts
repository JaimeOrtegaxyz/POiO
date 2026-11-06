/**
 * Routes each brain request: sample-recipe shortcut -> fake mode -> budget
 * hold (atomic, see usage.ts) -> per-IP limit -> real call -> settle the hold
 * with the actual usage -> fallback. Every model call's usage is logged
 * before the response goes out; every response is validated.
 */
import Ajv2020 from 'ajv/dist/2020.js';
import { actionApiSchema, actionValidationSchema, suggestApiSchema, suggestValidationSchema, toApiSchema } from '../../shared/schemas';
import type { Action, LimitReason, Recipe, RecipeResponse, SuggestResponse, UtteranceResponse } from '../../shared/types';
import type { BrainFiles } from '../allowlist';
import type { Config } from '../config';
import { buildUserMessage, sanitizeContext } from '../prompt';
import { costUsd } from '../pricing';
import type { IpLimiter, Spender, UsageTracker } from '../usage';
import { FakeBrain } from './fake';
import { RealBrain, type MessagesClient } from './real';

/** max_tokens per endpoint (brief §4.4). */
export const MAX_TOKENS = { utterance: 300, suggest: 300, recipe: 1800 } as const;

export interface ServiceDeps {
  config: Pick<Config, 'fake' | 'model' | 'modelRecipe' | 'timeZone'>;
  files: BrainFiles;
  prefix: string;
  usage: UsageTracker;
  limiter: IpLimiter;
  client?: MessagesClient;
}

export class BrainService {
  readonly fake: FakeBrain;
  private real: RealBrain | null;
  private sampleIds: Set<string>;
  private vRecipe;
  private vSuggest3;
  private vSuggest1;
  private vAction;
  private recipeApiSchema: unknown;

  constructor(private d: ServiceDeps) {
    this.fake = new FakeBrain(d.files.fixtures, d.config.timeZone);
    this.sampleIds = new Set(d.files.fixtures.map((f) => (JSON.parse(f) as Recipe).id));
    this.real = !d.config.fake && d.client ? new RealBrain(d.client, d.prefix) : null;
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    const recipeSchema = JSON.parse(d.files.recipeSchema);
    this.vRecipe = ajv.compile(recipeSchema);
    this.recipeApiSchema = toApiSchema(recipeSchema);
    this.vSuggest3 = ajv.compile(suggestValidationSchema(3));
    this.vSuggest1 = ajv.compile(suggestValidationSchema(1));
    this.vAction = ajv.compile(actionValidationSchema());
  }

  get isFake(): boolean { return this.real === null; }

  /** Validate a recipe against reference/recipe.schema.json; null = valid. */
  validateRecipe(r: unknown): string | null {
    return this.vRecipe(r) ? null : this.errors(this.vRecipe.errors);
  }

  private errors(e: any[] | null | undefined): string {
    return (e ?? []).slice(0, 5).map((x) => `${x.instancePath || '/'} ${x.message}`).join('; ');
  }

  /**
   * Worst case for one call, held while it's in flight: the whole static
   * prefix written to the cache, ~3k dynamic input tokens, max_tokens out.
   */
  estimate(model: string, maxTokens: number): { usd: number; tokens: number } {
    const prefix = Math.ceil(this.d.prefix.length / 3.5);
    const u = { input_tokens: 3000, cache_creation_input_tokens: prefix, cache_read_input_tokens: 0, output_tokens: maxTokens };
    return { usd: costUsd(model, u), tokens: 3000 + prefix + maxTokens };
  }

  /** A hold id = go ahead; otherwise the response comes from fixtures, flagged. */
  private async gate(who: Spender, ip: string, endpoint: string, model: string, maxTokens: number): Promise<{ hold: number } | { fake: boolean; limited?: LimitReason }> {
    if (!this.real) return { fake: true as const };
    const hold = await this.d.usage.reserve(who, endpoint, model, this.estimate(model, maxTokens));
    if (!hold.ok) return { fake: false as const, limited: hold.reason };
    if (!this.d.limiter.allow(ip)) {
      await this.d.usage.release(hold.id);
      return { fake: false as const, limited: 'rate' as const };
    }
    return { hold: hold.id };
  }

  /** Run a real call under its hold: settle with actual usage, or release on a throw. */
  private async spend<T>(who: Spender, endpoint: string, hold: number, run: () => Promise<{ data: T | null; usages: { model: string; usage: any }[] }>) {
    let res: { data: T | null; usages: { model: string; usage: any }[] };
    try {
      res = await run();
    } catch (e) {
      await this.d.usage.release(hold);
      throw e;
    }
    await this.d.usage.settle(hold, who, endpoint, res.usages);
    return res;
  }

  async suggest(who: Spender, ip: string, body: any): Promise<SuggestResponse> {
    const ctx = sanitizeContext(body?.context);
    const slot = body?.slot === 'cookbook' ? 'cookbook' : undefined;
    const tweak = typeof body?.tweak === 'string' ? body.tweak.slice(0, 200) : undefined;
    const exclude = Array.isArray(body?.exclude) ? body.exclude.filter((s: unknown) => typeof s === 'string').slice(0, 30) : [];
    const fixture = () => this.fake.suggest(ctx, { tweak, exclude, slot });
    const gate = await this.gate(who, ip, 'suggest', this.d.config.model, MAX_TOKENS.suggest);
    if (!('hold' in gate)) return { ...fixture(), ...gate };
    const count = slot ? 1 : 3;
    const v = slot ? this.vSuggest1 : this.vSuggest3;
    const res = await this.spend(who, 'suggest', gate.hold, () => this.real!.call<{ options: SuggestResponse['options']; reason: string }>({
      endpoint: 'suggest',
      model: this.d.config.model,
      maxTokens: MAX_TOKENS.suggest,
      schema: suggestApiSchema(),
      validate: (x) => (v(x) ? null : this.errors(v.errors)),
      user: buildUserMessage('suggest', ctx, { slot, tweak, exclude }, this.d.config.timeZone),
    }));
    if (!res.data) return { ...fixture(), fake: false, fallback: true };
    return { options: res.data.options.slice(0, count), reason: res.data.reason || undefined, fake: false };
  }

  async recipe(who: Spender, ip: string, body: any): Promise<RecipeResponse> {
    const ctx = sanitizeContext(body?.context);
    const title = typeof body?.title === 'string' ? body.title.slice(0, 120) : '';
    if (!title) return { recipe: null, fake: this.isFake, fallback: true };
    // A sample-recipe title returns its fixture, in any mode.
    const sample = this.fake.fixtureFor(title);
    if (sample && (this.isFake || this.sampleIds.has(sample.id))) return { recipe: sample, fake: this.isFake };
    const gate = await this.gate(who, ip, 'recipe', this.d.config.modelRecipe, MAX_TOKENS.recipe);
    if (!('hold' in gate)) return { recipe: this.fake.recipe(title), ...gate };
    const res = await this.spend(who, 'recipe', gate.hold, () => this.real!.call<Recipe>({
      endpoint: 'recipe',
      model: this.d.config.modelRecipe,
      maxTokens: MAX_TOKENS.recipe,
      schema: this.recipeApiSchema,
      validate: (x) => this.validateRecipe(x),
      user: buildUserMessage('recipe', ctx, { title }, this.d.config.timeZone),
    }));
    if (!res.data) return { recipe: this.fake.recipe(title), fake: false, fallback: true };
    return { recipe: tidyRecipe(res.data), fake: false };
  }

  async utterance(who: Spender, ip: string, body: any): Promise<UtteranceResponse> {
    const ctx = sanitizeContext(body?.context);
    const utterance = typeof body?.utterance === 'string' ? body.utterance.slice(0, 500) : '';
    if (!utterance.trim()) return { action: { action: 'not_understood' }, fake: this.isFake };
    const gate = await this.gate(who, ip, 'utterance', this.d.config.model, MAX_TOKENS.utterance);
    if (!('hold' in gate)) return { action: this.fake.utterance(ctx, utterance), ...gate };
    const res = await this.spend(who, 'utterance', gate.hold, () => this.real!.call<Action>({
      endpoint: 'utterance',
      model: this.d.config.model,
      maxTokens: MAX_TOKENS.utterance,
      schema: actionApiSchema(),
      validate: (x) => (this.vAction(x) ? null : this.errors(this.vAction.errors)),
      user: buildUserMessage('utterance', ctx, { utterance }, this.d.config.timeZone),
    }));
    if (!res.data) return { action: { action: 'not_understood' }, fake: false, fallback: true };
    return { action: res.data, fake: false };
  }
}

/** Keep `uses` pointing at real ingredient keys; renumber steps 1..N. */
export function tidyRecipe(r: Recipe): Recipe {
  const keys = new Set(r.ingredients.map((i) => i.item));
  return {
    ...r,
    steps: r.steps.map((s, i) => ({ ...s, n: i + 1, uses: (s.uses ?? []).filter((u) => keys.has(u)) })),
  };
}
