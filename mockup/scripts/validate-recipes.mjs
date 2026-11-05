// Validate reference/recipes/*.json (and the mockup's fake-brain fixtures) against
// reference/recipe.schema.json. Hand-run: `node scripts/validate-recipes.mjs`.
// The test suite runs the same check (test/schema.test.ts).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020 from 'ajv/dist/2020.js';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..');
const schema = JSON.parse(readFileSync(join(repo, 'reference/recipe.schema.json'), 'utf8'));
const ajv = new Ajv2020({ allErrors: true, strict: false });
const validate = ajv.compile(schema);

const dirs = [join(repo, 'reference/recipes'), join(here, '..', 'server/fixtures/recipes')];
let bad = 0;
for (const dir of dirs) {
  if (!existsSync(dir)) continue;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.json'))) {
    const data = JSON.parse(readFileSync(join(dir, f), 'utf8'));
    if (validate(data)) console.log('valid  ', f);
    else { bad++; console.log('INVALID', f, JSON.stringify(validate.errors, null, 1)); }
  }
}
process.exit(bad ? 1 : 0);
