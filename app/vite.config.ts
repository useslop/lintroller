import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  // No modulepreload polyfill: it calls fetch() for preloads on old browsers, which connect-src 'none' would block.
  build: { target: 'es2022', sourcemap: false, modulePreload: { polyfill: false } },
  test: { environment: 'jsdom', include: ['test/**/*.test.{ts,tsx}'] },
});
