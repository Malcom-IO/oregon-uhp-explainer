import template from '../../.github/ISSUE_TEMPLATE.md?raw';

// New issues open on GitHub's plain page with this text filled in. The note about the Board
// sits in an HTML comment: it shows while someone writes and drops out of the posted issue.
describe('the issue template', () => {
  it('tells people, inside a comment, where recommendations for the Board go', () => {
    const note = template.match(/<!--([\s\S]*?)-->/)?.[1] ?? '';
    expect(note).toContain('https://www.oregon.gov/uhpgb/Pages/public-comment.aspx');
    expect(note).toContain('the Board does not see these');
  });

  it('asks where, what, what it should be, and the source', () => {
    for (const line of ['**Where on the site:**', '**What it says now:**', '**What it should say, and why:**']) {
      expect(template).toContain(line);
    }
    expect(template).toMatch(/\*\*Source \(.*\), if you have one:\*\*/);
  });
});
