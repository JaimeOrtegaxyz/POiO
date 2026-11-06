import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const apiPort = Number(process.env.PORT || 8787);

export default defineConfig({
  plugins: [
    {
      // Dev only: /demo (no slash, where invites redirect) is the device page,
      // not the SPA fallback. The Node server does the same in production.
      name: 'poio-demo-path',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/demo' || req.url?.startsWith('/demo?')) req.url = req.url.replace('/demo', '/demo/');
          next();
        });
      },
    },
  ],
  server: {
    port: 5173,
    strictPort: true,
    // /invite is server-rendered (it mints the session cookie), so it goes to the API too.
    proxy: { '/api': `http://localhost:${apiPort}`, '/invite': `http://localhost:${apiPort}` },
    // The client imports exactly two files from outside mockup/: the committed
    // pantry template (item keys) and the wordmark on the landing page.
    // Nothing else in the repo is reachable.
    fs: { allow: [here, join(here, '..', 'pantry.example.md'), join(here, '..', 'assets', 'logo-bw.svg')] },
  },
  // Two pages: the public landing (/) and the device demo (/demo/).
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: { input: { landing: join(here, 'index.html'), demo: join(here, 'demo', 'index.html') } },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'node',
  },
});
