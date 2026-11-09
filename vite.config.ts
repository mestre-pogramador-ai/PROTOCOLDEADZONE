import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  test: {
    // Rapier 0.17 declares type:module but its Node "main" is CommonJS .js.
    // Resolve its bundled ESM entry for tests, as Vite does for the browser.
    alias: {
      '@dimforge/rapier3d-compat': fileURLToPath(
        new URL('./node_modules/@dimforge/rapier3d-compat/rapier.es.js', import.meta.url),
      ),
    },
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
  },
});
