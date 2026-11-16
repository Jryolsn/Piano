import { svelte } from '@sveltejs/vite-plugin-svelte';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // GitHub Pages serves the repo under /piano/.
  base: process.env.BASE_PATH ?? '/',
  plugins: [svelte()],
  build: {
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        mic: resolve(import.meta.dirname, 'spikes/mic/index.html'),
      },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
  },
});
