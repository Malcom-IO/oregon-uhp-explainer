import config from '../../.github/ISSUE_TEMPLATE/config.yml?raw';
import form from '../../.github/ISSUE_TEMPLATE/correction.yml?raw';
import page from '../../index.html?raw';

// The correction form lists the explainer's sections. This keeps that list in step with the
// page: rename, add or remove a section and this test names the option to change.

const BOARD_COMMENT = 'https://www.oregon.gov/uhpgb/Pages/public-comment.aspx';

function sectionTitles(html: string): string[] {
  return [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map(([, inner]) =>
    inner.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
  );
}

function explainerOptions(yaml: string): string[] {
  return [...yaml.matchAll(/^\s+- "Explainer: (.*)"$/gm)].map(([, title]) => title);
}

describe('the correction form', () => {
  it('lists every section of the explainer, in page order, and nothing else', () => {
    const titles = sectionTitles(page);
    expect(titles.length).toBeGreaterThan(5);
    expect(explainerOptions(form)).toEqual(titles);
  });

  it('lets someone who cannot find the section say so', () => {
    expect(form).toContain("I'm not sure, or I can't find it in this list");
  });

  it('points recommendations to the Board, not to this project', () => {
    expect(form).toContain(BOARD_COMMENT);
    expect(config).toContain(BOARD_COMMENT);
    expect(config).toMatch(/^blank_issues_enabled: false$/m);
  });
});
