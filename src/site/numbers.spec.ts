import committed from '../../docs/numbers.md?raw';
import { KNOWN_MISPRINTS, SCENARIOS } from '../model/proposals/uhpgb-2026-10-examples';
import { MODELS } from '../model/uhp-model';
import { renderNumbers } from './numbers';

/** `npm run numbers` sets this to rewrite docs/numbers.md from the data. */
const update = (globalThis as { process?: { env: Record<string, string | undefined> } }).process?.env['UPDATE_NUMBERS'] === '1';

describe('the numbers page', () => {
  it('is what the calculator data generates (run `npm run numbers` after changing the data)', async () => {
    const generated = renderNumbers();
    if (update) {
      // Node's file module, loaded only when rewriting, so the page's code needs no Node types.
      const fs: { writeFileSync(path: string, text: string): void } = await import(/* @vite-ignore */ ['node', 'fs'].join(':'));
      fs.writeFileSync('docs/numbers.md', generated);
      return;
    }
    expect(committed).toBe(generated);
  });

  it('shows every Board example cell, and says how close the calculator comes', () => {
    const page = renderNumbers();
    const rows = SCENARIOS.reduce((sum, scenario) => sum + scenario.rows.length, 0);
    expect(page.match(/^\| [^|]* \| [^|]* \| Model \d \| [\d,]+ \| [\d,]+ \|/gm)).toHaveLength(rows * MODELS.length);
    expect(page).toMatch(new RegExp(`reproduces ${rows * MODELS.length - KNOWN_MISPRINTS.size} of those cells, each within \\$[0-4]\\.`));
    expect(page).toContain('3,699 | 3,669 | -30 (likely misprint, see below)');
  });
});
