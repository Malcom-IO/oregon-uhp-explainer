import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

const license = readFileSync(new URL('./LICENSE', import.meta.url), 'utf8').trim();

/** The license as a comment that survives minifying, for a script a host copies on its own. */
export const banner =
  `/*!\n * Oregon Universal Health Plan calculator\n *\n${license.split('\n').map(line => ` * ${line}`.trimEnd()).join('\n')}\n */`;

// The calculator page. Set BASE_PATH to host it under a subpath, for example
// BASE_PATH=/oregon-uhp-explainer/ for a GitHub Pages project site.
export default defineConfig({
  base: process.env['BASE_PATH'] ?? '/',
  plugins: [{
    name: 'ship-license',
    // The license travels with the built page as dist/LICENSE.txt.
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'LICENSE.txt', source: `${license}\n` });
    },
  }],
});
