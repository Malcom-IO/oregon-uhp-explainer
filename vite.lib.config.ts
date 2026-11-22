import { defineConfig } from 'vite';
import { banner } from './vite.config.ts';

// The calculator as a module a host page can import: dist/lib/oregon-uhp.js
// exports `mount`, and dist/lib/oregon-uhp.css holds its styles. Runs after
// the page build and adds to dist/ without emptying the rest of it.
export default defineConfig({
  build: {
    outDir: 'dist/lib',
    emptyOutDir: true,
    lib: {
      entry: 'src/widget/index.ts',
      formats: ['es'],
      fileName: 'oregon-uhp',
      cssFileName: 'oregon-uhp',
    },
    rollupOptions: { output: { banner } },
  },
});
