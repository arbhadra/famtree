/// <reference types="vitest/config" />
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

/** GitHub Pages serves 404.html for unknown paths; make it the app so deep links work. */
const spaFallback = (): Plugin => ({
  name: 'spa-fallback',
  apply: 'build',
  closeBundle() {
    copyFileSync(resolve('dist/index.html'), resolve('dist/404.html'));
  },
});

export default defineConfig({
  // e.g. VITE_BASE=/famtree/ for https://<user>.github.io/famtree/
  base: process.env.VITE_BASE || '/',
  plugins: [react(), spaFallback()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) =>
          id.includes('@supabase')
            ? 'supabase'
            : id.includes('@tiptap') || id.includes('prosemirror')
              ? 'editor'
              : undefined,
      },
    },
  },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
