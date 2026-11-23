// @vitest-environment happy-dom
import page from '../../compare/index.html?raw';
import docs from '../../docs/compare.md?raw';
import { MODELS, bill } from '../model/uhp-model';
import { renderBlocks } from '../site/blocks';
import { CHECKS, band } from './checks';
import { DISTRIBUTIONS } from './distribution';
import { LRO_2032 } from './lro';
import { start } from './main';
import { GROUPS, GROUP_OF, NONFILERS, POPULATION } from './population';

describe('the 2022 population', () => {
  const { weight, size, nonfiler } = POPULATION;
  it("holds every Oregon return in the IRS table, and the Board's residents on no return", () => {
    let returns = 0, people = 0;
    weight.forEach((w, i) => { if (!nonfiler[i]) { returns += w; people += w * size[i]; } });
    expect(returns).toBeCloseTo(2_030_990, -1); // N1, AGI_STUB 1–10
    // N2 is 3,622,290. A few low brackets count fewer people than one per single return and
    // two per joint return; the population cannot go below that, so it holds a little more.
    expect(people / 3_622_290 - 1).toBeGreaterThanOrEqual(0);
    expect(people / 3_622_290 - 1).toBeLessThan(0.01);
    expect(weight.reduce((a, b, i) => a + (nonfiler[i] ? b : 0), 0)).toBe(NONFILERS);
    expect([...size].every((s) => s >= 1 && s <= 5)).toBe(true);
  });

  it('splits people, not returns, into the groups, residents on no return in the lowest', () => {
    const people = GROUPS.map(() => 0);
    weight.forEach((w, i) => { people[GROUP_OF[i]] += w * size[i]; });
    const total = people.reduce((a, b) => a + b, 0);
    // Each fifth holds a fifth of the people, give or take one point's lumpiness at the edges.
    [0, 1, 2, 3].forEach((k) => expect(people[k] / total, GROUPS[k].label).toBeCloseTo(0.2, 1));
    expect(GROUP_OF[nonfiler.indexOf(1)]).toBe(0);
  });
});

describe("who pays, against the Board's published 2022 figures", () => {
  for (const c of CHECKS) {
    it(`${c.label}: every model within ${band(c)}`, () => {
      for (const d of DISTRIBUTIONS) {
        const diff = c.diff(d);
        expect(diff, `Model ${d.model.id}`).toBeGreaterThanOrEqual(c.lo);
        expect(diff, `Model ${d.model.id}`).toBeLessThanOrEqual(c.hi);
      }
    });
  }

  it('lists the same bands in docs/compare.md', () => {
    for (const c of CHECKS) expect(docs, c.label).toContain(`| ${c.label} | ${c.source} | ${band(c)} |`);
  });
});

describe("the LRO's 2032 projections", () => {
  it('are the figures printed on page 10 of the October 22 brief', () => {
    // Households, employers, CIT/CET + CAT + lodging, and the printed total, Models 1–5.
    expect(Object.values(LRO_2032).map((p) => [p.hhcc, p.ept, Number(p.business.toFixed(2)), p.total])).toEqual([
      [15.3, 15.5, 1.55, 32.35],
      [14.0, 19.2, 1.54, 34.74],
      [14.1, 19.2, 1.54, 34.84],
      [14.1, 19.2, 1.54, 34.84],
      [14.1, 19.2, 1.54, 34.84],
    ]);
    for (const p of Object.values(LRO_2032)) expect(p.hhcc + p.ept + p.business).toBeCloseTo(p.total, 2);
  });
});

describe('the comparison page', () => {
  const built = renderBlocks(page);
  const body = built.slice(built.indexOf('<body>') + 6, built.indexOf('</body>')).replace(/<script[^>]*><\/script>/g, '');
  const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');
  const example = MODELS.map((m) => usd(bill(m, 85_000, 2, 'private', 8_500_000).household));
  const yours = () => MODELS.map((m) => document.querySelector(`[data-cmp-you="${m.id}"]`)!.textContent);
  const type = (text: string) => {
    const input = document.querySelector<HTMLInputElement>('input[name="income"]')!;
    input.value = text;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input;
  };

  describe('without scripts', () => {
    beforeEach(() => { document.body.innerHTML = body; });

    it("shows every figure for the Board's example household, and hides the parts that need scripts", () => {
      expect(yours()).toEqual(example);
      expect(document.querySelectorAll('.xp-cmp-model')).toHaveLength(5);
      expect(document.querySelector('[data-cmp-who] caption')!.textContent).toContain('Model 2');
      expect(document.querySelector<HTMLFormElement>('[data-cmp-form]')!.hidden).toBe(true);
      expect(document.querySelector<HTMLElement>('[data-cmp-picker]')!.hidden).toBe(true);
      expect(document.querySelector('[data-cmp-static]')!.textContent).toContain('$85,000');
    });
  });

  describe('with scripts', () => {
    beforeEach(() => { document.body.innerHTML = body; start(document); });

    it('shows the form and the same yearly bill as the calculator', () => {
      expect(document.querySelector<HTMLFormElement>('[data-cmp-form]')!.hidden).toBe(false);
      expect(document.querySelector('[data-cmp-static]')!.hasAttribute('hidden')).toBe(true);
      expect(yours()).toEqual(example);
    });

    it('reads "$150,000", and refuses "150.000" with a message described only while it shows', () => {
      let input = type('$150,000');
      expect(yours()[1]).toBe(usd(bill(MODELS[1], 150_000, 2, 'private', 8_500_000).household));
      expect(input.hasAttribute('aria-describedby')).toBe(false);
      input = type('150.000');
      expect(document.querySelector<HTMLElement>('[data-cmp-error]')!.hidden).toBe(false);
      expect(input.getAttribute('aria-describedby')).toBe('cmp-income-error');
      expect(yours()[1]).toBe('—');
      // No household, so no "you" in the chart or table.
      expect(document.querySelector('[data-cmp-who] .xp-cmp-me, [data-cmp-who] .xp-cmp-row-me')).toBeNull();
    });

    it('keeps its live region visually hidden with the site’s own class', () => {
      const live = document.querySelector('[role="status"]')!;
      expect(live.className).toBe('xp-vh');
    });

    it('names each "who pays" link for its model, and following one shows that model and focuses the chart heading', () => {
      const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-cmp-show]')];
      expect(new Set(links.map((a) => a.textContent)).size).toBe(5);
      links[3].click();
      expect(document.querySelector('[data-cmp-who] caption')!.textContent).toContain('Model 4');
      expect(document.querySelectorAll('[data-cmp-who] tbody tr')).toHaveLength(10);
      expect(document.activeElement?.id).toBe('who-pays-title');
    });
  });
});
