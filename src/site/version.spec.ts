import citation from '../../CITATION.cff?raw';
import changelog from '../../CHANGELOG.md?raw';
import page from '../../index.html?raw';
import comparePage from '../../compare/index.html?raw';
import readme from '../../README.md?raw';
import { version } from '../../package.json';
import { copy } from '../widget/strings';
import { renderBlocks } from './blocks';

describe('the version', () => {
  it('is the same in package.json, CITATION.cff and the top CHANGELOG entry', () => {
    expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(citation).toMatch(new RegExp(`^version: "${version.replace(/\./g, '\\.')}"$`, 'm'));
    expect(citation).toMatch(/^date-released: "\d{4}-\d{2}-\d{2}"$/m);
    expect(changelog.match(/^## (\S+) · /m)?.[1]).toBe(version);
    // The citation the README offers names the version too.
    expect(readme).toContain(`version ${version},`);
  });

  it('is shown beside the source snapshot on the page and in the calculator', () => {
    for (const html of [page, comparePage]) {
      expect(renderBlocks(html)).toContain(`Version ${version} &middot; Source snapshot &middot; October 2026 drafts`);
    }
    expect(copy.snapshot).toBe(`Version ${version} · Source snapshot · October 2026 drafts`);
    // The changelog names the same snapshot for this version.
    expect(changelog).toMatch(new RegExp(`^## ${version.replace(/\./g, '\\.')} · October 2026 drafts$`, 'm'));
  });
});
