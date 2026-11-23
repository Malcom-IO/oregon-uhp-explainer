// @vitest-environment happy-dom
import page from '../../compare/index.html?raw';
import { MODELS, bill } from '../model/uhp-model';
import { APPENDIX_2022, DISTRIBUTIONS } from './distribution';
import { LRO_2032 } from './lro';
import { start } from './main';
import { GROUPS, POPULATION } from './population';

describe('the 2022 population', () => {
  it('holds every Oregon return in the IRS table', () => {
    const returns = POPULATION.weight.reduce((a, b) => a + b, 0);
    expect(returns).toBeCloseTo(2_030_990, -1); // the IRS table's returns, all brackets
    expect([...POPULATION.size].every((s) => s >= 1 && s <= 5 && Number.isInteger(s))).toBe(true);
    expect(GROUPS.map((g) => g.to).at(-1)).toBe(1);
  });
});

describe("who pays, against the Board's published 2022 figures", () => {
  // These tolerances are the gaps we know of, stated on the page; a change to the
  // rules or the population that moves a figure past them fails here.
  for (const d of DISTRIBUTIONS) {
    const id = Number(d.model.id), pub = d.model.published!;
    it(`Model ${id}`, () => {
      // Statewide household contributions: Appendix FR, PDF pages 31–35.
      expect(Math.abs(d.hhccTotal / 1e6 / APPENDIX_2022[id].hhcc - 1)).toBeLessThan(0.05);
      // Combined rate by fifth: Figure AFR4Fi. The lowest fifth comes out lower.
      d.byFifth.slice(1).forEach((v, f) => expect(Math.abs(v - pub.combinedByFifth[f + 1]), `fifth ${f + 2}`).toBeLessThan(0.01));
      expect(pub.combinedByFifth[0] - d.byFifth[0]).toBeGreaterThan(0);
      expect(pub.combinedByFifth[0] - d.byFifth[0]).toBeLessThan(0.017);
      // Brief p. 9: the top 1%'s share and the middle fifth's rate.
      expect(Math.abs(d.top1Share - pub.top1Share)).toBeLessThan(0.015);
      expect(Math.abs(d.middleFifthHhcc - pub.middleFifthRate)).toBeLessThan(0.005);
      // The known gap: fewer returns owe nothing than in the Board's return file.
      const gap = pub.returnsOwingNothing - d.owesNothing;
      expect(gap).toBeGreaterThan(0.05);
      expect(gap).toBeLessThan(0.12);
    });
  }
});

describe("the LRO's 2032 projections", () => {
  it('add up to the totals the brief prints', () => {
    for (const m of MODELS) {
      const p = LRO_2032[Number(m.id)];
      expect(p.hhcc + p.ept + p.business, `Model ${m.id}`).toBeCloseTo(p.total, 2);
    }
  });
});

describe('the comparison page', () => {
  const body = page.slice(page.indexOf('<body>') + 6, page.indexOf('</body>')).replace(/<script[^>]*><\/script>/g, '');
  beforeEach(() => { document.body.innerHTML = body; start(document); });
  const yours = () => MODELS.map((m) => document.querySelector(`[data-cmp-you="${m.id}"]`)!.textContent);
  const usd = (v: number) => '$' + Math.round(v).toLocaleString('en-US');

  it('shows the same yearly bill as the calculator for the Board example household', () => {
    expect(yours()).toEqual(MODELS.map((m) => usd(bill(m, 85_000, 2, 'private', 8_500_000).household)));
  });

  it('reads "85,000" and refuses what is not an amount', () => {
    const input = document.querySelector<HTMLInputElement>('input[name="income"]')!;
    input.value = '$150,000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(yours()[1]).toBe(usd(bill(MODELS[1], 150_000, 2, 'private', 8_500_000).household));
    input.value = '150.000';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    expect(document.querySelector<HTMLElement>('[data-cmp-error]')!.hidden).toBe(false);
    expect(yours()[1]).toBe('—');
  });

  it('draws a who-pays chart and table for the chosen model', () => {
    expect(document.querySelectorAll('.xp-cmp-model')).toHaveLength(5);
    document.querySelector<HTMLButtonElement>('[data-cmp-show="4"]')!.click();
    expect(document.querySelector('caption')!.textContent).toContain('Model 4');
    expect(document.querySelectorAll('[data-cmp-table] tbody tr')).toHaveLength(10);
  });
});
