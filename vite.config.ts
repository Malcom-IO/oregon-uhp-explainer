import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig, runnerImport } from 'vite';

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
    name: 'explainer-blocks',
    // The explainer's tables and charts are built from the model and written
    // into index.html where its "uhp:" marker comments stand, in the dev
    // server and in the build, so the page holds them without any script.
    // The renderers are loaded through Vite on each call, so the dev server
    // picks up an edit to them or to the model on the next page load.
    transformIndexHtml: {
      order: 'pre',
      async handler(html) {
        const { module } = await runnerImport<typeof import('./src/site/blocks')>(page('./src/site/blocks.ts'));
        return module.renderBlocks(html);
      },
    },
  }, {
    name: 'ship-license',
    // The license travels with the built site as dist/LICENSE.txt.
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'LICENSE.txt', source: `${license}\n` });
    },
  }],
});
