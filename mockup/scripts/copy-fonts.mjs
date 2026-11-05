// One-off helper: copy the self-hosted woff2 fonts (SIL OFL 1.1) from the archived
// Stage 2 app into mockup/public/fonts/. The archive itself is never modified.
import { copyFileSync, readdirSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', '..', 'archive/stage2/web/fonts');
const dst = join(here, '..', 'public/fonts');
mkdirSync(dst, { recursive: true });
for (const f of readdirSync(src)) {
  if (f.endsWith('.woff2') || f === 'fonts.css') copyFileSync(join(src, f), join(dst, f));
}
console.log(readdirSync(dst).join('\n'));
