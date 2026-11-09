/**
 * The real brain: one Messages API call per request. Cached static prefix
 * (cache_control on the last system block, kept for an hour: calls on one
 * device are minutes apart, so the 5-minute cache never got a hit),
 * JSON-schema structured output, low effort with thinking off (the prompt
 * does the steering; see prompts/adapter.md), ajv validation, one retry.
 */
import type { TokenUsage } from '../pricing';

/** The slice of the Anthropic client this uses (so tests can pass a fake). */
export interface MessagesClient {
  messages: { create(params: any): Promise<any> };
}

export interface CallSpec {
  endpoint: 'suggest' | 'recipe' | 'utterance';
  model: string;
  maxTokens: number;
  schema: unknown;
  /** Returns null when valid, else a short error description. */
  validate: (data: unknown) => string | null;
  user: string;
}

export interface CallResult<T> {
  data: T | null;
  usages: { model: string; usage: TokenUsage }[];
  error?: string;
}

export class RealBrain {
  constructor(private client: MessagesClient, private prefix: string) {}

  private params(spec: CallSpec, user: string) {
    return {
      model: spec.model,
      max_tokens: spec.maxTokens,
      system: [{ type: 'text', text: this.prefix, cache_control: { type: 'ephemeral', ttl: '1h' } }],
      messages: [{ role: 'user', content: user }],
      thinking: { type: 'disabled' },
      output_config: { effort: 'low', format: { type: 'json_schema', schema: spec.schema } },
    };
  }

  async call<T>(spec: CallSpec): Promise<CallResult<T>> {
    const usages: CallResult<T>['usages'] = [];
    let user = spec.user;
    let lastError = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      let res: any;
      try {
        res = await this.client.messages.create(this.params(spec, user));
      } catch (e) {
        lastError = `api: ${(e as Error).message?.slice(0, 200) ?? 'error'}`;
        break; // network / API errors: no retry, fall back.
      }
      const u = res?.usage ?? {};
      usages.push({
        model: spec.model,
        usage: {
          input_tokens: u.input_tokens ?? 0,
          cache_creation_input_tokens: u.cache_creation_input_tokens ?? 0,
          cache_read_input_tokens: u.cache_read_input_tokens ?? 0,
          output_tokens: u.output_tokens ?? 0,
        },
      });
      const text = (res?.content ?? []).filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('');
      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        lastError = res?.stop_reason === 'max_tokens' ? 'cut off at max_tokens' : 'not JSON';
        user = `${spec.user}\n\nYour previous reply was invalid (${lastError}). Reply again with only the JSON object, shorter.`;
        continue;
      }
      const err = spec.validate(data);
      if (!err) return { data: data as T, usages };
      lastError = err;
      user = `${spec.user}\n\nYour previous reply failed validation: ${err.slice(0, 300)}. Reply again with only a valid JSON object.`;
    }
    return { data: null, usages, error: lastError };
  }
}
