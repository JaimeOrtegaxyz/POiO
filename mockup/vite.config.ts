import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const apiPort = Number(process.env.PORT || 8787);

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': `http://localhost:${apiPort}` },
    // The client imports exactly two files from outside mockup/: the committed
    // pantry template (item keys) and the wordmark on the device face.
    // Nothing else in the repo is reachable.
    fs: { allow: [here, join(here, '..', 'pantry.example.md'), join(here, '..', 'assets', 'logo-bw.svg')] },
  },
  build: { outDir: 'dist', emptyOutDir: true },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
