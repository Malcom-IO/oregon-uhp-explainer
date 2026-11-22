import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/*.spec.ts'],
    // A spec that reads a stylesheet as text (import css from './x.css?raw')
    // gets the text; every other stylesheet import stays empty, as by default.
    css: { include: /\.css\?raw$/ },
  },
});
