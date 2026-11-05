import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import { describe, expect, it } from 'vitest';
import { toApiSchema } from '../shared/schemas';
import { REPO_DIR, MOCKUP_DIR } from '../server/config';

const schema = JSON.parse(readFileSync(join(REPO_DIR, 'reference/recipe.schema.json'), 'utf8'));
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

function recipesIn(dir: string) {
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => ({ f, r: JSON.parse(readFileSync(join(dir, f), 'utf8')) }));
}

describe('recipe schema', () => {
  it('has checkpoint {afterSec, message} and no timerSec', () => {
    const step = schema.properties.steps.items.properties;
    expect(step.timerSec).toBeUndefined();
    expect(step.checkpoint.required).toEqual(['afterSec', 'message']);
    expect(step.checkpoint.properties.afterSec.minimum).toBe(1);
    expect(JSON.stringify(schema)).not.toContain('timerSec');
  });

  it('the three sample recipes validate', () => {
    const list = recipesIn(join(REPO_DIR, 'reference/recipes'));
    expect(list).toHaveLength(3);
    for (const { f, r } of list) expect(validate(r), `${f}: ${JSON.stringify(validate.errors)}`).toBe(true);
  });

  it('the fake-brain fixtures validate', () => {
    for (const { f, r } of recipesIn(join(MOCKUP_DIR, 'server/fixtures/recipes'))) {
      expect(validate(r), `${f}: ${JSON.stringify(validate.errors)}`).toBe(true);
    }
  });

  it('tinga step 2 checkpoint matches the brief', () => {
    const tinga = JSON.parse(readFileSync(join(REPO_DIR, 'reference/recipes/tinga-de-pollo.json'), 'utf8'));
    expect(tinga.steps[1].checkpoint).toEqual({ afterSec: 300, message: 'Debe estar suave y apenas dorada.' });
  });

  it('the API form drops keywords structured outputs reject, keeps the shape', () => {
    const api = JSON.stringify(toApiSchema(schema));
    for (const k of ['"minimum"', '"pattern"', '"$schema"', '"$id"', '"default"']) expect(api).not.toContain(k);
    expect(api).toContain('"checkpoint"');
    expect(api).toContain('"additionalProperties":false');
  });
});
