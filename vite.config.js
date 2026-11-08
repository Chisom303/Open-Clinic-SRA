import { defineConfig } from 'vite';

export default defineConfig({
  // Relative paths so the built site works on GitHub Pages under any repo name.
  base: './',
  build: { outDir: 'dist' },
});
