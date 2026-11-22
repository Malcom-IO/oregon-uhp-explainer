import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const license = readFileSync(new URL('./LICENSE', import.meta.url), 'utf8').trim();
const page = (path: string) => fileURLToPath(new URL(path, import.meta.url));

/** The license as a comment that survives minifying, for a script a host copies on its own. */
export const banner =
  `/*!\n * Oregon Universal Health Plan calculator\n *\n${license.split('\n').map(line => ` * ${line}`.trimEnd()).join('\n')}\n */`;

// The site: the explainer at the root, the calculator alone at calculator/,
// and the embedding demo (a static page in public/demo/). Set BASE_PATH to
// host it under a subpath, for example BASE_PATH=/oregon-uhp-explainer/ for a
// GitHub Pages project site.
export default defineConfig({
  base: process.env['BASE_PATH'] ?? '/',
  build: {
    rollupOptions: {
      input: { index: page('./index.html'), calculator: page('./calculator/index.html') },
    },
  },
  plugins: [{
    name: 'ship-license',
    // The license travels with the built site as dist/LICENSE.txt.
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'LICENSE.txt', source: `${license}\n` });
    },
  }],
});
