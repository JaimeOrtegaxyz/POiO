// Build step: copy exactly the allowlisted brain files (server/allowlist.json)
// from the repo root into dist/brain/, so a deploy carries the base brain and
// nothing else from the repo. Personal files are never on the list.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const mockup = join(here, '..');
const repo = join(mockup, '..');
const list = JSON.parse(readFileSync(join(mockup, 'server/allowlist.json'), 'utf8'));
const out = join(mockup, 'dist/brain');
for (const rel of [...list.prompt, ...list.fixtures]) {
  mkdirSync(dirname(join(out, rel)), { recursive: true });
  copyFileSync(join(repo, rel), join(out, rel));
  console.log('brain:', rel);
}
