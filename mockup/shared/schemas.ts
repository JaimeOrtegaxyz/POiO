/**
 * JSON schemas for the brain endpoints. Each one comes in two forms:
 * - the API form, sent as `output_config.format` (structured outputs reject
 *   numeric/length constraints, so those live only in the validation form);
 * - the validation form, checked with ajv before anything reaches the client.
 */

const DIFFICULTY = ['fácil', 'media', 'difícil'];

export function suggestApiSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['options', 'reason'],
    properties: {
      options: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['title', 'minutes', 'difficulty'],
          properties: {
            title: { type: 'string', description: 'dish name, Mexican Spanish, sentence case' },
            minutes: { type: 'integer', description: 'total minutes' },
            difficulty: { type: 'string', enum: DIFFICULTY },
          },
        },
      },
      reason: { type: 'string', description: 'cookbook slot only: one short seasonal reason, e.g. "Es temporada de poblano." Empty string otherwise.' },
    },
  };
}

export function suggestValidationSchema(count: number) {
  const s = suggestApiSchema() as any;
  s.properties.options.minItems = count;
  s.properties.options.items.properties.title.minLength = 2;
  s.properties.options.items.properties.title.maxLength = 60;
  s.properties.options.items.properties.minutes.minimum = 1;
  s.properties.options.items.properties.minutes.maximum = 600;
  return s;
}

const ACTIONS = ['pick', 'discard', 'tweak', 'recipe_request', 'missing', 'pantry', 'poionotas', 'answer', 'not_understood'];
const STATUS = ['plenty', 'low', 'out'];

/** One action (an item of the utterance reply). */
export function actionItemApiSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['action'],
    properties: {
      action: { type: 'string', enum: ACTIONS },
      index: { type: 'integer', description: 'pick: 1-based option number on screen' },
      title: { type: 'string', description: 'pick by name, or recipe_request: the dish asked for' },
      tweak: { type: 'string', description: 'tweak: the constraint, e.g. "más rápido", "sin horno", "sin pollo"' },
      item: { type: 'string', description: 'missing: pantry key of the missing ingredient' },
      display: { type: 'string', description: 'missing: how the ingredient reads on screen' },
      line: { type: 'string', description: 'missing: one line with 1-2 options and the trade-off' },
      options: {
        type: 'array',
        description: 'missing: 1-2 options, drop and/or swap',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['label', 'kind'],
          properties: {
            label: { type: 'string', description: 'short row label, e.g. "Quitarla", "Usar yogur"' },
            kind: { type: 'string', enum: ['drop', 'swap'] },
            swapItem: { type: 'string', description: 'swap: pantry key of the substitute' },
            swapDisplay: { type: 'string', description: 'swap: how the substitute reads on screen' },
          },
        },
      },
      changes: {
        type: 'array',
        description: 'pantry: status changes',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['item', 'status'],
          properties: {
            item: { type: 'string', description: 'pantry key' },
            status: { type: 'string', enum: STATUS },
            display: { type: 'string', description: 'Mexican Spanish name, e.g. "media crema"' },
          },
        },
      },
      add: { type: 'array', items: { type: 'string' }, description: 'poionotas: short notes to add, Mexican Spanish' },
      remove: { type: 'array', items: { type: 'string' }, description: 'poionotas: exact text of notes to remove' },
      reply: { type: 'string', description: 'one short confirmation line' },
      text: { type: 'string', description: 'answer: the short answer' },
    },
  };
}

/** The utterance reply: the actions it asks for, in the order the device applies them. */
export function actionApiSchema() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['actions'],
    properties: {
      actions: {
        type: 'array',
        description: 'what to remember first (pantry, poionotas), then at most one thing to do',
        items: actionItemApiSchema(),
      },
    },
  };
}

export const MAX_ACTIONS = 4;

function actionItemValidationSchema() {
  const s = actionItemApiSchema() as any;
  s.properties.index.minimum = 1;
  s.properties.index.maximum = 10;
  s.properties.options.maxItems = 2;
  for (const k of ['title', 'tweak', 'item', 'display', 'line', 'reply', 'text']) s.properties[k].maxLength = 400;
  s.allOf = [
    { if: { properties: { action: { const: 'pick' } } }, then: { anyOf: [{ required: ['index'] }, { required: ['title'] }] } },
    { if: { properties: { action: { const: 'tweak' } } }, then: { required: ['tweak'] } },
    { if: { properties: { action: { const: 'recipe_request' } } }, then: { required: ['title'] } },
    { if: { properties: { action: { const: 'missing' } } }, then: { required: ['item'] } },
    { if: { properties: { action: { const: 'pantry' } } }, then: { required: ['changes'] } },
    { if: { properties: { action: { const: 'poionotas' } } }, then: { anyOf: [{ required: ['add'] }, { required: ['remove'] }] } },
    { if: { properties: { action: { const: 'answer' } } }, then: { required: ['text'] } },
  ];
  return s;
}

export function actionValidationSchema() {
  const s = actionApiSchema() as any;
  s.properties.actions.minItems = 1;
  s.properties.actions.maxItems = MAX_ACTIONS;
  s.properties.actions.items = actionItemValidationSchema();
  return s;
}

/**
 * Turn the full recipe schema into the API form: structured outputs reject
 * numeric constraints, lengths and some annotations, so strip them. ajv still
 * validates the response against the original schema.
 */
export function toApiSchema(schema: unknown): unknown {
  const DROP = new Set(['$schema', '$id', 'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf', 'minLength', 'maxLength', 'pattern', 'default', 'format', 'title']);
  const walk = (node: any, key?: string): any => {
    if (Array.isArray(node)) return node.map((n) => walk(n));
    if (!node || typeof node !== 'object') return node;
    const out: any = {};
    for (const [k, v] of Object.entries(node)) {
      // `properties` maps names to schemas: never drop a property *named* like a keyword.
      if (key !== 'properties' && DROP.has(k)) continue;
      if (k === 'minItems' && typeof v === 'number' && v > 1) { out[k] = 1; continue; }
      out[k] = walk(v, k);
    }
    return out;
  };
  return walk(schema);
}
