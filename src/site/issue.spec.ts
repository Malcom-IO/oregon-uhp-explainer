import form from '../../.github/ISSUE_TEMPLATE/issue.yml?raw';
import config from '../../.github/ISSUE_TEMPLATE/config.yml?raw';
import page from '../../index.html?raw';
import readme from '../../README.md?raw';
import numbers from '../../docs/numbers.md?raw';
import review from '../../docs/review.md?raw';
import { NEW_ISSUE_URL } from './issue';

const ISSUES_LINK = /https:\/\/github\.com\/Malcom-IO\/oregon-uhp-explainer\/issues[^"\s)]*/g;

describe('opening an issue', () => {
  it('shows the note that the Board does not see issues, with its public comment link', () => {
    expect(form).toContain('the Board\n        does not see these issues');
    expect(form).toContain('https://www.oregon.gov/uhpgb/Pages/public-comment.aspx');
    expect(config).toMatch(/^blank_issues_enabled: false$/m);
  });

  it('links to that form', () => {
    expect(NEW_ISSUE_URL.endsWith('?template=issue.yml')).toBe(true);
  });

  it.each([
    ['index.html', page],
    ['README.md', readme],
    ['docs/numbers.md', numbers],
    ['docs/review.md', review],
  ])('is the only issues address in %s', (_, text) => {
    const links = text.match(ISSUES_LINK) ?? [];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toBe(NEW_ISSUE_URL);
  });
});
