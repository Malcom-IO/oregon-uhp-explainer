import page from '../../index.html?raw';
import readme from '../../README.md?raw';
import numbers from '../../docs/numbers.md?raw';
import review from '../../docs/review.md?raw';
import { ISSUE_BODY, NEW_ISSUE_URL } from './issue';

// Every link to the project's issues opens the pre-filled new-issue page, so the note about
// the Board is in front of whoever writes one.
const ISSUES_LINK = /https:\/\/github\.com\/Malcom-IO\/oregon-uhp-explainer\/issues[^"\s)]*/g;

describe('the "open an issue" link', () => {
  it('tells people, inside a comment, where recommendations for the Board go', () => {
    const note = ISSUE_BODY.match(/^<!--([\s\S]*?)-->/)?.[1] ?? '';
    expect(note).toContain('https://www.oregon.gov/uhpgb/Pages/public-comment.aspx');
    expect(note).toContain('the Board does not see these');
    for (const line of ['**Where on the site:**', '**What it says now:**', '**What it should say, and why:**']) {
      expect(ISSUE_BODY).toContain(line);
    }
  });

  it("carries the whole text, encoded, and stays well under GitHub's address limit", () => {
    expect(decodeURIComponent(NEW_ISSUE_URL.split('?body=')[1])).toBe(ISSUE_BODY);
    expect(NEW_ISSUE_URL.length).toBeLessThan(4000);
  });

  it.each([
    ['index.html', page.replaceAll('&amp;', '&')],
    ['README.md', readme],
    ['docs/numbers.md', numbers],
    ['docs/review.md', review],
  ])('is the only issues address in %s', (_, text) => {
    const links = text.match(ISSUES_LINK) ?? [];
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(link).toBe(NEW_ISSUE_URL);
  });
});
